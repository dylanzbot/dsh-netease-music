import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../../src/client/utils/request.js'
import {
  DEFAULT_SONG_QUALITY,
  SONG_QUALITY_OPTIONS,
  SongApiPath,
  getDiscover,
  getLikedSongIds,
  getSongUrl,
  searchLibrary,
  searchMulti,
  searchSongs,
  setSongLike,
} from '../../src/client/api/song.api.js'
import { AuthApiPath, checkQrLogin, startQrLogin } from '../../src/client/api/auth.api.js'

vi.mock('../../src/client/utils/request.js', () => ({
  request: { get: vi.fn(), post: vi.fn() },
}))

const getMock = vi.mocked(request.get)
const postMock = vi.mocked(request.post)

beforeEach(() => {
  getMock.mockReset().mockResolvedValue(undefined as never)
  postMock.mockReset().mockResolvedValue(undefined as never)
})

describe('歌曲 API 路径构造', () => {
  it('searchSongs 对关键词做 URL 编码', async () => {
    await searchSongs('周 杰伦')
    expect(getMock).toHaveBeenCalledWith(`/api/ncm/search?keywords=${encodeURIComponent('周 杰伦')}`, undefined)
  })

  it('searchLibrary 对关键词做 URL 编码', async () => {
    await searchLibrary('我&你')
    expect(getMock).toHaveBeenCalledWith('/api/ncm/search/library?keywords=%E6%88%91%26%E4%BD%A0', undefined)
  })

  it('searchMulti 使用 URLSearchParams 拼接 keywords 与 limit', async () => {
    await searchMulti('周杰伦', 10)
    expect(getMock).toHaveBeenCalledWith('/api/ncm/search/multi?keywords=%E5%91%A8%E6%9D%B0%E4%BC%A6&limit=10', undefined)
  })

  it('searchMulti 的默认 limit 是 5', async () => {
    await searchMulti('a')
    expect(getMock).toHaveBeenCalledWith('/api/ncm/search/multi?keywords=a&limit=5', undefined)
  })

  it('getSongUrl 带 / 不带 level', async () => {
    await getSongUrl(123, 'lossless')
    expect(getMock).toHaveBeenLastCalledWith('/api/ncm/song/url?id=123&level=lossless', undefined)

    await getSongUrl(456)
    expect(getMock).toHaveBeenLastCalledWith('/api/ncm/song/url?id=456', undefined)
  })

  it('getSongUrl 透传 AbortSignal', async () => {
    const signal = new AbortController().signal
    await getSongUrl(1, 'exhigh', signal)
    expect(getMock).toHaveBeenCalledWith('/api/ncm/song/url?id=1&level=exhigh', signal)
  })

  it('getLikedSongIds / getDiscover 使用常量路径', async () => {
    await getLikedSongIds()
    await getDiscover()
    expect(getMock).toHaveBeenNthCalledWith(1, SongApiPath.SongLiked, undefined)
    expect(getMock).toHaveBeenNthCalledWith(2, SongApiPath.Discover, undefined)
  })

  it('setSongLike 走 POST 并提交 id / like', async () => {
    await setSongLike(9, false)
    expect(postMock).toHaveBeenCalledWith(SongApiPath.SongLike, { id: 9, like: false })
  })
})

describe('登录 API 路径构造', () => {
  it('startQrLogin 走 POST 且无 body', async () => {
    const signal = new AbortController().signal
    await startQrLogin(signal)
    expect(postMock).toHaveBeenCalledWith(AuthApiPath.QrStart, undefined, signal)
  })

  it('checkQrLogin 编码 key', async () => {
    await checkQrLogin('a/b+c')
    expect(getMock).toHaveBeenCalledWith('/api/ncm/auth/qr/check?key=a%2Fb%2Bc', undefined)
  })
})

describe('音质常量', () => {
  it('默认音质在可选列表里，且各档位 level 唯一', () => {
    const levels = SONG_QUALITY_OPTIONS.map((option) => option.level)
    expect(new Set(levels).size).toBe(levels.length)
    expect(levels).toContain(DEFAULT_SONG_QUALITY)
    expect(DEFAULT_SONG_QUALITY).toBe('exhigh')
  })

  it('路径枚举值与硬编码路径一致（HTTP 契约）', () => {
    expect(AuthApiPath.QrStart).toBe('/api/ncm/auth/qr/start')
    expect(SongApiPath.SongUrl).toBe('/api/ncm/song/url')
  })
})
