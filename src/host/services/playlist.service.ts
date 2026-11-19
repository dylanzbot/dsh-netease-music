/**
 * 歌单业务逻辑：歌单详情（歌曲）、收藏 / 取消收藏、「我的」歌单。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/playlist
 */

import type { NcmMyPlaylistsDTO, NcmSongDTO } from '../../types/index.js'
import { fetchAccount, fetchPlaylistSongs, fetchUserPlaylists, setPlaylistSubscribed } from '../api/index.js'
import { getCookie } from '../config.js'
import { NotLoggedInError } from '../error/index.js'
import { invalidateMe } from './account.service.js'

function requireCookie(): string {
  const cookie = getCookie()
  if (cookie === '') throw new NotLoggedInError()
  return cookie
}

/** 获取歌单歌曲列表。 */
export async function getPlaylistSongs(id: number): Promise<NcmSongDTO[]> {
  return fetchPlaylistSongs(id, requireCookie())
}

/** 收藏 / 取消收藏歌单。 */
export async function subscribePlaylist(id: number, subscribed: boolean): Promise<{ subscribed: boolean }> {
  await setPlaylistSubscribed(id, subscribed, requireCookie())
  invalidateMe()
  return { subscribed }
}

/**
 * 「我的」页面的歌单（只含歌单，不含资料 / 会员 / 徽章 / 听歌统计）。
 * 相比 getMe 只打一次 /api/user/playlist，不重复请求资料、VIP、徽章、听歌足迹。
 */
export async function getMyPlaylists(): Promise<NcmMyPlaylistsDTO> {
  const cookie = requireCookie()
  const account = await fetchAccount(cookie)
  if (account === null) throw new NotLoggedInError()
  const playlists = await fetchUserPlaylists(account.userId, cookie)
  const liked = playlists.find((item) => item.specialType === 5) ?? null
  const rest = playlists.filter((item) => item !== liked)
  return {
    liked,
    playlists: rest.filter((item) => item.creatorId === account.userId),
    collections: rest.filter((item) => item.creatorId !== account.userId),
  }
}
