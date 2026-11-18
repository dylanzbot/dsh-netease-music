/* 「正在播放」波动线条。 */

import './playing-bars.css'

/** 波动线条 props。 */
export interface NcmPlayingBarsProps {
  /** 是否正在播放；false 时暂停动画。 */
  readonly active?: boolean
  /** 额外 class。 */
  readonly className?: string
}

/** 正在播放的波动线条。 */
export function NcmPlayingBars({ active = true, className }: NcmPlayingBarsProps) {
  return (
    <span
      className={`ncm-playing-bars${active ? '' : ' ncm-playing-bars--paused'}${className !== undefined ? ` ${className}` : ''}`}
      role="img"
      aria-label={active ? '正在播放' : '已暂停'}
    >
      <i className="ncm-playing-bars__bar" />
      <i className="ncm-playing-bars__bar" />
      <i className="ncm-playing-bars__bar" />
      <i className="ncm-playing-bars__bar" />
    </span>
  )
}
