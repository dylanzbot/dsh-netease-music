/**
 * 宿主侧所有 Error 类型的统一出口。
 *
 * 各业务层（api / service / route）只从这里 import 错误类，不各自定义，
 * 保证 `instanceof` 判定一致。
 *
 * @module @dylanzbot/dsh-netease-music/host/error
 */

export { NcmApiError } from './api-error.js'
export {
  InvalidCookieError,
  NotLoggedInError,
  QrSessionExpiredError,
} from './auth-error.js'
