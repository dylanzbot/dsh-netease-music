/**
 * 歌曲 / 搜索 / 推荐相关类型。
 *
 * @module @dylanzbot/dsh-netease-music/types/song
 */

import type { NcmPlaylistCardDTO } from './playlist.js'

/** 搜索 / 推荐里的一首歌。 */
export interface NcmSongDTO {
  readonly id: number
  readonly name: string
  readonly artists: readonly string[]
  /** 歌手 ID 列表（与 artists 一一对应；用于点击歌手名跳转歌手详情）。 */
  readonly artistIds: readonly number[]
  readonly album: string
  readonly durationMs: number
  readonly coverUrl: string
  /** 0 免费 / 1 VIP / 8 等，仅用于展示提示。 */
  readonly fee: number
  /** 上游 `noCopyrightRcmd` 非空：无版权 / 不可播放。 */
  readonly noCopyright?: boolean
}

/** 歌曲库搜索结果条目（歌曲 + 来源歌单）。 */
export interface NcmLibrarySearchItemDTO {
  readonly song: NcmSongDTO
  readonly playlist: NcmPlaylistCardDTO
}

/** 我的歌单 / 我的收藏 分组搜索结果。 */
export interface NcmLibrarySearchDTO {
  readonly mine: readonly NcmLibrarySearchItemDTO[]
  readonly collections: readonly NcmLibrarySearchItemDTO[]
}

/** 首页推荐数据。 */
export interface NcmDiscoverDTO {
  readonly playlists: readonly NcmPlaylistCardDTO[]
  readonly newSongs: readonly NcmSongDTO[]
}

/** 可请求的音质等级（对齐网易云 song/enhance/player/url/v1）。 */
export type NcmQualityLevel =
  | 'standard'
  | 'higher'
  | 'exhigh'
  | 'lossless'
  | 'jyeffect'
  | 'sky'
  | 'jymaster'
  | 'vivid'

/** 音质档位权限：free 免费 / vip 黑胶会员 / svip 黑胶超级会员。 */
export type NcmQualityTier = 'free' | 'vip' | 'svip'

/** 音质选项（供 UI 展示）。 */
export interface SongQualityOptionVO {
  readonly level: NcmQualityLevel
  readonly label: string
  readonly desc: string
  readonly tier: NcmQualityTier
}

/** 歌曲播放地址返回（含上游实际给的码率 / 格式，便于 UI 校验）。 */
export interface SongUrlResultDTO {
  readonly url: string
  readonly br: number
  readonly type: string
  readonly size: number
  /** 上游实际返回的音质等级（可能因为版权 / 会员 / 曲库回退）。 */
  readonly level: string
}
