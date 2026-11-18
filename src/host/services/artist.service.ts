/**
 * 歌手相关业务逻辑。
 *
 * 与 account.service.ts 一样：这里只做「取 Cookie → 调上游 api → 返回 DTO」，
 * 统一处理未登录。不碰 HTTP 路由（那是 routes/artist.ts 的事），也不直接
 * 发上游请求（那是 api/artist.api.ts 的事）。
 *
 * 说明：歌手列表 / 搜索 / 详情属于公开数据，网易云这些接口在未登录时也能返回，
 * 但视频/关注态等依赖 Cookie，所以这里仍要求已登录（与插件整体"登录后使用"一致），
 * 未登录直接抛 NotLoggedInError，由路由层翻译成 401。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/artist
 */

import type {
  NcmAlbumCardDTO,
  NcmAlbumInfoDTO,
  NcmArtistInfoDTO,
  NcmArtistListDTO,
  NcmArtistSearchResultDTO,
  NcmArtistSongsDTO,
  NcmMvCardDTO,
  NcmMvDetailDTO,
} from '../../types/index.js'
import {
  fetchAlbumDetail,
  fetchArtistAlbums,
  fetchArtistInfo,
  fetchArtistMvs,
  fetchArtistSongs,
  fetchMvDetail,
  fetchTopArtists,
  searchArtists,
  setArtistFollow,
} from '../api/artist.api.js'
import { getCookie } from '../config.js'
import { NotLoggedInError } from '../error/index.js'

export { NotLoggedInError }

/** 取当前登录 Cookie，空则抛未登录。 */
function requireCookie(): string {
  const cookie = getCookie()
  if (cookie === '') throw new NotLoggedInError()
  return cookie
}

/** 热门歌手榜（列表页首屏，分页）。 */
export async function getTopArtists(offset: number, limit: number): Promise<NcmArtistListDTO> {
  return fetchTopArtists(offset, limit, requireCookie())
}

/** 搜索 / 按首字母关键词浏览歌手（分页）。 */
export async function searchArtist(
  keywords: string,
  offset: number,
  limit: number,
): Promise<NcmArtistSearchResultDTO> {
  return searchArtists(keywords, offset, limit, requireCookie())
}

/** 歌手详情 + 热门歌曲。 */
export async function getArtistInfo(id: number): Promise<NcmArtistInfoDTO> {
  return fetchArtistInfo(id, requireCookie())
}

/** 歌手歌曲（分页）。 */
export async function getArtistSongs(
  id: number,
  order: 'hot' | 'time',
  offset: number,
  limit: number,
): Promise<NcmArtistSongsDTO> {
  return fetchArtistSongs(id, order, offset, limit, requireCookie())
}

/** 歌手专辑。 */
export async function getArtistAlbums(
  id: number,
  limit: number,
  offset: number,
): Promise<{ albums: NcmAlbumCardDTO[]; more: boolean }> {
  return fetchArtistAlbums(id, limit, offset, requireCookie())
}

/** 专辑详情（介绍 + 歌曲，供专辑弹窗一次拿全）。 */
export async function getAlbumDetail(albumId: number): Promise<NcmAlbumInfoDTO> {
  return fetchAlbumDetail(albumId, requireCookie())
}

/** 歌手 MV 列表。 */
export async function getArtistMvs(
  id: number,
  limit: number,
  offset: number,
): Promise<{ mvs: NcmMvCardDTO[]; more: boolean }> {
  return fetchArtistMvs(id, limit, offset, requireCookie())
}

/** 关注 / 取关歌手。 */
export async function followArtist(id: number, follow: boolean): Promise<void> {
  return setArtistFollow(id, follow, requireCookie())
}

/** MV 详情（含各清晰度可播 URL；供内联播放器）。 */
export async function getMvDetail(id: number): Promise<NcmMvDetailDTO> {
  return fetchMvDetail(id, requireCookie())
}
