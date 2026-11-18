/**
 * 歌单相关上游接口（用户歌单 / 歌单详情 / 推荐歌单）。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-playlist
 */

import type { NcmPlaylistCardDTO, NcmSongDTO } from '../../types/index.js'
import { getNcm, mapPlaylist, mapSong, postNcm, type RawPlaylist, type RawSearchSong } from './common.api.js'
import { NcmApiError } from '../error/index.js'
import { weapiPost } from '../utils/weapi.js'
import { csrfFromCookie } from '../../utils/ncm.js'

interface RawPlaylistBody {
  readonly code?: number
  readonly message?: string
  readonly playlist?: readonly RawPlaylist[] | null
  readonly more?: boolean
}

interface RawPersonalizedPlaylistBody {
  readonly code?: number
  readonly result?: readonly RawPlaylist[]
}

/** 用户歌单（我喜欢的音乐 + 创建 + 收藏都在这个列表里）。 */
export async function fetchUserPlaylists(
  userId: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmPlaylistCardDTO[]> {
  const params = new URLSearchParams({ uid: String(userId), limit: '1000', offset: '0' })
  const { body } = await getNcm(`/api/user/playlist?${params.toString()}`, cookie, signal)
  const data = body as RawPlaylistBody
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, data.message ?? '歌单接口返回失败')
  }
  return (data.playlist ?? []).map(mapPlaylist)
}

/** 首页推荐歌单。 */
export async function fetchRecommendedPlaylists(
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmPlaylistCardDTO[]> {
  const { body } = await getNcm('/api/personalized/playlist?limit=10', cookie, signal)
  const data = body as RawPersonalizedPlaylistBody
  return (data.result ?? []).map(mapPlaylist)
}

/** 搜索歌单（cloudsearch type=1000，可分页）。 */
export async function searchPlaylists(
  keywords: string,
  offset: number,
  limit: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<{ playlists: NcmPlaylistCardDTO[]; total: number; more: boolean }> {
  const size = Math.min(Math.max(limit, 1), 100)
  const { body } = await postNcm(
    '/api/cloudsearch/pc',
    { s: keywords, type: '1000', limit: String(size), offset: String(offset), total: 'true' },
    cookie,
    signal,
  )
  const data = body as {
    code?: number
    result?: { playlists?: readonly RawPlaylist[] | null; playlistCount?: number }
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '歌单搜索接口返回失败')
  }
  const playlists = (data.result?.playlists ?? []).map(mapPlaylist)
  const total = typeof data.result?.playlistCount === 'number' ? data.result.playlistCount : 0
  const more = playlists.length > 0 && offset + playlists.length < total
  return { playlists, total, more }
}

/** 歌单详情里的歌曲列表。 */
export async function fetchPlaylistSongs(
  id: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmSongDTO[]> {
  const params = new URLSearchParams({ id: String(id), n: '1000' })
  const { body } = await getNcm(`/api/v6/playlist/detail?${params.toString()}`, cookie, signal)
  const data = body as { code?: number; playlist?: { tracks?: readonly RawSearchSong[] | null } }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '歌单详情接口返回失败')
  }
  return (data.playlist?.tracks ?? []).map(mapSong)
}

/** 收藏 / 取消收藏歌单。 */
export async function setPlaylistSubscribed(
  id: number,
  subscribed: boolean,
  cookie: string,
  signal?: AbortSignal,
): Promise<void> {
  const path = subscribed ? '/playlist/subscribe' : '/playlist/unsubscribe'
  const csrf = csrfFromCookie(cookie)
  const { body } = await weapiPost(path, { id, csrf_token: csrf }, cookie, signal)
  const data = body as { code?: number; message?: string }
  // 501 表示「已收藏 / 未收藏」这种幂等状态，视为成功。
  if (data.code !== undefined && data.code !== 200 && data.code !== 501) {
    throw new NcmApiError(data.code, data.message ?? '歌单收藏操作失败')
  }
}
