/**
 * Envelope 响应工具。
 *
 * 所有 /api/ncm/* 路由都返回：
 *   { ok: true, value } / { ok: false, error: { code, message } }
 *
 * @module @dylanzbot/dsh-netease-music/host/utils/response
 */

import { CACHE_CONTROL_NO_STORE, HEADER_CACHE_CONTROL } from '../../constants/http.js'

/** 成功响应。 */
export function ok(value: unknown): Response {
  return Response.json({ ok: true, value }, { headers: { [HEADER_CACHE_CONTROL]: CACHE_CONTROL_NO_STORE } })
}

/** 失败响应。 */
export function fail(code: string, message: string, status = 500): Response {
  return Response.json(
    { ok: false, error: { code, message } },
    { status, headers: { [HEADER_CACHE_CONTROL]: CACHE_CONTROL_NO_STORE } },
  )
}
