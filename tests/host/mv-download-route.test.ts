/*
 * MV 下载功能已注释停用。原测试用例完整保留在下方注释中，
 * 恢复功能时把本块注释打开、并删掉文件末尾的占位 it.todo 即可。
 *
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../src/types/cordis.js'
import { HostApiPath } from '../../src/host/routes/paths.js'
import { createArtistRouter } from '../../src/host/routes/artist.js'

const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }

function mvRoute() {
  const found = createArtistRouter(logger).find((item) => item.def.path === HostApiPath.MvDownload)
  if (found === undefined) throw new Error('MV 下载路由不存在')
  return found.def.fetch
}

function downloadRequest(url: string, name = 'mv.mp4'): Request {
  const params = new URLSearchParams({ url, name })
  return new Request(`https://dsh.local${HostApiPath.MvDownload}?${params.toString()}`)
}

describe('MV 下载代理（M2 修复）', () => {
  it('非法域名直接 400，且不发上游请求', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await mvRoute()(downloadRequest('https://evil.com/a.mp4'))
    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('合法地址带 redirect:error 与超时 signal 请求上游', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const response = await mvRoute()(downloadRequest('https://video.music.126.net/a.mp4'))
    expect(response.status).toBe(200)

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.redirect).toBe('error')
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(response.headers.get('content-disposition') ?? '').toContain('attachment')
    vi.unstubAllGlobals()
  })

  it('上游 content-length 超过上限时 400 且不返回文件', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('x', { status: 200, headers: { 'content-length': String(201 * 1024 * 1024) } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const response = await mvRoute()(downloadRequest('https://video.music.126.net/big.mp4'))
    expect(response.status).toBe(400)
    vi.unstubAllGlobals()
  })

  it('上游抛错（含重定向被禁）时返回 502，且不回传异常原文', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('internal detail must not leak')
    })
    vi.stubGlobal('fetch', fetchMock)
    const response = await mvRoute()(downloadRequest('https://video.music.126.net/a.mp4'))
    expect(response.status).toBe(502)
    const body = (await response.json()) as { error: { message: string } }
    expect(body.error.message).not.toContain('internal detail')
    vi.unstubAllGlobals()
  })
})
*/

import { describe, it } from 'vitest'

// 占位用例：MV 下载功能已停用，原用例保留在上方注释中。
describe('MV 下载代理（已注释停用）', () => {
  it.todo('恢复 MV 下载功能后取消注释原用例')
})
