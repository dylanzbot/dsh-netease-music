/**
 * 歌手 / 专辑 / MV 相关上游接口。
 *
 * 和 song.api.ts 一样，这里只管「调哪个上游接口、怎么把原始字段映射成
 * DTO」，不写业务规则（登录态判断、缓存等放在 services/artist.service.ts）。
 *
 * 上游接口（均已实测可用）：
 *   - GET  /api/artist/top?offset=&limit=                   热门歌手榜（分类浏览接口已被上游关停，改用它）
 *   - POST /api/cloudsearch/pc  type=100                   搜索 / 按首字母关键词浏览歌手（可分页）
 *   - GET  /api/v1/artist/{id}                             歌手详情 + 热门 50 首
 *   - GET  /api/v1/artist/songs?id=&order=&offset=&limit=  歌手歌曲（分页）
 *   - GET  /api/artist/albums/{id}?limit=&offset=          歌手专辑
 *   - GET  /api/v1/album/{id}                              专辑详情（介绍 + 歌曲）
 *   - GET  /api/artist/mvs?artistId=&limit=&offset=        歌手 MV 列表
 *   - GET  /api/mv/detail?id=&type=mp4                     MV 详情（data.brs 含各清晰度可播 URL）
 *   - eapi /api/artist/sub · /api/artist/unsub             关注 / 取关（明文已下线）
 *
 * 备注：网易云已关停公开的「歌手分类浏览」能力——`/api/artist/list` 的
 * area/type/cat 参数被服务端忽略（一律返回同一批热门），`initial` 传字母
 * 直接 400，`initial` 传 >0 数字全空，`/api/artist/top` 也硬限 100 位。
 * 因此列表页改为「热门榜首屏 + 首字母/关键词走搜索接口分页」的组合。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-artist
 */

import type {
  NcmAlbumCardDTO,
  NcmAlbumInfoDTO,
  NcmArtistCardDTO,
  NcmArtistInfoDTO,
  NcmArtistListDTO,
  NcmArtistSearchResultDTO,
  NcmArtistSongsDTO,
  NcmMvCardDTO,
  NcmMvDetailDTO,
  NcmMvUrlsDTO,
  NcmSongDTO,
} from '../../types/index.js'
import { eapiPostWithCookie } from '../utils/eapi.js'
import {
  getNcm,
  httpsUrl,
  imageUrl,
  mapAlbumCard,
  NCM_IMAGE_SIZE,
  mapSong,
  numberOr,
  postNcm,
  type RawAlbumCard,
  type RawSearchSong,
} from './common.api.js'
import { NcmApiError } from '../error/index.js'

/** 上游歌手原始字段（列表 / 搜索共用）。 */
interface RawArtist {
  readonly id?: number
  readonly name?: string
  readonly alias?: readonly string[] | null
  readonly alia?: readonly string[] | null
  readonly picUrl?: string
  readonly briefDesc?: string
  readonly trans?: string
  readonly musicSize?: number
  readonly albumSize?: number
  readonly mvSize?: number
  readonly fansSize?: number
  readonly followed?: boolean
}

/** 把上游歌手原始字段映射成 NcmArtistCardDTO。 */
function mapArtistCard(raw: RawArtist): NcmArtistCardDTO {
  return {
    id: numberOr(raw.id),
    name: raw.name ?? '未知歌手',
    alias: (raw.alias ?? raw.alia ?? []).filter((item) => typeof item === 'string' && item !== ''),
    avatarUrl: imageUrl(raw.picUrl, NCM_IMAGE_SIZE.sm),
    musicSize: numberOr(raw.musicSize),
    albumSize: numberOr(raw.albumSize),
    mvSize: numberOr(raw.mvSize),
    fansSize: numberOr(raw.fansSize),
    followed: raw.followed === true,
  }
}

/**
 * 热门歌手榜（默认列表页首屏数据）。
 *
 * 说明：网易云已关停公开的「歌手分类浏览」接口（/api/artist/list 的
 * area/type/cat 参数被服务端忽略，initial 传字母直接 400），这里改用
 * /api/artist/top（热门歌手榜，约 100 位，按热度排序）。
 */
export async function fetchTopArtists(
  offset: number,
  limit: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmArtistListDTO> {
  const size = Math.min(Math.max(limit, 1), 100)
  const params = new URLSearchParams({ offset: String(offset), limit: String(size) })
  const { body } = await getNcm(`/api/artist/top?${params.toString()}`, cookie, signal)
  const data = body as { code?: number; artists?: readonly RawArtist[]; more?: boolean }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '热门歌手接口返回失败')
  }
  return {
    artists: (data.artists ?? []).map(mapArtistCard),
    more: data.more === true,
  }
}

/**
 * 按关键词（含单个字母 / 汉字）搜索并分页浏览歌手（cloudsearch type=100）。
 *
 * 列表页的首字母筛选、搜索框都走这里：把字母 / 分类词作为关键词检索，
 * 既能翻页拿到大量真实歌手，也不会像旧分类接口那样报 400。
 */
export async function searchArtists(
  keywords: string,
  offset: number,
  limit: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmArtistSearchResultDTO> {
  const size = Math.min(Math.max(limit, 1), 100)
  const { body } = await postNcm(
    '/api/cloudsearch/pc',
    { s: keywords, type: '100', limit: String(size), offset: String(offset), total: 'true' },
    cookie,
    signal,
  )
  const data = body as {
    code?: number
    result?: { artists?: readonly RawArtist[] | null; artistCount?: number }
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '歌手搜索接口返回失败')
  }
  const artists = (data.result?.artists ?? []).map(mapArtistCard)
  const total = numberOr(data.result?.artistCount)
  const more = artists.length > 0 && offset + artists.length < total
  return { artists, total, more }
}

/** 歌手详情 + 热门歌曲（一次拿全，走 /api/v1/artist/{id}）。 */
export async function fetchArtistInfo(
  id: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmArtistInfoDTO> {
  const { body } = await getNcm(`/api/v1/artist/${id}`, cookie, signal)
  const data = body as {
    code?: number
    artist?: RawArtist
    hotSongs?: readonly RawSearchSong[] | null
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '歌手详情接口返回失败')
  }
  const raw = data.artist ?? {}
  return {
    artist: {
      id: numberOr(raw.id),
      name: raw.name ?? '未知歌手',
      alias: (raw.alias ?? raw.alia ?? []).filter((item) => typeof item === 'string' && item !== ''),
      trans: raw.trans ?? '',
      avatarUrl: imageUrl(raw.picUrl, NCM_IMAGE_SIZE.md),
      briefDesc: raw.briefDesc ?? '',
      musicSize: numberOr(raw.musicSize),
      albumSize: numberOr(raw.albumSize),
      mvSize: numberOr(raw.mvSize),
      followed: raw.followed === true,
    },
    hotSongs: (data.hotSongs ?? []).map(mapSong),
  }
}

/** 歌手歌曲（分页，order: hot 热门 / time 最新）。 */
export async function fetchArtistSongs(
  id: number,
  order: 'hot' | 'time',
  offset: number,
  limit: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmArtistSongsDTO> {
  const size = Math.min(Math.max(limit, 1), 100)
  const params = new URLSearchParams({
    id: String(id),
    order,
    offset: String(offset),
    limit: String(size),
  })
  const { body } = await getNcm(`/api/v1/artist/songs?${params.toString()}`, cookie, signal)
  const data = body as { code?: number; songs?: readonly RawSearchSong[] | null; total?: number; more?: boolean }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '歌手歌曲接口返回失败')
  }
  const songs: NcmSongDTO[] = (data.songs ?? []).map(mapSong)
  const total = numberOr(data.total)
  const more = data.more !== undefined ? data.more === true : offset + songs.length < total
  return { songs, total, more }
}

/** 歌手专辑列表。 */
export async function fetchArtistAlbums(
  id: number,
  limit: number,
  offset: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<{ albums: NcmAlbumCardDTO[]; more: boolean }> {
  const size = Math.min(Math.max(limit, 1), 100)
  const params = new URLSearchParams({ limit: String(size), offset: String(offset) })
  const { body } = await getNcm(`/api/artist/albums/${id}?${params.toString()}`, cookie, signal)
  const data = body as {
    code?: number
    hotAlbums?: readonly RawAlbumCard[] | null
    more?: boolean
    artist?: { albumSize?: number }
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '歌手专辑接口返回失败')
  }
  const albums: NcmAlbumCardDTO[] = (data.hotAlbums ?? []).map(mapAlbumCard)
  const total = numberOr(data.artist?.albumSize)
  const more = data.more !== undefined ? data.more === true : offset + albums.length < total
  return { albums, more }
}

/** 搜索专辑（cloudsearch type=10，可分页）。 */
export async function searchAlbums(
  keywords: string,
  offset: number,
  limit: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<{ albums: NcmAlbumCardDTO[]; total: number; more: boolean }> {
  const size = Math.min(Math.max(limit, 1), 100)
  const { body } = await postNcm(
    '/api/cloudsearch/pc',
    { s: keywords, type: '10', limit: String(size), offset: String(offset), total: 'true' },
    cookie,
    signal,
  )
  const data = body as {
    code?: number
    result?: { albums?: readonly RawAlbumCard[] | null; albumCount?: number }
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '专辑搜索接口返回失败')
  }
  const albums = (data.result?.albums ?? []).map(mapAlbumCard)
  const total = numberOr(data.result?.albumCount)
  const more = albums.length > 0 && offset + albums.length < total
  return { albums, total, more }
}

/** 上游专辑详情原始字段（`/api/v1/album/{id}` 的 `album` 节点）。 */
interface RawAlbumDetail {
  readonly id?: number
  readonly name?: string
  readonly picUrl?: string
  readonly type?: string
  readonly subType?: string
  readonly company?: string
  readonly description?: string | null
  readonly briefDesc?: string | null
  readonly publishTime?: number
  readonly size?: number
  readonly artist?: { readonly name?: string }
  readonly artists?: ReadonlyArray<{ readonly name?: string }> | null
}

/**
 * 专辑详情 + 歌曲（一次请求拿全，供专辑弹窗使用）。
 *
 * 上游同一个接口既返回 `songs[]`，也返回 `album` 节点（`description` 是专辑
 * 介绍全文、`company` / `subType` / `artist.name` 等是介绍区的补充信息）。
 * 老版本只映射 `songs[]`，这里把 `album` 也映射成 NcmAlbumDetailDTO。
 */
export async function fetchAlbumDetail(
  albumId: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmAlbumInfoDTO> {
  const { body } = await getNcm(`/api/v1/album/${albumId}`, cookie, signal)
  const data = body as {
    code?: number
    songs?: readonly RawSearchSong[] | null
    album?: RawAlbumDetail | null
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '专辑详情接口返回失败')
  }
  const raw = data.album ?? {}
  const artistName = raw.artist?.name ?? raw.artists?.find((item) => item.name !== undefined && item.name !== '')?.name ?? ''
  return {
    album: {
      id: numberOr(raw.id, albumId),
      name: raw.name ?? '未知专辑',
      coverUrl: imageUrl(raw.picUrl, NCM_IMAGE_SIZE.md),
      artistName,
      type: raw.type ?? '',
      subType: raw.subType ?? '',
      company: raw.company ?? '',
      description: raw.description ?? raw.briefDesc ?? '',
      publishTime: numberOr(raw.publishTime),
      size: numberOr(raw.size),
    },
    songs: (data.songs ?? []).map(mapSong),
  }
}

/**
 * MV 详情（内联播放器用）。
 *
 * 关键点：`/api/mv/detail` 的 `data.brs` 直接返回 240/480/720/1080 各档可播
 * URL（带 wsSecret/wsTime 签名）。这些 URL 是 http，需升级 https；且官方签名是
 * 强校验（改一个字符即 403），所以必须用接口现签的地址，不能自己拼。
 *
 * 注意：
 *   - 接口本身公开可访问（无 Cookie 也能取），但仍随插件统一要求登录；
 *   - MV 受限 / 下架时 `brs` 为空 → 这里返回空 urls，交由前端降级成「不可播放」。
 */
export async function fetchMvDetail(
  id: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmMvDetailDTO> {
  const { body } = await getNcm(`/api/mv/detail?id=${id}&type=mp4`, cookie, signal)
  const data = body as {
    code?: number
    data?: {
      id?: number
      name?: string
      artistName?: string
      cover?: string
      desc?: string
      duration?: number
      playCount?: number
      publishTime?: number
      brs?: Record<string, string> | null
    } | null
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, 'MV 详情接口返回失败')
  }
  const raw = data.data ?? {}
  const brs = raw.brs ?? {}
  const urls: { -readonly [K in keyof NcmMvUrlsDTO]: string } = {}
  for (const quality of ['240', '480', '720', '1080'] as const) {
    const source = brs[quality]
    if (typeof source === 'string' && source !== '') {
      urls[quality] = httpsUrl(source)
    }
  }
  return {
    id: numberOr(raw.id, id),
    name: raw.name ?? '未知 MV',
    artistName: raw.artistName ?? '',
    coverUrl: imageUrl(raw.cover, NCM_IMAGE_SIZE.mv),
    desc: raw.desc ?? '',
    durationMs: numberOr(raw.duration),
    playCount: numberOr(raw.playCount),
    publishTime: numberOr(raw.publishTime),
    urls,
  }
}

/** 歌手 MV 列表。 */
export async function fetchArtistMvs(
  id: number,
  limit: number,
  offset: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<{ mvs: NcmMvCardDTO[]; more: boolean }> {
  const size = Math.min(Math.max(limit, 1), 100)
  const params = new URLSearchParams({
    artistId: String(id),
    limit: String(size),
    offset: String(offset),
    total: 'true',
  })
  const { body } = await getNcm(`/api/artist/mvs?${params.toString()}`, cookie, signal)
  const data = body as {
    code?: number
    mvs?: ReadonlyArray<{
      id?: number
      name?: string
      cover?: string
      imgurl?: string
      duration?: number
      playCount?: number
      artistName?: string
    }> | null
    hasMore?: boolean
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '歌手 MV 接口返回失败')
  }
  const mvs: NcmMvCardDTO[] = (data.mvs ?? []).map((mv) => ({
    id: numberOr(mv.id),
    name: mv.name ?? '未知 MV',
    coverUrl: imageUrl(mv.cover ?? mv.imgurl, NCM_IMAGE_SIZE.mv),
    durationMs: numberOr(mv.duration),
    playCount: numberOr(mv.playCount),
    artistName: mv.artistName ?? '',
  }))
  return { mvs, more: data.hasMore === true }
}

/**
 * 关注 / 取消关注歌手（明文接口已下线，走 eapi sub/unsub，实测返回 200）。
 */
export async function setArtistFollow(
  id: number,
  follow: boolean,
  cookie: string,
  signal?: AbortSignal,
): Promise<void> {
  const path = follow ? '/api/artist/sub' : '/api/artist/unsub'
  const { body } = await eapiPostWithCookie(
    path,
    { artistId: String(id), artistIds: JSON.stringify([id]) },
    cookie,
    signal,
  )
  const data = body as { code?: number; message?: string }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, data.message ?? '歌手关注操作失败')
  }
}
