/* 音质切换浮层（基于通用 NcmPopover）。 */

import type { NcmQualityLevel, NcmStreamInfoVO, SongQualityOptionVO } from '../../../types/index.js'
import { useRef, useState } from 'react'
import { SONG_QUALITY_OPTIONS } from '../../api/song.api.js'
import { formatStream, qualityLabel, qualityLabelOf } from '../../player/engine.js'
import { NcmHintPopover } from '../base/hint-popover.js'
import { NcmPopover } from '../base/popover.js'
import { NcmSvipTag, NcmVipTag } from '../base/tags.js'
import './quality-popover.css'

/** 音质浮层 props。 */
export interface NcmQualityPopoverProps {
  readonly quality: NcmQualityLevel
  readonly busy: boolean
  readonly hasVip: boolean
  readonly isSvip: boolean
  readonly stream: NcmStreamInfoVO | null
  /** 选择音质。 */
  readonly onSelect: (level: NcmQualityLevel) => void
}

/** 音质切换浮层。 */
export function NcmQualityPopover({ quality, busy, hasVip, isSvip, stream, onSelect }: NcmQualityPopoverProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  // 按钮配色跟随当前档位的会员等级（与 NcmVipTag / NcmSvipTag 一致）
  const tier = SONG_QUALITY_OPTIONS.find((option) => option.level === quality)?.tier ?? 'free'

  return (
    <div className="ncm-quality-popover" ref={wrapRef}>
      <button
        type="button"
        className={`ncm-quality-popover__chip ncm-quality-popover__trigger ncm-quality-popover__trigger--${tier}${open ? ' ncm-quality-popover__trigger--open' : ''}`}
        title="切换播放音质"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        {qualityLabel(quality)}
      </button>
      <NcmPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={wrapRef}
        className="ncm-quality-popover__pop"
        role="menu"
        ariaLabel="播放音质"
        style={{ right: 22, bottom: 'var(--ncm-player-pop-bottom, 104px)' }}
      >
        <NcmQualityMenu
          quality={quality}
          busy={busy}
          hasVip={hasVip}
          isSvip={isSvip}
          stream={stream}
          onSelect={(level) => {
            setOpen(false)
            onSelect(level)
          }}
        />
      </NcmPopover>
    </div>
  )
}

/** 判断某档位是否已达权限。 */
function isLocked(option: SongQualityOptionVO, hasVip: boolean, isSvip: boolean): boolean {
  if (option.tier === 'svip') return !isSvip
  if (option.tier === 'vip') return !hasVip
  return false
}

/** 音质选项菜单内容。 */
function NcmQualityMenu({
  quality,
  busy,
  hasVip,
  isSvip,
  stream,
  onSelect,
}: {
  quality: NcmQualityLevel
  busy: boolean
  hasVip: boolean
  isSvip: boolean
  stream: NcmStreamInfoVO | null
  onSelect: (level: NcmQualityLevel) => void
}) {
  return (
    <>
      <div className="ncm-quality-popover__head">
        <span>播放音质</span>
        <NcmHintPopover label="音质说明" placement="bottom" align="right">
          <p className="ncm-quality-popover__hint-line">
            <strong>标准 / 较高 / 极高</strong>：MP3，128 / 192 / 320 kbps。
          </p>
          <p className="ncm-quality-popover__hint-line">
            <strong>无损</strong>：FLAC 无损，优先取该歌曲可用的最高无损。
          </p>
          <p className="ncm-quality-popover__hint-line">
            <strong>高清臻音</strong>：96 kHz / 24 bit 空间音频，需要黑胶会员。
          </p>
          <p className="ncm-quality-popover__hint-line">
            <strong>沉浸环绕声 / 超清母带 / 臻音全景声</strong>：需要黑胶超级会员，部分歌曲无该音源时会自动回退。
          </p>
          <p className="ncm-quality-popover__hint-line">
            实际码率以播放时上游返回为准；FLAC 需要浏览器支持。
          </p>
        </NcmHintPopover>
      </div>

      {SONG_QUALITY_OPTIONS.map((option) => {
        const locked = isLocked(option, hasVip, isSvip)
        return (
          <button
            key={option.level}
            type="button"
            role="menuitemradio"
            aria-checked={quality === option.level}
            className={`ncm-quality-popover__option ncm-quality-popover__option--tier-${option.tier}${quality === option.level ? ' ncm-quality-popover__option--active' : ''}${locked ? ' ncm-quality-popover__option--locked' : ''}`}
            disabled={busy || locked}
            title={locked ? (option.tier === 'svip' ? '需要黑胶超级会员' : '需要黑胶会员') : undefined}
            onClick={() => onSelect(option.level)}
          >
            <span className="ncm-quality-popover__option-title">
              <span className="ncm-quality-popover__option-label">{option.label}</span>
              {option.tier === 'svip' ? <NcmSvipTag /> : null}
              {option.tier === 'vip' ? <NcmVipTag /> : null}
            </span>
            <span className="ncm-quality-popover__option-desc">{option.desc}</span>
            {quality === option.level ? <span className="ncm-quality-popover__option-check">✓</span> : null}
          </button>
        )
      })}

      <p className="ncm-quality-popover__stream">
        {stream !== null && stream.br > 0 ? (
          <>
            当前音源 <strong>{formatStream(stream.br, stream.type)}</strong>
            {stream.level !== '' ? ` · ${qualityLabelOf(stream.level)}` : ''}
          </>
        ) : (
          '开始播放后可查看实际码率'
        )}
      </p>
      <p className="ncm-quality-popover__note">切换后从当前进度继续播放。</p>
    </>
  )
}
