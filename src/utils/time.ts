/**
 * 共享的时间 / 日期纯函数（宿主 / 浏览器通用）。
 *
 * @module @dylanzbot/dsh-netease-music/utils/time
 */

import { MS_PER_DAY } from '../constants/time.js'

/**
 * 从「起始时间戳」算到现在的天数（向下取整，最小 1）。
 * 时间戳非法 / 小于等于 0 时返回 0。
 */
export function daysSince(timestamp: number): number {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0
  return Math.max(1, Math.floor((Date.now() - timestamp) / MS_PER_DAY))
}
