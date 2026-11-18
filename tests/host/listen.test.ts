import { createDecipheriv } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchListenStats } from '../../src/host/api/listen.api.js'

const EAPI_KEY = 'e82ckenh8dichen8'

/** 把 eapi 的 params 解回 { path, data }，用于断言请求选的是哪个上游接口。 */
function decodeParams(params: string): { path: string; data: unknown } {
  const decipher = createDecipheriv('aes-128-ecb', Buffer.from(EAPI_KEY, 'utf8'), null)
  const payload = Buffer.concat([
    decipher.update(Buffer.from(params, 'hex')),
    decipher.final(),
  ]).toString('utf8')
  const parts = payload.split('-36cd479b6b5-')
  return { path: parts[0] ?? '', data: JSON.parse(parts[1] ?? '{}') as unknown }
}

function stubFetch(handler: (path: string) => unknown) {
  const mock = vi.fn(async (_url: unknown, init: RequestInit) => {
    const body = new URLSearchParams(String(init.body))
    const { path } = decodeParams(body.get('params') ?? '')
    return Response.json(handler(path))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchListenStats', () => {
  it('「最近一周」读取上一个完整周的 report，而不是本周实时的 realtime/report', async () => {
    const mock = stubFetch((path) => {
      if (path.endsWith('/listen/data/total')) return { code: 200, data: { totalDuration: 6483628 } }
      if (path.endsWith('/listen/data/realtime/report')) return { code: 200, data: { listenTimeDistributionBlock: { playDuration: 0 } } }
      return {
        code: 200,
        data: { listenTimeDistributionBlock: { playDuration: 86, listenDays: 2 } },
      }
    })

    const stats = await fetchListenStats('cookie')

    expect(stats).toEqual({ totalDurationSeconds: 6483628, weekPlayMinutes: 86, weekListenDays: 2 })
    const paths = mock.mock.calls.map((call) => decodeParams(new URLSearchParams(String(call[1].body)).get('params') ?? '').path)
    expect(paths).toContain('/api/content/activity/listen/data/report')
    expect(paths).not.toContain('/api/content/activity/listen/data/realtime/report')
  })

  it('单个接口失败时返回其它接口的可用数据', async () => {
    stubFetch((path) => {
      if (path.endsWith('/listen/data/total')) return { code: 500 }
      return { code: 200, data: { listenTimeDistributionBlock: { playDuration: 42 } } }
    })

    expect(await fetchListenStats('cookie')).toEqual({
      totalDurationSeconds: undefined,
      weekPlayMinutes: 42,
      weekListenDays: undefined,
    })
  })
})
