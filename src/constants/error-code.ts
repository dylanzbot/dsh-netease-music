/**
 * 错误码（宿主 Envelope 的 error.code 和浏览器侧本地错误共用）。
 *
 * @module @dylanzbot/dsh-netease-music/constants/error-code
 */

/** 错误码：上游网易云接口失败。 */
export const ERROR_CODE_UPSTREAM = 'ncm/upstream'

/** 错误码：请求参数缺失。 */
export const ERROR_CODE_BAD_REQUEST = 'ncm/bad-request'

/** 错误码：二维码会话不存在或已过期。 */
export const ERROR_CODE_QR_EXPIRED = 'ncm/qr-expired'

/** 错误码：未登录或登录已过期。 */
export const ERROR_CODE_NOT_LOGGED_IN = 'ncm/not-logged-in'

/** 错误码：浏览器侧网络错误。 */
export const ERROR_CODE_NETWORK = 'ncm/network'

/** 错误码：接口返回了非 JSON 响应。 */
export const ERROR_CODE_BAD_RESPONSE = 'ncm/bad-response'

/** 错误码：未知错误。 */
export const ERROR_CODE_UNKNOWN = 'ncm/unknown'
