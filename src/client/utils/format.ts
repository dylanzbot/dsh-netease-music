/* 浏览器侧展示格式化工具。 */

/** 数字缩写：12345 → 1.2万，123456789 → 1.2亿。 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value >= 100_000_000) {
    const n = value / 100_000_000
    return `${trimZero(n)}亿`
  }
  if (value >= 10_000) {
    const n = value / 10_000
    return `${trimZero(n)}万`
  }
  return String(Math.round(value))
}

/** 保留一位小数，整数则去掉 .0。 */
function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

/** 毫秒时长 → m:ss。 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '--:--'
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** 秒 → m:ss（用于播放进度 / 视频时间；非法或负数返回 0:00）。 */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

/** 毫秒时间戳 → YYYY-MM-DD；非法 / 0 返回空串。 */
export function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ''
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 性别文案。 */
export function genderLabel(gender: number): string {
  if (gender === 1) return '男'
  if (gender === 2) return '女'
  return '未知'
}

/** 分钟 → 可读听歌时长：45 分钟、1.2 小时。 */
export function formatListenMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 分钟'
  if (minutes < 60) return `${Math.round(minutes)} 分钟`
  return `${trimZero(minutes / 60)} 小时`
}

/** 秒 → 可读听歌时长（小时，保留一位小数）。 */
export function formatListenSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 小时'
  return `${trimZero(seconds / 3600)} 小时`
}

/** 分钟数值（去掉多余小数）用于统计卡片。 */
export function formatListenMinutesValue(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0'
  return trimZero(minutes)
}

/** 秒 → 小时数值（去掉多余小数）用于统计卡片。 */
export function formatListenHoursValue(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0'
  return trimZero(seconds / 3600)
}
