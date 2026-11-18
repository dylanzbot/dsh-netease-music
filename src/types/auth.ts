/**
 * 登录 / 扫码相关类型。
 *
 * @module @dylanzbot/dsh-netease-music/types/auth
 */

import type { QrState } from '../constants/qr.js'

/** 发起二维码登录返回的 value。 */
export interface QrStartValueDTO {
  readonly key: string
  readonly qrUrl: string
  /** 二维码图片 data URL，直接塞给 <img src>。 */
  readonly qrImage: string
}

/** 轮询扫码结果的状态。 */
export type QrCheckStateDTO = QrState

/** 轮询扫码结果返回的 value。 */
export interface QrCheckValueDTO {
  readonly state: QrCheckStateDTO
  readonly nickname?: string
  readonly avatarUrl?: string
  readonly message?: string
}
