/**
 * 浏览器侧播放器状态类型。
 *
 * @module @dylanzbot/dsh-netease-music/types/player
 */

import type { NcmQualityLevel, NcmSongDTO } from './song.js'

/** 歌曲不可播放原因。 */
export type PlaybackUnavailableReason = 'vip' | 'copyright'

/** 当前音源的真实信息（上游实际返回，用于验证是否真的拿到了高码率）。 */
export interface NcmStreamInfoVO {
  readonly br: number
  readonly type: string
  readonly level: string
}

/** 播放器状态。 */
export interface NcmPlayerStateVO {
  readonly current: NcmSongDTO | null
  readonly queue: readonly NcmSongDTO[]
  readonly index: number
  readonly playing: boolean
  readonly loading: boolean
  readonly currentTime: number
  readonly duration: number
  readonly volume: number
  readonly muted: boolean
  readonly shuffle: boolean
  readonly hasVip: boolean
  /** 是否黑胶超级会员（vipType >= 110）。 */
  readonly isSvip: boolean
  /** 当前选择的音质等级。 */
  readonly quality: NcmQualityLevel
  /** 当前音源实际信息；尚未播放时为 null。 */
  readonly stream: NcmStreamInfoVO | null
  /** 当前歌曲的评论总数（拉取失败为 null）。 */
  readonly commentCount: number | null
  /** 「我喜欢的音乐」歌曲 ID 列表（登录后加载）。 */
  readonly likedIds: readonly number[]
  /** 正在提交喜欢 / 音质操作。 */
  readonly busy: boolean
  readonly error: string | null
  /** 已知无法播放的歌曲：songId → 原因。 */
  readonly unavailable: Readonly<Record<number, PlaybackUnavailableReason>>
}
