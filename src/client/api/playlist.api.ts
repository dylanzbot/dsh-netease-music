/* 歌单接口（浏览器侧）。 */

import type { NcmMyPlaylistsDTO, NcmSongDTO } from '../../types/index.js'
import { request } from '../utils/request.js'

/** 歌单接口路径。 */
export enum PlaylistApiPath {
  /** 获取歌单详情（含歌曲列表）。 */
  Detail = '/api/ncm/playlist/detail',
  /** 收藏 / 取消收藏歌单。 */
  Subscribe = '/api/ncm/playlist/subscribe',
  /** 「我的」页面的歌单（轻量，不含资料 / 会员等）。 */
  MyPlaylists = '/api/ncm/playlists',
}

/** 获取歌单歌曲列表。 */
export function getPlaylistSongs(id: number, signal?: AbortSignal): Promise<NcmSongDTO[]> {
  return request.get<NcmSongDTO[]>(`${PlaylistApiPath.Detail}?id=${id}`, signal)
}

/** 收藏 / 取消收藏歌单。 */
export function setPlaylistSubscribed(id: number, subscribed: boolean): Promise<{ subscribed: boolean }> {
  return request.post<{ subscribed: boolean }>(PlaylistApiPath.Subscribe, { id, subscribed })
}

/** 只刷新歌单列表（收藏 / 取消收藏后调用，不重新拉取资料）。 */
export function getMyPlaylists(signal?: AbortSignal): Promise<NcmMyPlaylistsDTO> {
  return request.get<NcmMyPlaylistsDTO>(PlaylistApiPath.MyPlaylists, signal)
}
