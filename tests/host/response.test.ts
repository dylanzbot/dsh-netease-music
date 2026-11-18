import { describe, expect, it } from 'vitest'
import { CACHE_CONTROL_NO_STORE, HEADER_CACHE_CONTROL } from '../../src/constants/http.js'
import { fail, ok } from '../../src/host/utils/response.js'

describe('ok', () => {
  it('返回 { ok: true, value } 且禁止缓存', async () => {
    const response = ok({ id: 1 })
    expect(response.status).toBe(200)
    expect(response.headers.get(HEADER_CACHE_CONTROL)).toBe(CACHE_CONTROL_NO_STORE)
    expect(await response.json()).toEqual({ ok: true, value: { id: 1 } })
  })

  it('value 为 null / undefined 时仍保留字段', async () => {
    expect(await ok(null).json()).toEqual({ ok: true, value: null })
    const json = (await ok(undefined).json()) as Record<string, unknown>
    expect(json.ok).toBe(true)
    expect('value' in json).toBe(false) // JSON.stringify 会丢掉 undefined
  })
})

describe('fail', () => {
  it('默认 500，带 code / message', async () => {
    const response = fail('ncm/upstream', '上游挂了')
    expect(response.status).toBe(500)
    expect(response.headers.get(HEADER_CACHE_CONTROL)).toBe(CACHE_CONTROL_NO_STORE)
    expect(await response.json()).toEqual({ ok: false, error: { code: 'ncm/upstream', message: '上游挂了' } })
  })

  it('支持自定义状态码', async () => {
    expect((await fail('ncm/not-logged-in', 'no', 401)).status).toBe(401)
    expect((await fail('ncm/bad-request', 'bad', 400)).status).toBe(400)
    expect((await fail('x', 'gone', 410)).status).toBe(410)
  })
})
