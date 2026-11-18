import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_REQUEST_TIMEOUT_MS, request, withTimeout } from '../../src/host/utils/request.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function stubFetch(): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async () => Response.json({ code: 200 }))
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('withTimeout', () => {
  it('无调用方 signal 时返回一个未中断的 AbortSignal', () => {
    const signal = withTimeout()
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBe(10_000)
  })

  it('到达超时时间后自动中断', async () => {
    const signal = withTimeout(undefined, 20)
    expect(signal.aborted).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(signal.aborted).toBe(true)
  })

  it('调用方 signal 中断时合并信号也中断', async () => {
    const controller = new AbortController()
    const combined = withTimeout(controller.signal, 5_000)
    expect(combined.aborted).toBe(false)
    controller.abort()
    expect(combined.aborted).toBe(true)
  })

  it('调用方已中断的 signal 会立即体现在合并信号上', () => {
    const controller = new AbortController()
    controller.abort()
    expect(withTimeout(controller.signal, 5_000).aborted).toBe(true)
  })
})

describe('request 统一超时', () => {
  it('getJson 传给 fetch 的 signal 不是 undefined', async () => {
    const fetchMock = stubFetch()
    await request.getJson('https://music.163.com/api/test')
    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal | undefined
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)
  })

  it('postForm 同样带 signal，并保留调用方 cookie / body', async () => {
    const fetchMock = stubFetch()
    await request.postForm('https://music.163.com/api/test', { a: '1' }, { cookie: 'MUSIC_U=x' })
    const init = fetchMock.mock.calls[0]?.[1]
    expect((init?.signal as AbortSignal | undefined)?.aborted).toBe(false)
    expect(init?.body).toBe('a=1')
    const headers = init?.headers as Record<string, string>
    expect(headers.cookie).toBe('MUSIC_U=x')
  })

  it('调用方传入的 signal 中断后，fetch 收到的 signal 也中断', async () => {
    const fetchMock = stubFetch()
    const controller = new AbortController()
    controller.abort()
    await request.getJson('https://music.163.com/api/test', { signal: controller.signal })
    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal
    expect(signal.aborted).toBe(true)
  })
})
