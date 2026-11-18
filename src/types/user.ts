/**
 * 用户 / 账号 / 关系相关类型。
 *
 * @module @dylanzbot/dsh-netease-music/types/user
 */

import type { NcmPlaylistCardDTO } from './playlist.js'

/** 徽章摘要。 */
export interface NcmBadgeSummaryDTO {
  /** 徽章总数。 */
  readonly count: number
  /** 最新/第一枚徽章图标（可选，作展示点缀）。 */
  readonly iconUrl?: string
  /** 最新/第一枚徽章名称。 */
  readonly name?: string
}

/** 用户资料。 */
export interface NcmProfileDTO {
  readonly userId: number
  readonly nickname: string
  readonly avatarUrl: string
  readonly backgroundUrl: string
  readonly signature: string
  /** 0 未知 / 1 男 / 2 女。 */
  readonly gender: number
  /** 用户等级。 */
  readonly level: number
  /** 累计听歌首数（上游只提供首数，没有小时数）。 */
  readonly listenSongs: number
  readonly follows: number
  readonly followeds: number
  readonly playlistCount: number
  readonly createTime: number
  /** 0 非会员；大于 0 为黑胶会员。 */
  readonly vipType: number
  /** 黑胶等级（上游 VIP 接口能给时才有）。 */
  readonly vipLevel?: number
  /** 黑胶等级名称（如「黑胶·壹」「V6」）。 */
  readonly vipLevelName?: string
  /** 徽章摘要（数量 / 第一枚徽章）。 */
  readonly badges?: NcmBadgeSummaryDTO
  /** 官方认证文案（如「网易云音乐官方账号」）。 */
  readonly authText?: string
  /** 官方认证图标。 */
  readonly authIconUrl?: string
}

/** 听歌统计（来自网易云听歌足迹）。 */
export interface NcmListenStatsDTO {
  /** 所有时间累计收听时长（秒）。 */
  readonly totalDurationSeconds?: number
  /** 最近一周收听时长（分钟）。 */
  readonly weekPlayMinutes?: number
  /** 最近一周有听歌的天数。 */
  readonly weekListenDays?: number
}

/** 「我的」页面数据。 */
export interface NcmMeDTO {
  readonly profile: NcmProfileDTO
  /** 我喜欢的音乐（特殊歌单）。 */
  readonly liked: NcmPlaylistCardDTO | null
  /** 自己创建的歌单（不含我喜欢的音乐）。 */
  readonly playlists: readonly NcmPlaylistCardDTO[]
  /** 收藏的歌单（别人创建、自己订阅的）。 */
  readonly collections: readonly NcmPlaylistCardDTO[]
  /** 听歌足迹统计（接口不可用时为 undefined）。 */
  readonly listenStats?: NcmListenStatsDTO
}

/** 关注 / 粉丝列表里的一个用户。 */
export interface NcmRelationUserDTO {
  readonly userId: number
  readonly nickname: string
  readonly avatarUrl: string
  /** 0 未知 / 1 男 / 2 女。 */
  readonly gender: number
  readonly signature: string
  /** 用户等级 LV。 */
  readonly level: number
  /** 0 非会员；大于 0 为黑胶会员。 */
  readonly vipType: number
  /** 黑胶会员等级（如 V6）。 */
  readonly vipLevel?: number
  /** 黑胶等级名称（如「黑胶·陆」）。 */
  readonly vipLevelName?: string
  /** 徽章数量。 */
  readonly badgeCount: number
  /** 我是否已关注该用户。 */
  readonly followed: boolean
  /** 是否互相关注。 */
  readonly mutual: boolean
  /** 关注/被关注时间戳（毫秒），0 表示未知。 */
  readonly relationTime: number
  /** 互相关注时间戳（毫秒），0 表示未知。 */
  readonly mutualTime: number
  /** 上游给的可读关注时长（如「9年153天」）。 */
  readonly followDayText?: string
  /** 上游给的可读互关时长（如「3年125天」）。 */
  readonly mutualFollowDayText?: string
}

/** 关注 / 粉丝列表结果。 */
export interface NcmRelationListDTO {
  readonly users: readonly NcmRelationUserDTO[]
  readonly more: boolean
}

/** 关注 / 粉丝弹窗类型。 */
export type NcmRelationKindVO = 'follows' | 'fans'

/** 用户关系操作类型（宿主与浏览器共用：'follow' | 'unfollow' | 'remove-fan'）。 */
export type NcmRelationAction = 'follow' | 'unfollow' | 'remove-fan'

/** 登录态探测结果。 */
export interface NcmAuthStatusDTO {
  readonly loggedIn: boolean
}

/** 插件设置。 */
export interface NcmSettingsDTO {
  /** 是否在「我的」Hero 中显示关注 / 粉丝数量。 */
  readonly showFollowStats: boolean
}
