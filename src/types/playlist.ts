/**
 * 歌单相关类型。
 *
 * @module @dylanzbot/dsh-netease-music/types/playlist
 */

/** 一张歌单卡片（我的歌单 / 我的收藏 / 首页推荐共用）。 */
export interface NcmPlaylistCardDTO {
  readonly id: number
  readonly name: string
  readonly coverUrl: string
  readonly trackCount: number
  readonly playCount: number
  readonly specialType: number
  readonly creatorId: number
  readonly creatorName: string
  /** 是否已收藏（别人创建、自己订阅的歌单为 true；自己创建的歌单为 false/undefined）。 */
  readonly subscribed?: boolean
  /** 歌单创建时间（毫秒时间戳；上游无则为 0）。 */
  readonly createTime: number
  /** 歌单标签（如 ["影视原声"]；无标签为空数组）。 */
  readonly tags: readonly string[]
  /** 歌单简介（无简介为空串）。 */
  readonly description: string
}

/** 「我的」页面的歌单（只含歌单，不含资料 / 会员 / 徽章 / 听歌统计）。 */
export interface NcmMyPlaylistsDTO {
  readonly liked: NcmPlaylistCardDTO | null
  readonly playlists: readonly NcmPlaylistCardDTO[]
  readonly collections: readonly NcmPlaylistCardDTO[]
}
