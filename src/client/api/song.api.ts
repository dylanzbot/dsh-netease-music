/* 歌曲接口（浏览器侧）：搜索、播放地址（含音质）、喜欢、首页推荐。 */

import type {
  NcmDiscoverDTO,
  NcmLibrarySearchDTO,
  NcmMultiSearchDTO,
  NcmQualityLevel,
  NcmSongDTO,
  SongQualityOptionVO,
  SongUrlResultDTO,
} from '../../types/index.js'
import { request } from '../utils/request.js'

/** 歌曲接口路径。 */
export enum SongApiPath {
  /** 搜索歌曲（全站）。 */
  Search = '/api/ncm/search',
  /** 多类型聚合搜索（单曲 / 歌手 / 专辑 / 歌单）。 */
  SearchMulti = '/api/ncm/search/multi',
  /** 搜索我的歌单 / 我的收藏。 */
  SearchLibrary = '/api/ncm/search/library',
  /** 获取歌曲播放地址。 */
  SongUrl = '/api/ncm/song/url',
  /** 我喜欢的音乐 ID 列表。 */
  SongLiked = '/api/ncm/song/liked',
  /** 喜欢 / 取消喜欢。 */
  SongLike = '/api/ncm/song/like',
  /** 首页推荐。 */
  Discover = '/api/ncm/discover',
}

/** 音质等级（与宿主 / 上游 level 对齐）。 */
export const SONG_QUALITY_LEVELS = {
  standard: 'standard',
  higher: 'higher',
  exhigh: 'exhigh',
  lossless: 'lossless',
  jyeffect: 'jyeffect',
  sky: 'sky',
  jymaster: 'jymaster',
  vivid: 'vivid',
} as const

/** 展示用音质列表（含会员档位，UI 据此置灰 / 打标签）。 */
export const SONG_QUALITY_OPTIONS: readonly SongQualityOptionVO[] = [
  { level: 'standard', label: '标准', desc: '128 kbps MP3', tier: 'free' },
  { level: 'higher', label: '较高', desc: '192 kbps MP3', tier: 'free' },
  { level: 'exhigh', label: '极高', desc: '320 kbps MP3', tier: 'vip' },
  { level: 'lossless', label: '无损', desc: 'FLAC 无损', tier: 'vip' },
  { level: 'jyeffect', label: '高清臻音', desc: '96 kHz / 24 bit 空间音频', tier: 'vip' },
  { level: 'sky', label: '沉浸环绕声', desc: '最高 5.1 声道', tier: 'svip' },
  { level: 'jymaster', label: '超清母带', desc: '192 kHz / 24 bit', tier: 'svip' },
  { level: 'vivid', label: '臻音全景声', desc: '三维空间音频 7.1.4', tier: 'svip' },
]

/** 默认音质：极高 320 kbps（与宿主侧默认值一致）。 */
export const DEFAULT_SONG_QUALITY: NcmQualityLevel = 'exhigh'

/** 搜索我的歌单 / 我的收藏。 */
export function searchLibrary(keywords: string, signal?: AbortSignal): Promise<NcmLibrarySearchDTO> {
  return request.get<NcmLibrarySearchDTO>(`${SongApiPath.SearchLibrary}?keywords=${encodeURIComponent(keywords)}`, signal)
}

/** 搜索歌曲（全站）。 */
export function searchSongs(keywords: string, signal?: AbortSignal): Promise<NcmSongDTO[]> {
  return request.get<NcmSongDTO[]>(`${SongApiPath.Search}?keywords=${encodeURIComponent(keywords)}`, signal)
}

/** 多类型聚合搜索：一次返回单曲 / 歌手 / 专辑 / 歌单四组结果。 */
export function searchMulti(keywords: string, limit = 5, signal?: AbortSignal): Promise<NcmMultiSearchDTO> {
  const params = new URLSearchParams({ keywords, limit: String(limit) })
  return request.get<NcmMultiSearchDTO>(`${SongApiPath.SearchMulti}?${params.toString()}`, signal)
}

/** 获取歌曲播放地址；level 指定音质，不传则由宿主使用默认音质。 */
export function getSongUrl(id: number, level?: NcmQualityLevel, signal?: AbortSignal): Promise<SongUrlResultDTO> {
  const query = level !== undefined ? `&level=${encodeURIComponent(level)}` : ''
  return request.get<SongUrlResultDTO>(`${SongApiPath.SongUrl}?id=${id}${query}`, signal)
}

/** 读取「我喜欢的音乐」歌曲 ID 列表。 */
export function getLikedSongIds(signal?: AbortSignal): Promise<number[]> {
  return request.get<number[]>(SongApiPath.SongLiked, signal)
}

/** 喜欢 / 取消喜欢一首歌。 */
export function setSongLike(id: number, like: boolean): Promise<{ liked: boolean }> {
  return request.post<{ liked: boolean }>(SongApiPath.SongLike, { id, like })
}

/** 首页推荐。 */
export function getDiscover(signal?: AbortSignal): Promise<NcmDiscoverDTO> {
  return request.get<NcmDiscoverDTO>(SongApiPath.Discover, signal)
}
