/**
 * 歌曲 / 歌单评论类型。
 *
 * @module @dylanzbot/dsh-netease-music/types/comment
 */

/** 被回复的那条评论（楼中楼引用）。 */
export interface NcmQuotedCommentDTO {
  readonly userId: number
  readonly nickname: string
  readonly content: string
}

/** 一条评论。 */
export interface NcmCommentDTO {
  readonly commentId: number
  /** 评论所属对象串（如 R_SO_4_{songId}），点赞接口需要。 */
  readonly threadId: string
  readonly content: string
  readonly likedCount: number
  /** 当前登录用户是否已赞。 */
  readonly liked: boolean
  /** 时间戳（毫秒）。 */
  readonly time: number
  /** 上游给的格式化时间（如「2021-04-10」）。 */
  readonly timeText: string
  /** IP 归属地（部分评论有）。 */
  readonly location?: string
  readonly user: {
    readonly userId: number
    readonly nickname: string
    readonly avatarUrl: string
    readonly vipType: number
    /** 当前登录用户是否已关注该评论者。 */
    readonly followed: boolean
  }
  /** 楼中楼引用的上一条评论。 */
  readonly quoted?: NcmQuotedCommentDTO
  /** 该评论下的回复数。 */
  readonly replyCount: number
}

/** 一页评论。 */
export interface NcmCommentPageDTO {
  /** 总评论数。 */
  readonly total: number
  /** 是否还有下一页。 */
  readonly more: boolean
  readonly comments: readonly NcmCommentDTO[]
}

/** 评论对象类型：歌曲 / 歌单等。 */
export type NcmCommentResourceType = 'song' | 'playlist'
