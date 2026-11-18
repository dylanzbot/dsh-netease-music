import { describe, expect, it } from 'vitest'
import {
  ERROR_CODE_BAD_REQUEST,
  ERROR_CODE_NOT_LOGGED_IN,
} from '../../src/constants/error-code.js'
import { NcmApiError } from '../../src/host/error/api-error.js'
import {
  InvalidCookieError,
  NotLoggedInError,
  QrSessionExpiredError,
} from '../../src/host/error/auth-error.js'

describe('NcmApiError', () => {
  it('保留上游数字 code 与 name', () => {
    const error = new NcmApiError(301, '需要登录')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('NcmApiError')
    expect(error.code).toBe(301)
    expect(error.message).toBe('需要登录')
  })
})

describe('鉴权错误', () => {
  it('InvalidCookieError 使用 bad-request 码', () => {
    const error = new InvalidCookieError('Cookie 格式不对')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('InvalidCookieError')
    expect(error.code).toBe(ERROR_CODE_BAD_REQUEST)
    expect(error.message).toBe('Cookie 格式不对')
  })

  it('NotLoggedInError 有默认文案，也可自定义', () => {
    expect(new NotLoggedInError().message).toBe('登录已过期，请重新扫码登录')
    expect(new NotLoggedInError('custom').message).toBe('custom')
    const error = new NotLoggedInError()
    expect(error.name).toBe('NotLoggedInError')
    expect(error.code).toBe(ERROR_CODE_NOT_LOGGED_IN)
  })

  it('QrSessionExpiredError 有固定文案', () => {
    const error = new QrSessionExpiredError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('QrSessionExpiredError')
    expect(error.message).toBe('二维码会话不存在或已过期')
  })

  it('各类错误互不为 instanceof（避免判定串味）', () => {
    expect(new NotLoggedInError()).not.toBeInstanceOf(InvalidCookieError)
    expect(new InvalidCookieError('x')).not.toBeInstanceOf(NotLoggedInError)
    expect(new NcmApiError(1, 'x')).not.toBeInstanceOf(NotLoggedInError)
  })
})
