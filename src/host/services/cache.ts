/**
 * 宿主侧各领域 service 的内存缓存集中管理。
 *
 * 把散在各 service 里的缓存（「我的」数据、歌单歌曲、库内搜索）收拢到一处，
 * 便于「退出登录 / 取消收藏」等场景一次性清空，避免各 service 互相 import
 * 形成循环依赖。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/cache
 */

import type { NcmLibrarySearchDTO, NcmMeDTO, NcmSongDTO } from '../../types/index.js'
import { createHash } from 'node:crypto'

/**
 * 用户维度标识：用 Cookie 的短哈希，不直接把明文 Cookie 当 Map 键存内存。
 * 同一账号的不同 Cookie（重新登录后可能变化）会被视为不同用户，是安全的保守做法。
 */
export function userKey(cookie: string): string {
  return createHash('sha1').update(cookie).digest('hex').slice(0, 16)
}

/** 生成带用户维度的缓存键，避免切号后读到上一账号的私有数据。 */
export function scopedCacheKey(cookie: string, key: string): string {
  return `${userKey(cookie)}:${key}`
}

/** 「我的」数据缓存（同一 Cookie 30 秒内复用）。 */
export interface MeCache {
  readonly cookie: string
  readonly at: number
  readonly data: NcmMeDTO
}

export const meCacheStore = { current: null as MeCache | null }

/** 歌单歌曲缓存（按「用户 + 歌单 id」）；搜索我的歌单时避免每次重新拉全部歌单。 */
export interface PlaylistTracksCache {
  readonly at: number
  readonly songs: readonly NcmSongDTO[]
}

export const playlistTracksCache = new Map<string, PlaylistTracksCache>()

/** 「我的歌单 / 我的收藏」内搜索缓存（按「用户 + 关键词」）。 */
export const librarySearchCache = new Map<string, { readonly at: number; readonly data: NcmLibrarySearchDTO }>()

/** 退出登录 / 全局重置时清空所有内存缓存。 */
export function clearAllCaches(): void {
  meCacheStore.current = null
  playlistTracksCache.clear()
  librarySearchCache.clear()
}
