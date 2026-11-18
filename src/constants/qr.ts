/**
 * 扫码登录的可见状态（宿主和浏览器共用）。
 *
 * @module @dylanzbot/dsh-netease-music/constants/qr
 */

/** 扫码登录状态取值。 */
export const QR_STATE = {
  WAITING: 'waiting',
  SCANNED: 'scanned',
  EXPIRED: 'expired',
  CONFIRMED: 'confirmed',
  ERROR: 'error',
} as const

/** 扫码登录状态类型。 */
export type QrState = (typeof QR_STATE)[keyof typeof QR_STATE]
