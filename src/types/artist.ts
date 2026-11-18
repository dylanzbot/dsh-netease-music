/**
 * 歌手 / 专辑 / MV 相关类型。
 *
 * @module @dylanzbot/dsh-netease-music/types/artist
 */

import type { NcmSongDTO } from './song.js'

/** 歌手卡片（歌手列表 / 搜索结果用）。 */
export interface NcmArtistCardDTO {
  readonly id: number
  readonly name: string
  /** 别名（如 "Jay Chou"、"周董"）；无则为空数组。 */
  readonly alias: readonly string[]
  /** 头像 URL（已升级 https）。 */
  readonly avatarUrl: string
  /** 单曲数。 */
  readonly musicSize: number
  /** 专辑数。 */
  readonly albumSize: number
  /** MV 数。 */
  readonly mvSize: number
  /** 粉丝数。 */
  readonly fansSize: number
  /** 当前登录用户是否已关注（未登录为 false）。 */
  readonly followed: boolean
}

/** 歌手详情（详情页头部）。 */
export interface NcmArtistDetailDTO {
  readonly id: number
  readonly name: string
  readonly alias: readonly string[]
  /** 译名（部分外文歌手有）。 */
  readonly trans: string
  /** 头像 URL（已升级 https）。 */
  readonly avatarUrl: string
  /** 简介全文（可能是多行文本）。 */
  readonly briefDesc: string
  readonly musicSize: number
  readonly albumSize: number
  readonly mvSize: number
  readonly followed: boolean
}

/** 歌手详情的聚合返回（详情 + 首页热门歌曲）。 */
export interface NcmArtistInfoDTO {
  readonly artist: NcmArtistDetailDTO
  /** 热门歌曲（默认前 50 首）。 */
  readonly hotSongs: readonly NcmSongDTO[]
}

/** 专辑卡片。 */
export interface NcmAlbumCardDTO {
  readonly id: number
  readonly name: string
  /** 封面 URL（已升级 https）。 */
  readonly coverUrl: string
  /** 发行时间（毫秒时间戳；无则为 0）。 */
  readonly publishTime: number
  /** 曲目数。 */
  readonly size: number
  /** 类型（专辑 / Single / EP 等）。 */
  readonly type: string
  /** 歌手名（搜索结果可透传，供专辑弹窗兜底展示）。 */
  readonly artistName?: string
}

/**
 * 专辑详情（弹窗「专辑介绍」区用）。
 *
 * 由 `/api/v1/album/{id}` 的 `album` 节点映射而来，比卡片多了歌手、
 * 子类型、发行公司和专辑介绍全文。
 */
export interface NcmAlbumDetailDTO {
  readonly id: number
  readonly name: string
  /** 封面 URL（已升级 https）。 */
  readonly coverUrl: string
  /** 歌手名（无则为空串，弹窗里回退用歌手详情页的名字）。 */
  readonly artistName: string
  /** 类型（专辑 / Single / EP 等）。 */
  readonly type: string
  /** 子类型（录音室版 / 现场版等；无则为空串）。 */
  readonly subType: string
  /** 发行公司（无则为空串）。 */
  readonly company: string
  /** 专辑介绍全文（可能多行；无则为空串）。 */
  readonly description: string
  /** 发行时间（毫秒时间戳；无则为 0）。 */
  readonly publishTime: number
  /** 曲目数。 */
  readonly size: number
}

/** 专辑详情聚合返回（介绍 + 歌曲，弹窗一次请求拿全）。 */
export interface NcmAlbumInfoDTO {
  /**
   * 专辑介绍；缺省表示宿主侧还是旧版本（该路由只返回 songs[]），
   * 此时弹窗用卡片数据兜底介绍区。
   */
  readonly album?: NcmAlbumDetailDTO
  readonly songs: readonly NcmSongDTO[]
}

/** MV 卡片。 */
export interface NcmMvCardDTO {
  readonly id: number
  readonly name: string
  /** 封面 URL（已升级 https）。 */
  readonly coverUrl: string
  /** 时长（毫秒）。 */
  readonly durationMs: number
  /** 播放次数。 */
  readonly playCount: number
  /** 歌手名。 */
  readonly artistName: string
}

/** MV 各清晰度档位 → 可直接播放的视频 URL（已升级 https；缺档位则不出现该键）。 */
export interface NcmMvUrlsDTO {
  readonly 240?: string
  readonly 480?: string
  readonly 720?: string
  readonly 1080?: string
}

/** MV 详情（弹窗 / 内联播放器用）。 */
export interface NcmMvDetailDTO {
  readonly id: number
  readonly name: string
  /** 歌手名。 */
  readonly artistName: string
  /** 封面 URL（已升级 https）。 */
  readonly coverUrl: string
  /** 简介纯文本（上游 desc，可能为空）。 */
  readonly desc: string
  /** 时长（毫秒）。 */
  readonly durationMs: number
  /** 播放次数。 */
  readonly playCount: number
  /** 发行时间（毫秒时间戳；无则为 0）。 */
  readonly publishTime: number
  /** 各清晰度可播放 URL；为空对象表示当前不可播放（受限 / 下架）。 */
  readonly urls: NcmMvUrlsDTO
}

/** 歌手列表一次性返回（含分页标志）。 */
export interface NcmArtistListDTO {
  readonly artists: readonly NcmArtistCardDTO[]
  /** 是否还有下一页。 */
  readonly more: boolean
}

/** 歌手搜索结果（带分页与总数）。 */
export interface NcmArtistSearchResultDTO {
  readonly artists: readonly NcmArtistCardDTO[]
  /** 命中的歌手总数。 */
  readonly total: number
  /** 是否还有下一页。 */
  readonly more: boolean
}

/** 歌手歌曲一次性返回（含分页标志）。 */
export interface NcmArtistSongsDTO {
  readonly songs: readonly NcmSongDTO[]
  /** 该歌手歌曲总数。 */
  readonly total: number
  /** 是否还有下一页。 */
  readonly more: boolean
}
