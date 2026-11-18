/* 浏览器侧请求工具 */

import {
  ERROR_CODE_BAD_RESPONSE,
  ERROR_CODE_NETWORK,
  ERROR_CODE_UNKNOWN,
} from '../../constants/error-code.js'
import {
  CONTENT_TYPE_JSON,
  HEADER_CONTENT_TYPE,
  HTTP_METHOD_POST,
} from '../../constants/http.js'
import { logWarn } from './logger.js'

/** 认证接口的错误：code 来自宿主 Envelope。 */
export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

interface Envelope<T> {
  readonly ok: boolean
  readonly value?: T
  readonly error?: { readonly code: string; readonly message: string }
}

/** 请求一个完整路径（路径由 client/api 各文件里的 *ApiPath enum 提供）并解包 Envelope。 */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  // 只记 pathname，不记 query（可能含关键词等隐私）。
  const scope = path.split('?')[0] ?? path
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (caught) {
    logWarn(scope, 'network error', { message: caught instanceof Error ? caught.message : String(caught) })
    throw new ApiError(ERROR_CODE_NETWORK, caught instanceof Error ? caught.message : String(caught))
  }

  let body: Envelope<T>
  try {
    body = (await response.json()) as Envelope<T>
  } catch {
    logWarn(scope, 'non-JSON response', { status: response.status })
    throw new ApiError(ERROR_CODE_BAD_RESPONSE, `接口返回了非 JSON 响应（HTTP ${response.status}）`)
  }

  if (!body.ok || body.value === undefined) {
    const code = body.error?.code ?? ERROR_CODE_UNKNOWN
    logWarn(scope, 'api error', { code, message: body.error?.message ?? '' })
    throw new ApiError(code, body.error?.message ?? '未知错误')
  }
  return body.value
}

/** 请求工具对象：用 `request.get(...)` / `request.post(...)` 这种形式调用。 */
export const request = {
  /** GET 请求。 */
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return requestJson<T>(path, { signal })
  },

  /** POST 请求（无 body 或 JSON body）。 */
  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return requestJson<T>(path, {
      method: HTTP_METHOD_POST,
      signal,
      ...(body !== undefined
        ? { headers: { [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON }, body: JSON.stringify(body) }
        : {}),
    })
  },
}
