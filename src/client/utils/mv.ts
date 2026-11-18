/* MV 清晰度（档位）相关纯函数。 */

import type { NcmMvUrlsDTO } from '../../types/index.js'

/** 档位顺序（从低到高）。 */
export const MV_QUALITIES = ['240', '480', '720', '1080'] as const

/** MV 清晰度档位。 */
export type MvQuality = (typeof MV_QUALITIES)[number]

/** 档位展示标签。 */
export const MV_QUALITY_LABEL: Record<MvQuality, string> = {
  '240': '240P',
  '480': '480P',
  '720': '720P',
  '1080': '1080P',
}

/** 当前可用的档位（按低→高排序）。 */
export function availableMvQualities(urls: NcmMvUrlsDTO): MvQuality[] {
  return MV_QUALITIES.filter((quality) => typeof urls[quality] === 'string' && urls[quality] !== '')
}

/** 默认档位：优先 720p，缺失则回退到可用的最高档；无可用档位返回 null。 */
export function pickDefaultMvQuality(urls: NcmMvUrlsDTO): MvQuality | null {
  const available = availableMvQualities(urls)
  if (available.length === 0) return null
  if (available.includes('720')) return '720'
  return available[available.length - 1] ?? null
}
