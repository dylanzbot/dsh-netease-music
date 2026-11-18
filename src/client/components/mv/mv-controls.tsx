/* MV 播放器控制栏（自绘，替代原生 `<video controls>`）。 */

import { type ChangeEvent } from 'react'
import { MV_QUALITY_LABEL, type MvQuality } from '../../utils/mv.js'
import { formatClock } from '../../utils/format.js'
import {
  NcmDownloadIcon,
  NcmExitFullscreenIcon,
  NcmFullscreenIcon,
  NcmPauseIcon,
  NcmPipIcon,
  NcmPlayIcon,
  NcmSpeedIcon,
  NcmVolumeIcon,
  NcmVolumeMutedIcon,
} from '../base/icons.js'
import { NcmPopover } from '../base/popover.js'
import './mv-controls.css'

/** 当前打开的浮层菜单。 */
export type MvControlMenu = 'quality' | 'speed' | null

/** 播放速度档位。 */
export const MV_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

/** 控制栏 props。 */
export interface NcmMvControlsProps {
  readonly paused: boolean
  readonly currentTime: number
  readonly duration: number
  readonly volume: number
  readonly muted: boolean
  readonly speed: number
  readonly quality: MvQuality | null
  /** 当前可用清晰度档位（全屏时才展示切换入口）。 */
  readonly qualityOptions: readonly MvQuality[]
  readonly fullscreen: boolean
  readonly hasPip: boolean
  readonly menu: MvControlMenu
  /** 非全屏音量竖条弹层是否展开。 */
  readonly volumeOpen: boolean

  readonly onTogglePlay: () => void
  readonly onSeek: (event: ChangeEvent<HTMLInputElement>) => void
  readonly onVolume: (event: ChangeEvent<HTMLInputElement>) => void
  readonly onToggleMute: () => void
  readonly onChangeQuality: (quality: MvQuality) => void
  readonly onChangeSpeed: (speed: number) => void
  readonly onTogglePip: () => void
  readonly onToggleFullscreen: () => void
  readonly onDownload: () => void
  /** 切换清晰度 / 倍速菜单（传目标菜单，null 关闭）。 */
  readonly onToggleMenu: (menu: MvControlMenu) => void
  /** 显示音量竖条（hover 进入图标）。 */
  readonly onRevealVolume: () => void
  /** 延迟关闭音量竖条（hover 离开图标）。 */
  readonly onScheduleHideVolume: () => void
}

/** MV 控制栏。 */
export function NcmMvControls({
  paused,
  currentTime,
  duration,
  volume,
  muted,
  speed,
  quality,
  qualityOptions,
  fullscreen,
  hasPip,
  menu,
  volumeOpen,
  onTogglePlay,
  onSeek,
  onVolume,
  onToggleMute,
  onChangeQuality,
  onChangeSpeed,
  onTogglePip,
  onToggleFullscreen,
  onDownload,
  onToggleMenu,
  onRevealVolume,
  onScheduleHideVolume,
}: NcmMvControlsProps) {
  const volumePercent = Math.round((muted ? 0 : volume) * 100)

  return (
    <div className="ncm-mv-controls">
      <div className="ncm-mv-controls__progress-row">
        <input
          type="range"
          className="ncm-mv-controls__progress"
          aria-label="播放进度"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={onSeek}
          style={{ backgroundSize: `${duration > 0 ? (currentTime / duration) * 100 : 0}% 100%` }}
        />
      </div>
      <div className="ncm-mv-controls__bar-row">
        {/* 左：播放/暂停 + 时间 + 音量 */}
        <button type="button" className="ncm-mv-controls__btn" aria-label={paused ? '播放' : '暂停'} onClick={onTogglePlay}>
          {paused ? <NcmPlayIcon size={18} /> : <NcmPauseIcon size={18} />}
        </button>
        <span className="ncm-mv-controls__time">
          {formatClock(currentTime)} / {formatClock(duration)}
        </span>
        <div className="ncm-mv-controls__volume">
          {fullscreen ? (
            /* 全屏：横条常驻可直接拖。 */
            <>
              <button type="button" className="ncm-mv-controls__btn" aria-label={muted ? '取消静音' : '静音'} onClick={onToggleMute}>
                {muted || volume === 0 ? <NcmVolumeMutedIcon size={18} /> : <NcmVolumeIcon size={18} />}
              </button>
              <input
                type="range"
                className="ncm-mv-controls__volume-range"
                aria-label="音量"
                title={`音量 ${volumePercent}%`}
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={onVolume}
                style={{ backgroundSize: `${(muted ? 0 : volume) * 100}% 100%` }}
              />
            </>
          ) : (
            /* 非全屏：与播放栏一致，hover 弹出竖条。 */
            <div className="ncm-mv-controls__volume-pop" onMouseEnter={onRevealVolume} onMouseLeave={onScheduleHideVolume}>
              <button type="button" className="ncm-mv-controls__btn" aria-label={muted ? '取消静音' : '静音'} onClick={onToggleMute}>
                {muted || volume === 0 ? <NcmVolumeMutedIcon size={18} /> : <NcmVolumeIcon size={18} />}
              </button>
              <NcmPopover
                open={volumeOpen}
                onClose={() => onScheduleHideVolume()}
                className="ncm-mv-controls__volume-menu"
                role="dialog"
                ariaLabel="音量调节"
                closeOnOutsideClick={false}
                closeOnEscape={false}
              >
                <input
                  type="range"
                  className="ncm-mv-controls__volume-vertical"
                  aria-label="音量"
                  aria-orientation="vertical"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={onVolume}
                />
              </NcmPopover>
            </div>
          )}
        </div>

        <div className="ncm-mv-controls__spacer" />

        {/* 右：清晰度 + 倍速（仅全屏时提供）+ 画中画 + 下载 + 全屏 */}
        {fullscreen ? (
          <>
            <div className="ncm-mv-controls__menu-anchor">
              <button
                type="button"
                className="ncm-mv-controls__btn ncm-mv-controls__ctrl-text"
                aria-label="清晰度"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleMenu(menu === 'quality' ? null : 'quality')
                }}
              >
                {quality !== null ? MV_QUALITY_LABEL[quality] : '清晰度'}
              </button>
              {menu === 'quality' && qualityOptions.length > 1 ? (
                <div className="ncm-mv-controls__menu" role="menu" aria-label="清晰度">
                  {qualityOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-checked={option === quality}
                      className={`ncm-mv-controls__menu-item${option === quality ? ' ncm-mv-controls__menu-item--active' : ''}`}
                      onClick={() => onChangeQuality(option)}
                    >
                      {MV_QUALITY_LABEL[option]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="ncm-mv-controls__menu-anchor">
              <button
                type="button"
                className="ncm-mv-controls__btn ncm-mv-controls__speed-btn"
                aria-label="播放速度"
                title={`播放速度 ${speed}x`}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleMenu(menu === 'speed' ? null : 'speed')
                }}
              >
                <NcmSpeedIcon size={18} />
              </button>
              {menu === 'speed' ? (
                <div className="ncm-mv-controls__menu" role="menu" aria-label="播放速度">
                  {MV_SPEEDS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-checked={option === speed}
                      className={`ncm-mv-controls__menu-item${option === speed ? ' ncm-mv-controls__menu-item--active' : ''}`}
                      onClick={() => onChangeSpeed(option)}
                    >
                      {option}x
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {hasPip ? (
          <button type="button" className="ncm-mv-controls__btn ncm-mv-controls__pip-btn" aria-label="画中画" onClick={onTogglePip}>
            <NcmPipIcon size={18} />
          </button>
        ) : null}

        {/* MV 下载按钮已注释停用：
        <button
          type="button"
          className="ncm-mv-controls__btn ncm-mv-controls__download-btn"
          aria-label="下载当前清晰度"
          title="下载当前清晰度"
          onClick={onDownload}
        >
          <NcmDownloadIcon size={18} />
        </button>
        */}

        <button
          type="button"
          className="ncm-mv-controls__btn ncm-mv-controls__fullscreen-btn"
          aria-label={fullscreen ? '退出全屏' : '全屏'}
          onClick={onToggleFullscreen}
        >
          {fullscreen ? <NcmExitFullscreenIcon size={18} /> : <NcmFullscreenIcon size={18} />}
        </button>
      </div>
    </div>
  )
}
