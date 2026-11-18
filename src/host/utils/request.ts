/**
 * 通用 HTTP 请求封装（宿主侧，Node 环境）。
 *
 * 相当于前端项目里的 request.ts / axios 实例。只关心「怎么发请求、怎么读
 * 响应头」，不关心业务，也不关心 dsh 的 Envelope。
 *
 * @module @dylanzbot/dsh-netease-music/host/utils/request
 */

import {
  CONTENT_TYPE_FORM_URLENCODED,
  HEADER_CONTENT_TYPE,
  HEADER_COOKIE,
  HEADER_USER_AGENT,
  HTTP_METHOD_GET,
  HTTP_METHOD_POST,
} from '../../constants/http.js'
import { parseJsonOrRaw } from '../../utils/json.js'
import { readSetCookies } from './cookie.js'

/**
 * 固定 Chrome UA。
 *
 * 固定 Chrome UA，使请求稳定、可复现；动态随机 UA 反而可能因版本拼装不一致被上游拒绝。
 */
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/** 上游请求默认超时（毫秒）。 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000

/**
 * 给请求叠加统一超时：调用方没传 signal 时直接用超时信号；
 * 传了 signal 时用 `AbortSignal.any` 合并，调用方主动取消仍然优先生效。
 */
export function withTimeout(signal?: AbortSignal, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  return signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal])
}

/** 一次请求的返回：已解析的 JSON body + 响应里的 Set-Cookie。 */
export interface RequestResult {
  readonly body: unknown
  readonly setCookies: string[]
}

/** 请求可选参数。 */
export interface RequestOptions {
  /** 请求携带的 Cookie（整串 `k=v; k2=v2`）。 */
  readonly cookie?: string
  /** 取消信号。 */
  readonly signal?: AbortSignal
  /** 额外的请求头（可覆盖默认值）。 */
  readonly headers?: Record<string, string>
}

/** postForm 的可选参数（保留旧名字，避免调用方改动）。 */
export type PostFormOptions = RequestOptions

/** 统一发送请求并读出 JSON body + Set-Cookie。 */
async function send(url: string, init: RequestInit, cookie?: string): Promise<RequestResult> {
  const response = await fetch(url, {
    ...init,
    // 统一超时；调用方 signal 存在时一并合并，避免上游挂起拖住路由 handler。
    signal: withTimeout(init.signal as AbortSignal | undefined),
    headers: {
      [HEADER_USER_AGENT]: DEFAULT_USER_AGENT,
      ...(cookie !== undefined && cookie !== '' ? { [HEADER_COOKIE]: cookie } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  const text = await response.text()
  return { body: parseJsonOrRaw(text), setCookies: readSetCookies(response.headers) }
}

/** 请求工具对象：用 `request.postForm(...)` / `request.getJson(...)` 这种形式调用。 */
export const request = {
  /** POST application/x-www-form-urlencoded，返回 JSON body 和 Set-Cookie。 */
  async postForm(
    url: string,
    params: Record<string, string>,
    options: PostFormOptions = {},
  ): Promise<RequestResult> {
    return send(
      url,
      {
        method: HTTP_METHOD_POST,
        headers: { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_FORM_URLENCODED, ...options.headers },
        body: new URLSearchParams(params).toString(),
        signal: options.signal,
      },
      options.cookie,
    )
  },

  /** GET，返回 JSON body 和 Set-Cookie。 */
  async getJson(url: string, options: RequestOptions = {}): Promise<RequestResult> {
    return send(
      url,
      { method: HTTP_METHOD_GET, headers: options.headers, signal: options.signal },
      options.cookie,
    )
  },
}
