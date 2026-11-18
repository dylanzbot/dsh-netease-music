/**
 * HTTP 相关常量（方法、请求头、MIME 类型、缓存控制、状态码）。
 *
 * @module @dylanzbot/dsh-netease-music/constants/http
 */

/** HTTP 方法。 */
export const HTTP_METHOD_GET = 'GET'
export const HTTP_METHOD_POST = 'POST'

/** 常用请求头名。 */
export const HEADER_CONTENT_TYPE = 'content-type'
export const HEADER_USER_AGENT = 'user-agent'
export const HEADER_CACHE_CONTROL = 'cache-control'
export const HEADER_REFERER = 'referer'
export const HEADER_COOKIE = 'cookie'
export const HEADER_CONTENT_DISPOSITION = 'content-disposition'

/** MIME 类型。 */
export const CONTENT_TYPE_FORM_URLENCODED = 'application/x-www-form-urlencoded'
export const CONTENT_TYPE_JSON = 'application/json'
export const CONTENT_TYPE_OCTET_STREAM = 'application/octet-stream'

/** 禁止缓存的响应头值。 */
export const CACHE_CONTROL_NO_STORE = 'no-store'

/** HTTP 状态码（本插件用到的）。 */
export const HTTP_STATUS_BAD_REQUEST = 400
export const HTTP_STATUS_UNAUTHORIZED = 401
export const HTTP_STATUS_GONE = 410
export const HTTP_STATUS_BAD_GATEWAY = 502

/** dsh 路由定义的请求体读取方式：整段缓冲。 */
export const ROUTE_REQUEST_BODY_BUFFERED = 'buffered'
