import type { NcmLibrarySearchDTO, NcmMeDTO, NcmSongDTO } from '../../src/types/index.js'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllCaches,
  librarySearchCache,
  meCacheStore,
  playlistTracksCache,
  scopedCacheKey,
  userKey,
} from '../../src/host/services/cache.js'

const COOKIE_A = 'MUSIC_U=user-a; __csrf=a'
const COOKIE_B = 'MUSIC_U=user-b; __csrf=b'

beforeEach(() => {
  clearAllCaches()
})

describe('用户维度缓存键', () => {
  it('userKey 是稳定的短哈希，不含明文 Cookie', () => {
    const key = userKey(COOKIE_A)
    expect(key).toMatch(/^[0-9a-f]{16}$/)
    expect(userKey(COOKIE_A)).toBe(key)
    expect(key).not.toContain('MUSIC_U')
  })

  it('不同用户得到不同键', () => {
    expect(userKey(COOKIE_A)).not.toBe(userKey(COOKIE_B))
    expect(scopedCacheKey(COOKIE_A, '晴天')).not.toBe(scopedCacheKey(COOKIE_B, '晴天'))
  })

  it('同一用户 + 同一业务键得到相同键', () => {
    expect(scopedCacheKey(COOKIE_A, '12')).toBe(scopedCacheKey(COOKIE_A, '12'))
    expect(scopedCacheKey(COOKIE_A, '12')).not.toBe(scopedCacheKey(COOKIE_A, '13'))
  })
})

describe('宿主内存缓存', () => {
  it('meCacheStore 初始为空，可读写', () => {
    expect(meCacheStore.current).toBeNull()
    const entry = { cookie: COOKIE_A, at: Date.now(), data: {} as NcmMeDTO }
    meCacheStore.current = entry
    expect(meCacheStore.current).toBe(entry)
  })

  it('playlistTracksCache 以「用户 + 歌单 id」为键', () => {
    playlistTracksCache.set(scopedCacheKey(COOKIE_A, '1'), { at: 1, songs: [] as NcmSongDTO[] })
    playlistTracksCache.set(scopedCacheKey(COOKIE_B, '1'), { at: 2, songs: [] as NcmSongDTO[] })
    expect(playlistTracksCache.size).toBe(2)
    expect(playlistTracksCache.has(scopedCacheKey(COOKIE_A, '1'))).toBe(true)
    expect(playlistTracksCache.has(scopedCacheKey(COOKIE_B, '1'))).toBe(true)
  })

  it('librarySearchCache 以「用户 + 关键词」为键', () => {
    librarySearchCache.set(scopedCacheKey(COOKIE_A, '晴天'), {
      at: 1,
      data: {} as NcmLibrarySearchDTO,
    })
    expect(librarySearchCache.has(scopedCacheKey(COOKIE_A, '晴天'))).toBe(true)
    expect(librarySearchCache.has(scopedCacheKey(COOKIE_B, '晴天'))).toBe(false)
  })

  it('clearAllCaches 一次清空三处缓存', () => {
    meCacheStore.current = { cookie: COOKIE_A, at: 1, data: {} as NcmMeDTO }
    playlistTracksCache.set(scopedCacheKey(COOKIE_A, '1'), { at: 1, songs: [] })
    librarySearchCache.set(scopedCacheKey(COOKIE_A, 'k'), { at: 1, data: {} as NcmLibrarySearchDTO })

    clearAllCaches()

    expect(meCacheStore.current).toBeNull()
    expect(playlistTracksCache.size).toBe(0)
    expect(librarySearchCache.size).toBe(0)
  })
})
