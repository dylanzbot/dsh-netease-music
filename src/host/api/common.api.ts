/**
 * 网易云上游接口共享基础（base URL、错误、原始类型、字段映射）。
 *
 * 各领域 api 文件（登录 / 账号 / 用户 / 歌单 / 歌曲）都从这里取公共件，
 * 避免互相 import 形成环。错误类型统一在 host/error 目录维护。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-common
 */

import type { NcmAlbumCardDTO, NcmPlaylistCardDTO, NcmSongDTO } from '../../types/index.js'
import { request } from '../utils/request.js'
import { NCM_BASE_URL } from '../../constants/ncm.js'

/** 网易云网页端 base URL（统一从 constants/ncm.ts 取）。 */
export { NCM_BASE_URL }

/** 网易云原始用户资料里本插件用到的字段（其余字段忽略）。 */
export interface RawProfile {
  readonly userId?: number
  readonly nickname?: string
  readonly avatarUrl?: string
  readonly backgroundUrl?: string
  readonly signature?: string
  readonly gender?: number
  readonly vipType?: number
  readonly follows?: number
  readonly followeds?: number
  readonly playlistCount?: number
  readonly createTime?: number
  readonly avatarDetail?: {
    readonly identityIconUrl?: string
    readonly identityLevel?: number
  } | null
  readonly allAuthTypes?: ReadonlyArray<{ readonly type?: number; readonly desc?: string }> | null
}

/** 歌单原始数据。 */
export interface RawPlaylist {
  readonly id?: number
  readonly name?: string
  readonly coverImgUrl?: string
  readonly picUrl?: string
  readonly trackCount?: number
  readonly playCount?: number
  readonly specialType?: number
  readonly subscribed?: boolean | null
  readonly creator?: { readonly userId?: number; readonly nickname?: string } | null
  readonly createTime?: number
  readonly tags?: readonly string[] | null
  readonly description?: string | null
}

/** 搜索/歌单详情里的歌曲原始数据。 */
export interface RawSearchSong {
  readonly id?: number
  readonly name?: string
  readonly ar?: ReadonlyArray<{ readonly id?: number; readonly name?: string }>
  readonly artists?: ReadonlyArray<{ readonly id?: number; readonly name?: string }>
  readonly al?: { readonly name?: string; readonly picUrl?: string }
  readonly album?: { readonly name?: string; readonly picUrl?: string }
  readonly dt?: number
  readonly duration?: number
  readonly fee?: number
  readonly noCopyrightRcmd?: unknown
}

/**
 * 常用图片尺寸档位（按前端实际显示尺寸 ×2 左右取，兼顾 Retina）。
 *
 * 网易云 `?param=WxH` 会把图片缩放 / 居中裁剪到精确 W×H，不拉伸变形，
 * 且压缩后体积通常只有原图的几十分之一（实测 2000×2000 原图 316KB →
 * `?param=200y200` 仅 7.7KB），缓存策略 `max-age=31536000` 保持不变。
 */
export const NCM_IMAGE_SIZE = {
  /** 100×100：评论头像、关注/粉丝头像、徽章与认证图标、歌曲封面、扫码登录头像。 */
  xs: '100y100',
  /** 200×200：歌手列表卡片头像、专辑封面卡片、我的 Hero 头像。 */
  sm: '200y200',
  /** 300×300：歌单封面卡片、歌手详情大头像。 */
  md: '300y300',
  /** 320×200：MV 封面卡片（16:10），保持比例避免二次裁切。 */
  mv: '320y200',
  /** 800×800：我的 Hero 模糊背景（大图但会模糊，无需原图）。 */
  hero: '800y800',
} as const

/** 图片 URL 统一升级成 https，避免页面是 https 时被混合内容拦截。上游偶发 null，一并兜住。 */
export function httpsUrl(raw: string | null | undefined): string {
  if (raw === undefined || raw === null || raw === '') return ''
  return raw.replace(/^http:\/\//, 'https://')
}

/** 只有网易云图片 CDN 的域名支持 `?param=` 裁剪，其他域名原样返回。 */
const NCM_IMAGE_HOST = /^https:\/\/[^/]*music\.126\.net\//

/**
 * 图片 URL 统一处理：http→https + 追加尺寸参数（省流量、消除加载闪烁）。
 *
 * 安全兜底：
 *   - 空串 / 非 `music.126.net` 域名（如第三方头像）只升级 https，不追加参数；
 *   - URL 已带 `param=` 时不重复追加；
 *   - 已有其他查询参数时用 `&` 拼接。
 */
export function imageUrl(raw: string | null | undefined, size?: string): string {
  const url = httpsUrl(raw)
  if (url === '' || size === undefined || size === '') return url
  if (!NCM_IMAGE_HOST.test(url)) return url
  if (/[?&]param=/.test(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}param=${size}`
}

/** 数字字段兜底。 */
export function numberOr(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** 映射歌单卡片。 */
export function mapPlaylist(raw: RawPlaylist): NcmPlaylistCardDTO {
  return {
    id: numberOr(raw.id),
    name: raw.name ?? '未命名歌单',
    coverUrl: imageUrl(raw.coverImgUrl ?? raw.picUrl, NCM_IMAGE_SIZE.md),
    trackCount: numberOr(raw.trackCount),
    playCount: numberOr(raw.playCount),
    specialType: numberOr(raw.specialType),
    creatorId: numberOr(raw.creator?.userId),
    creatorName: raw.creator?.nickname ?? '',
    subscribed: raw.subscribed === true,
    createTime: numberOr(raw.createTime),
    tags: (raw.tags ?? []).filter((tag) => tag !== ''),
    description: raw.description ?? '',
  }
}

/** 专辑卡片原始数据（歌手专辑列表 / 专辑搜索共用）。 */
export interface RawAlbumCard {
  readonly id?: number
  readonly name?: string
  readonly picUrl?: string
  readonly publishTime?: number
  readonly size?: number
  readonly type?: string
  readonly artist?: { readonly name?: string } | null
  readonly artists?: ReadonlyArray<{ readonly name?: string }> | null
}

/** 映射专辑卡片（歌手专辑列表 / 专辑搜索结果共用）。 */
export function mapAlbumCard(raw: RawAlbumCard): NcmAlbumCardDTO {
  return {
    id: numberOr(raw.id),
    name: raw.name ?? '未知专辑',
    coverUrl: imageUrl(raw.picUrl, NCM_IMAGE_SIZE.sm),
    publishTime: numberOr(raw.publishTime),
    size: numberOr(raw.size),
    type: raw.type ?? '',
    artistName: raw.artist?.name ?? raw.artists?.[0]?.name ?? '',
  }
}

/** 映射歌曲。 */
export function mapSong(raw: RawSearchSong): NcmSongDTO {  const rawArtists = raw.ar ?? raw.artists ?? []
  // 名称与 id 同步过滤，保证 artistIds 与 artists 一一对应。
  const pairs = rawArtists
    .map((artist) => ({ id: numberOr(artist.id), name: artist.name ?? '' }))
    .filter((pair) => pair.name !== '')
  const album = raw.al ?? raw.album
  return {
    id: numberOr(raw.id),
    name: raw.name ?? '未知歌曲',
    artists: pairs.map((pair) => pair.name),
    artistIds: pairs.map((pair) => pair.id),
    album: album?.name ?? '',
    durationMs: numberOr(raw.dt ?? raw.duration),
    coverUrl: imageUrl(album?.picUrl, NCM_IMAGE_SIZE.xs),
    fee: numberOr(raw.fee),
    ...(raw.noCopyrightRcmd != null ? { noCopyright: true } : {}),
  }
}

/** 通用 GET（带 Cookie + Referer）。 */
export function getNcm(path: string, cookie: string, signal?: AbortSignal) {
  return request.getJson(`${NCM_BASE_URL}${path}`, {
    cookie,
    signal,
    headers: { referer: `${NCM_BASE_URL}/` },
  })
}

/** 通用 POST form（带 Cookie + Referer）。 */
export function postNcm(path: string, params: Record<string, string>, cookie: string, signal?: AbortSignal) {
  return request.postForm(`${NCM_BASE_URL}${path}`, params, {
    cookie,
    signal,
    headers: { referer: `${NCM_BASE_URL}/` },
  })
}
