import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotLoggedInError } from '../../src/host/error/index.js'
import {
  ALLOWED_QUALITY_LEVELS,
  DEFAULT_QUALITY_LEVEL,
  fetchLikedSongIds,
  fetchSongUrlByLevel,
  setSongLike,
} from '../../src/host/api/index.js'
import { getCookie } from '../../src/host/credentials.js'
import { getLikedSongIds, getSongUrl, setSongLikeById } from '../../src/host/services/song.service.js'

vi.mock('../../src/host/credentials.js', () => ({ getCookie: vi.fn() }))
vi.mock('../../src/host/api/index.js', () => ({
  ALLOWED_QUALITY_LEVELS: ['standard', 'exhigh', 'lossless'],
  DEFAULT_QUALITY_LEVEL: 'exhigh',
  fetchLikedSongIds: vi.fn(),
  fetchSongUrlByLevel: vi.fn(),
  setSongLike: vi.fn(),
}))

const getCookieMock = vi.mocked(getCookie)
const fetchSongUrlByLevelMock = vi.mocked(fetchSongUrlByLevel)
const fetchLikedSongIdsMock = vi.mocked(fetchLikedSongIds)
const setSongLikeMock = vi.mocked(setSongLike)

beforeEach(() => {
  vi.clearAllMocks()
  getCookieMock.mockReturnValue('MUSIC_U=test')
  fetchSongUrlByLevelMock.mockResolvedValue({ url: 'https://x', br: 320000, type: 'mp3', size: 1, level: 'exhigh' })
  fetchLikedSongIdsMock.mockResolvedValue([1, 2])
  setSongLikeMock.mockResolvedValue(undefined)
})

describe('requireCookie', () => {
  it('未登录时 getSongUrl / getLikedSongIds / setSongLikeById 都抛 NotLoggedInError', async () => {
    getCookieMock.mockReturnValue('')

    await expect(getSongUrl(1)).rejects.toBeInstanceOf(NotLoggedInError)
    await expect(getLikedSongIds()).rejects.toBeInstanceOf(NotLoggedInError)
    await expect(setSongLikeById(1, true)).rejects.toBeInstanceOf(NotLoggedInError)

    expect(fetchSongUrlByLevelMock).not.toHaveBeenCalled()
    expect(fetchLikedSongIdsMock).not.toHaveBeenCalled()
    expect(setSongLikeMock).not.toHaveBeenCalled()
  })
})

describe('getSongUrl', () => {
  it('合法 level 原样传给上游', async () => {
    await getSongUrl(11, 'standard')
    expect(fetchSongUrlByLevelMock).toHaveBeenCalledWith(11, 'standard', 'MUSIC_U=test')
  })

  it.each([undefined, '', 'not-a-level', 'market'])('非法或缺失 level %s 回退到默认音质', async (level) => {
    await getSongUrl(11, level)
    expect(fetchSongUrlByLevelMock).toHaveBeenCalledWith(11, DEFAULT_QUALITY_LEVEL, 'MUSIC_U=test')
  })

  it('允许清单里的所有 level 都能透传', async () => {
    for (const level of ALLOWED_QUALITY_LEVELS) {
      await getSongUrl(11, level)
      expect(fetchSongUrlByLevelMock).toHaveBeenLastCalledWith(11, level, 'MUSIC_U=test')
    }
  })
})

describe('喜欢列表 / 喜欢操作', () => {
  it('getLikedSongIds 透传 Cookie', async () => {
    await expect(getLikedSongIds()).resolves.toEqual([1, 2])
    expect(fetchLikedSongIdsMock).toHaveBeenCalledWith('MUSIC_U=test')
  })

  it('setSongLikeById 返回 { liked } 而不是上游原始结果', async () => {
    await expect(setSongLikeById(3, false)).resolves.toEqual({ liked: false })
    expect(setSongLikeMock).toHaveBeenCalledWith(3, false, 'MUSIC_U=test')
  })
})
