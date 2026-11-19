/**
 * 歌曲业务逻辑：播放地址、我喜欢的音乐、喜欢 / 取消喜欢。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/song
 */

import type { NcmQualityLevel } from '../../types/index.js'
import {
  ALLOWED_QUALITY_LEVELS,
  DEFAULT_QUALITY_LEVEL,
  fetchLikedSongIds,
  fetchSongUrlByLevel,
  setSongLike,
} from '../api/index.js'
import { getCookie } from '../credentials.js'
import { NotLoggedInError } from '../error/index.js'

/** 取当前登录用户 Cookie；未登录抛 NotLoggedInError（沿用 account 的语义）。 */
function requireCookie(): string {
  const cookie = getCookie()
  if (cookie === '') {
    throw new NotLoggedInError()
  }
  return cookie
}

/** 获取歌曲播放地址。level 为空或非法用默认音质；当前有歌时从当前进度继续。 */
export async function getSongUrl(
  songId: number,
  level?: string,
): Promise<{ url: string; br: number; type: string; size: number; level: string }> {
  const requested: NcmQualityLevel =
    level !== undefined && (ALLOWED_QUALITY_LEVELS as readonly string[]).includes(level)
      ? (level as NcmQualityLevel)
      : DEFAULT_QUALITY_LEVEL
  return fetchSongUrlByLevel(songId, requested, requireCookie())
}

/** 读取「我喜欢的音乐」歌曲 ID 列表。 */
export async function getLikedSongIds(): Promise<number[]> {
  return fetchLikedSongIds(requireCookie())
}

/** 喜欢 / 取消喜欢一首歌。 */
export async function setSongLikeById(id: number, like: boolean): Promise<{ liked: boolean }> {
  await setSongLike(id, like, requireCookie())
  return { liked: like }
}
