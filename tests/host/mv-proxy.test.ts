/*
 * MV 下载功能已注释停用。原测试用例完整保留在下方注释中，
 * 恢复功能时把本块注释打开、并删掉文件末尾的占位 it.todo 即可。
 *
import { describe, expect, it } from 'vitest'
import {
  cappedBody,
  isAllowedMvUrl,
  MV_DOWNLOAD_MAX_BYTES,
  MV_DOWNLOAD_TIMEOUT_MS,
} from '../../src/host/utils/mv-proxy.js'

describe('isAllowedMvUrl', () => {
  it.each([
    'https://video.music.126.net/a/b.mp4',
    'https://music.126.net/a.mp4', // apex（旧正则会误拒）
    'https://vod.126.net/a.mp4',
    'https://x.vod.126.net:443/a.mp4', // 带端口（旧正则会误拒）
    'https://a.b.music.126.net/a.mp4',
  ])('允许合法地址 %s', (url) => {
    expect(isAllowedMvUrl(url)).toBe(true)
  })

  it.each([
    'https://x.music.126.net@evil.com/a', // userinfo 伪装
    'https://music.126.net.evil.com/a',
    'https://evil.com/a',
    'http://video.music.126.net/a.mp4', // 非 https
    'not a url',
    '',
    'https://music.126.net.evil.com@evil.com/a',
  ])('拒绝非法地址 %s', (url) => {
    expect(isAllowedMvUrl(url)).toBe(false)
  })

  it('常量处于合理范围', () => {
    expect(MV_DOWNLOAD_TIMEOUT_MS).toBeGreaterThan(0)
    expect(MV_DOWNLOAD_MAX_BYTES).toBe(200 * 1024 * 1024)
  })
})

describe('cappedBody', () => {
  function streamOf(chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk)
        controller.close()
      },
    })
  }

  async function collect(body: ReadableStream<Uint8Array>): Promise<number> {
    let total = 0
    const reader = body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
    }
    return total
  }

  it('未超限的流原样输出', async () => {
    const source = streamOf([new Uint8Array(3), new Uint8Array(4)])
    expect(await collect(cappedBody(source, 10))).toBe(7)
  })

  it('累计字节超过上限时报错中断', async () => {
    const source = streamOf([new Uint8Array(6), new Uint8Array(6)])
    await expect(collect(cappedBody(source, 10))).rejects.toThrow('文件过大')
  })

  it('上限为 0 时，任何非空 chunk 都会中断', async () => {
    const source = streamOf([new Uint8Array(1)])
    await expect(collect(cappedBody(source, 0))).rejects.toThrow('文件过大')
  })
})
*/

import { describe, it } from 'vitest'

// 占位用例：MV 下载功能已停用，原用例保留在上方注释中。
describe('MV 下载代理工具（已注释停用）', () => {
  it.todo('恢复 MV 下载功能后取消注释原用例')
})
