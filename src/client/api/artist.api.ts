/* 歌手接口（浏览器侧）。 */

import type {
  NcmAlbumCardDTO,
  NcmAlbumInfoDTO,
  NcmArtistInfoDTO,
  NcmArtistListDTO,
  NcmArtistSearchResultDTO,
  NcmArtistSongsDTO,
  NcmMvCardDTO,
  NcmMvDetailDTO,
  NcmSongDTO,
} from '../../types/index.js'
import { request } from '../utils/request.js'

/** 歌手接口路径。 */
export enum ArtistApiPath {
  List = '/api/ncm/artist/list',
  Search = '/api/ncm/artist/search',
  Detail = '/api/ncm/artist/detail',
  Songs = '/api/ncm/artist/songs',
  Albums = '/api/ncm/artist/albums',
  // 与宿主侧保持一致：路径沿用旧值，运行中的旧宿主也能响应（见 AlbumDetail 兼容逻辑）。
  AlbumDetail = '/api/ncm/album/songs',
  Mvs = '/api/ncm/artist/mvs',
  MvDetail = '/api/ncm/mv/detail',
  Follow = '/api/ncm/artist/follow',
}

/** 热门歌手榜（分页）。 */
export function getTopArtists(limit: number, offset: number, signal?: AbortSignal): Promise<NcmArtistListDTO> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  return request.get<NcmArtistListDTO>(`${ArtistApiPath.List}?${params.toString()}`, signal)
}

/** 搜索 / 按关键词浏览歌手（分页）。 */
export function searchArtists(
  keywords: string,
  offset: number,
  limit: number,
  signal?: AbortSignal,
): Promise<NcmArtistSearchResultDTO> {
  const params = new URLSearchParams({ keywords, offset: String(offset), limit: String(limit) })
  return request.get<NcmArtistSearchResultDTO>(`${ArtistApiPath.Search}?${params.toString()}`, signal)
}

/** 歌手详情 + 热门歌曲。 */
export function getArtistInfo(id: number, signal?: AbortSignal): Promise<NcmArtistInfoDTO> {
  return request.get<NcmArtistInfoDTO>(`${ArtistApiPath.Detail}?id=${id}`, signal)
}

/** 歌手歌曲（分页）。 */
export function getArtistSongs(
  id: number,
  order: 'hot' | 'time',
  offset: number,
  limit: number,
  signal?: AbortSignal,
): Promise<NcmArtistSongsDTO> {
  const params = new URLSearchParams({
    id: String(id),
    order,
    offset: String(offset),
    limit: String(limit),
  })
  return request.get<NcmArtistSongsDTO>(`${ArtistApiPath.Songs}?${params.toString()}`, signal)
}

/** 歌手专辑。 */
export function getArtistAlbums(
  id: number,
  limit: number,
  offset: number,
  signal?: AbortSignal,
): Promise<{ albums: readonly NcmAlbumCardDTO[]; more: boolean }> {
  const params = new URLSearchParams({ id: String(id), limit: String(limit), offset: String(offset) })
  return request.get(`${ArtistApiPath.Albums}?${params.toString()}`, signal)
}

/* 专辑详情（介绍 + 歌曲，弹窗一次拿全）。 */
export async function getAlbumDetail(albumId: number, signal?: AbortSignal): Promise<NcmAlbumInfoDTO> {
  const value = await request.get<unknown>(`${ArtistApiPath.AlbumDetail}?id=${albumId}`, signal)
  // 旧宿主侧只返回 songs[]；新宿主侧返回 { album?, songs }。
  if (Array.isArray(value)) return { songs: value as readonly NcmSongDTO[] }
  return value as NcmAlbumInfoDTO
}

/** 歌手 MV。 */
export function getArtistMvs(
  id: number,
  limit: number,
  offset: number,
  signal?: AbortSignal,
): Promise<{ mvs: readonly NcmMvCardDTO[]; more: boolean }> {
  const params = new URLSearchParams({ id: String(id), limit: String(limit), offset: String(offset) })
  return request.get(`${ArtistApiPath.Mvs}?${params.toString()}`, signal)
}

/** 关注 / 取关歌手。 */
export function setArtistFollow(id: number, follow: boolean): Promise<{ id: number; followed: boolean }> {
  return request.post<{ id: number; followed: boolean }>(ArtistApiPath.Follow, { id, follow })
}

/** MV 详情（含各清晰度可播 URL）。 */
export function getMvDetail(id: number, signal?: AbortSignal): Promise<NcmMvDetailDTO> {
  return request.get<NcmMvDetailDTO>(`${ArtistApiPath.MvDetail}?id=${id}`, signal)
}
