/* 统一播放按钮。 */

import type { MouseEvent } from 'react'
import { NcmPauseIcon, NcmPlayIcon } from './icons.js'
import './play-button.css'

/** 播放按钮场景。 */
export type NcmPlayButtonScene = 'player' | 'cover' | 'row'

/** 播放按钮 props。 */
export interface NcmPlayButtonProps {
  /** 场景（决定尺寸 / 配色 / 显隐规则）。 */
  readonly scene: NcmPlayButtonScene
  /** 点击。 */
  readonly onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  /** 是否处于播放中：`player` 场景会显示暂停图标，其他场景忽略。 */
  readonly playing?: boolean
  /** 是否加载中：显示转圈并禁用点击。 */
  readonly loading?: boolean
  /** 是否禁用。 */
  readonly disabled?: boolean
  /** 无障碍文案（默认按 playing 自动取「播放 / 暂停」）。 */
  readonly label?: string
  /** 图标尺寸；不传用各场景默认值。 */
  readonly iconSize?: number
}

/** 各场景的默认图标尺寸。 */
const DEFAULT_ICON_SIZE: Record<NcmPlayButtonScene, number> = {
  player: 17,
  cover: 18,
  row: 12,
}

/** 统一播放按钮。 */
export function NcmPlayButton({
  scene,
  onClick,
  playing = false,
  loading = false,
  disabled = false,
  label,
  iconSize,
}: NcmPlayButtonProps) {
  const isDisabled = disabled || loading
  const size = iconSize ?? DEFAULT_ICON_SIZE[scene]

  // player 场景支持「暂停」态；cover / row 只表示「播放」。
  const showPause = scene === 'player' && playing
  const ariaLabel = label ?? (showPause ? '暂停' : '播放')

  return (
    <button
      type="button"
      className={`ncm-play-button ncm-play-button--${scene}${showPause ? ' ncm-play-button--paused' : ''}`}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={onClick}
    >
      {loading ? (
        <span className="ncm-play-button__spinner" aria-hidden="true" />
      ) : showPause ? (
        <NcmPauseIcon size={size} />
      ) : (
        <NcmPlayIcon size={size} />
      )}
    </button>
  )
}
