import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ERROR_CODE_BAD_RESPONSE,
  ERROR_CODE_NETWORK,
  ERROR_CODE_UNKNOWN,
} from '../../src/constants/error-code.js'
import { CONTENT_TYPE_JSON, HEADER_CONTENT_TYPE, HTTP_METHOD_POST } from '../../src/constants/http.js'
import { ApiError, request } from '../../src/client/utils/request.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const mock = vi.fn(impl)
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('request.get', () => {
  it('解包 Envelope，返回 value', async () => {
    const fetchMock = stubFetch(async () => Response.json({ ok: true, value: { id: 1, name: 'ncm' } }))
    const controller = new AbortController()

    const result = await request.get<{ id: number; name: string }>('/api/ncm/me', controller.signal)

    expect(result).toEqual({ id: 1, name: 'ncm' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/ncm/me')
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ signal: controller.signal })
  })
})

describe('request.post', () => {
  it('带 body 时设置 JSON 头并序列化', async () => {
    const fetchMock = stubFetch(async () => Response.json({ ok: true, value: { liked: true } }))

    const result = await request.post<{ liked: boolean }>('/api/ncm/song/like', { id: 7, like: true })

    expect(result).toEqual({ liked: true })
    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.method).toBe(HTTP_METHOD_POST)
    expect((init?.headers as Record<string, string>)?.[HEADER_CONTENT_TYPE]).toBe(CONTENT_TYPE_JSON)
    expect(init?.body).toBe(JSON.stringify({ id: 7, like: true }))
  })

  it('不带 body 时不设置 headers / body', async () => {
    const fetchMock = stubFetch(async () => Response.json({ ok: true, value: 'ok' }))

    await request.post('/api/ncm/auth/qr/start')

    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ method: HTTP_METHOD_POST, signal: undefined })
  })
})

describe('ApiError 映射', () => {
  it('fetch 抛错 → 网络错误码，保留原始消息', async () => {
    stubFetch(async () => {
      throw new Error('boom')
    })

    await expect(request.get('/api/ncm/me')).rejects.toMatchObject({
      name: 'ApiError',
      code: ERROR_CODE_NETWORK,
      message: 'boom',
    })
  })

  it('非 JSON 响应 → bad-response 错误码，带上 HTTP 状态', async () => {
    stubFetch(async () => new Response('not json', { status: 502 }))

    const error = await request.get('/api/ncm/me').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe(ERROR_CODE_BAD_RESPONSE)
    expect((error as ApiError).message).toContain('502')
  })

  it('Envelope ok:false → 使用上游 code / message', async () => {
    stubFetch(async () =>
      Response.json({ ok: false, error: { code: 'ncm/not-logged-in', message: '登录已过期' } }),
    )

    const error = await request.get('/api/ncm/me').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('ncm/not-logged-in')
    expect((error as ApiError).message).toBe('登录已过期')
  })

  it('ok:true 但缺 value → unknown 错误码', async () => {
    stubFetch(async () => Response.json({ ok: true }))

    const error = await request.get('/api/ncm/me').catch((caught: unknown) => caught)
    expect((error as ApiError).code).toBe(ERROR_CODE_UNKNOWN)
    expect((error as ApiError).message).toBe('未知错误')
  })

  it('Envelope 无 error 字段时错误码回退到 unknown', async () => {
    stubFetch(async () => Response.json({ ok: false }))

    const error = await request.get('/api/ncm/me').catch((caught: unknown) => caught)
    expect((error as ApiError).code).toBe(ERROR_CODE_UNKNOWN)
  })

  it('ApiError 是可区分的 Error 子类', () => {
    const error = new ApiError('ncm/test', 'msg')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApiError')
    expect(error.code).toBe('ncm/test')
  })
})
