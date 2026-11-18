/**
 * 上游接口业务错误（网易云返回 code 非 200）。
 *
 * 这里保留上游原始 `code`（数字），供调用方判断登录失效（301/302）等场景。
 *
 * @module @dylanzbot/dsh-netease-music/host/error/api-error
 */

/** 上游接口返回业务错误（code 非 200）。 */
export class NcmApiError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'NcmApiError'
    this.code = code
  }
}
