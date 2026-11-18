/**
 * 鉴权 / 登录相关错误。
 *
 * 统一放在 error 目录，避免各 service 各写一份、`instanceof` 判定互相不认。
 *
 * @module @dylanzbot/dsh-netease-music/host/error/auth-error
 */

import { ERROR_CODE_BAD_REQUEST, ERROR_CODE_NOT_LOGGED_IN } from '../../constants/error-code.js'

/** 手动粘贴的 Cookie 无效。 */
export class InvalidCookieError extends Error {
  readonly code = ERROR_CODE_BAD_REQUEST

  constructor(message: string) {
    super(message)
    this.name = 'InvalidCookieError'
  }
}

/** 未登录 / 登录已过期。 */
export class NotLoggedInError extends Error {
  readonly code = ERROR_CODE_NOT_LOGGED_IN

  constructor(message = '登录已过期，请重新扫码登录') {
    super(message)
    this.name = 'NotLoggedInError'
  }
}

/** 扫码会话不存在或已过期。 */
export class QrSessionExpiredError extends Error {
  constructor() {
    super('二维码会话不存在或已过期')
    this.name = 'QrSessionExpiredError'
  }
}
