/* 音量调节浮层（基于通用 NcmPopover）。 */

import { useEffect, useRef, useState } from 'react'
import { NcmVolumeIcon, NcmVolumeMutedIcon } from '../base/icons.js'
import { NcmPopover } from '../base/popover.js'
import './volume-popover.css'

/** 音量浮层 props。 */
export interface NcmVolumePopoverProps {
  readonly volume: number
  readonly muted: boolean
  readonly onToggleMute: () => void
  readonly onVolumeChange: (volume: number) => void
}

/** 音量调节浮层。 */
export function NcmVolumePopover({ volume, muted, onToggleMute, onVolumeChange }: NcmVolumePopoverProps) {
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const volumePercent = Math.round((muted ? 0 : volume) * 100)

  const show = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpen(true)
  }

  const hide = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 180)
  }

  // 拖出竖条/在弹层外松手时也要结束拖拽，避免音量提示残留。
  useEffect(() => {
    if (!dragging) return
    const finish = () => setDragging(false)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [dragging])

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
  }, [])

  return (
    <div className="ncm-volume-popover" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        className="ncm-player__icon-btn"
        aria-label={muted ? '取消静音' : '静音'}
        title={muted ? '取消静音' : '静音'}
        onClick={onToggleMute}
      >
        {muted ? <NcmVolumeMutedIcon size={17} /> : <NcmVolumeIcon size={17} />}
      </button>
      <NcmPopover
        open={open}
        onClose={() => setOpen(false)}
        className="ncm-volume-popover__pop"
        role="dialog"
        ariaLabel="音量调节"
        closeOnOutsideClick={false}
        closeOnEscape={false}
      >
        <span className="ncm-volume-popover__mark">100</span>
        <div className="ncm-volume-popover__slider-wrap">
          <input
            className="ncm-volume-popover__range"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            aria-label="音量"
            aria-orientation="vertical"
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            onBlur={() => setDragging(false)}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
          />
          {dragging ? (
            <span
              className="ncm-volume-popover__value"
              style={{ bottom: `calc(${Math.min(volumePercent, 82)}% + 14px)` }}
            >
              {volumePercent}
            </span>
          ) : null}
        </div>
        <span className="ncm-volume-popover__mark">0</span>
      </NcmPopover>
    </div>
  )
}
