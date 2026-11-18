/**
 * 路由层共享工具。
 *
 * 各路由文件反复出现的样板（错误翻译、参数校验、try/catch + warn + 4xx/5xx 兜底）
 * 统一收敛在这里，让每条路由只写「读参数 → 调 service → 包 Envelope」。
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/shared
 */

import type { Logger, RouteDefinition } from '../../types/cordis.js'
import {
  ERROR_CODE_BAD_REQUEST,
  ERROR_CODE_NOT_LOGGED_IN,
  ERROR_CODE_UPSTREAM,
} from '../../constants/error-code.js'
import {
  HTTP_METHOD_GET,
  HTTP_METHOD_POST,
  HTTP_STATUS_BAD_GATEWAY,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_UNAUTHORIZED,
  ROUTE_REQUEST_BODY_BUFFERED,
} from '../../constants/http.js'
import { PLUGIN_ID } from '../../constants/plugin.js'
import { InvalidCookieError, NotLoggedInError } from '../error/index.js'
import { NcmApiError } from '../error/api-error.js'
import { fail } from '../utils/response.js'

/** 一条可注册的宿主路由。 */
export interface HostRoute {
  readonly def: RouteDefinition
}

/** 把领域异常翻译成 Envelope：未登录 401、Cookie 无效 400、其余 502。 */
export function toFailure(error: unknown): Response {
  if (error instanceof NotLoggedInError) {
    return fail(ERROR_CODE_NOT_LOGGED_IN, error.message, HTTP_STATUS_UNAUTHORIZED)
  }
  if (error instanceof InvalidCookieError) {
    return fail(ERROR_CODE_BAD_REQUEST, error.message, HTTP_STATUS_BAD_REQUEST)
  }
  // 上游业务错误文案是固定短语，可透传；未知异常只给通用文案，
  // 细节由 run() 写进 logger，不回传客户端（M4）。
  if (error instanceof NcmApiError) {
    return fail(ERROR_CODE_UPSTREAM, error.message, HTTP_STATUS_BAD_GATEWAY)
  }
  return fail(ERROR_CODE_UPSTREAM, '上游服务暂时不可用，请稍后重试', HTTP_STATUS_BAD_GATEWAY)
}

/** 400 参数缺失 / 非法（路由层最常用的失败返回）。 */
export function badRequest(message: string): Response {
  return fail(ERROR_CODE_BAD_REQUEST, message, HTTP_STATUS_BAD_REQUEST)
}

/**
 * 执行一次「调 service + 包 Envelope」，统一处理异常。
 *
 * - 未登录 / Cookie 无效：静默转 401 / 400（不打 warn，避免登录态探测刷屏）；
 * - 其它异常：打一条带标签的 warn 再转 502。
 *
 * @param logger dsh logger
 * @param label  路由标签（用于日志，如 `song-url`）
 * @param run    正常路径：读参 / 调 service 后返回 ok(...) 或 badRequest(...)
 */
export function run(logger: Logger, label: string, runFn: () => Promise<Response>): Promise<Response> {
  return (async () => {
    try {
      return await runFn()
    } catch (error) {
      if (!(error instanceof NotLoggedInError) && !(error instanceof InvalidCookieError)) {
        logger.warn(`${PLUGIN_ID}/${label}: ${String(error)}`)
      }
      return toFailure(error)
    }
  })()
}

/** 组装一条路由定义（统一 `requestBody: 'buffered'`）。 */
export function route(
  path: string,
  methods: readonly string[],
  fetchFn: RouteDefinition['fetch'],
): HostRoute {
  return {
    def: {
      path,
      methods,
      requestBody: ROUTE_REQUEST_BODY_BUFFERED,
      fetch: fetchFn,
    },
  }
}

/** GET 路由。 */
export function getRoute(path: string, fetchFn: RouteDefinition['fetch']): HostRoute {
  return route(path, [HTTP_METHOD_GET], fetchFn)
}

/** POST 路由。 */
export function postRoute(path: string, fetchFn: RouteDefinition['fetch']): HostRoute {
  return route(path, [HTTP_METHOD_POST], fetchFn)
}

/** 读取整数查询参数（缺失 / 非法返回 fallback）。 */
export function intParam(url: URL, name: string, fallback: number): number {
  const raw = url.searchParams.get(name)
  if (raw === null || raw.trim() === '') return fallback
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? value : fallback
}

/** 从 query 读「必填的 keywords」。为空返回 `badRequest` 响应，否则返回 null。 */
export function requireKeyword(request: Request): Response | null {
  const keywords = new URL(request.url).searchParams.get('keywords')?.trim() ?? ''
  return keywords === '' ? badRequest('缺少 keywords 参数') : null
}

/** 从 query 读「必填的正整数 id」。非法返回 `badRequest` 响应，否则返回 null。 */
export function requirePositiveId(request: Request): Response | null {
  const id = intParam(new URL(request.url), 'id', 0)
  return id <= 0 ? badRequest('缺少 id 参数') : null
}

/** 从 JSON 请求体里安全取字符串字段（非字符串返回 ''）。 */
export async function bodyString(request: Request, key: string): Promise<string> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  return typeof body[key] === 'string' ? body[key] : ''
}

/** 从 JSON 请求体里安全取数字字段（非法返回 0）。 */
export async function bodyNumber(request: Request, key: string): Promise<number> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const value = Number(body[key])
  return Number.isFinite(value) ? value : 0
}
