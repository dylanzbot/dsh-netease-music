/* 通用封面卡片（歌单卡片 / 专辑卡片共用）。 */

import type { ReactNode } from 'react'
import { NcmHeartIcon } from '../base/icons.js'
import { NcmImage } from '../base/image.js'
import { NcmPlayButton } from '../base/play-button.js'
import './cover-card.css'

/** 封面卡片 props。 */
export interface NcmCoverCardProps {
  readonly coverUrl: string
  readonly title: string
  /** 底部文案插槽（歌单 / 专辑各传各的）。 */
  readonly footer?: ReactNode
  /** 封面左下角标（如歌单播放数）。 */
  readonly badge?: ReactNode
  /** 是否「我喜欢的音乐」特殊卡（显示心形角标）。 */
  readonly liked?: boolean
  /** 选中态（如专辑弹窗打开时高亮）。 */
  readonly active?: boolean
  /** 点击卡片。 */
  readonly onClick?: () => void
  /** 点击封面右下角播放按钮；不传则不渲染该按钮。 */
  readonly onPlay?: () => void
  /** 播放按钮的无障碍文案。 */
  readonly playLabel?: string
}

/** 通用封面卡片。 */
export function NcmCoverCard({
  coverUrl,
  title,
  footer,
  badge,
  liked = false,
  active = false,
  onClick,
  onPlay,
  playLabel = '播放',
}: NcmCoverCardProps) {
  const clickable = onClick !== undefined

  return (
    <article
      className={`ncm-cover-card${liked ? ' ncm-cover-card--liked' : ''}${active ? ' ncm-cover-card--active' : ''}${clickable ? ' ncm-cover-card--clickable' : ''}`}
      onClick={onClick}
      onKeyDown={(event) => {
        // 内部播放按钮的 keydown 会冒泡到卡片；不拦住的话键盘按 Enter 会误触发
        // 卡片点击（打开弹窗），并且 preventDefault 会抑制按钮自身的 click。
        if (event.target !== event.currentTarget) return
        if (clickable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick?.()
        }
      }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="ncm-cover-card__cover">
        <NcmImage className="ncm-cover-card__cover-img" src={coverUrl} variant="playlist" />
        <span className="ncm-cover-card__shade" aria-hidden="true" />
        {liked ? (
          <span className="ncm-cover-card__heart" aria-hidden="true">
            <NcmHeartIcon size={16} />
          </span>
        ) : null}
        {badge !== undefined ? <span className="ncm-cover-card__count">{badge}</span> : null}
        {onPlay !== undefined ? (
          <NcmPlayButton
            scene="cover"
            label={playLabel}
            onClick={(event) => {
              event.stopPropagation()
              onPlay()
            }}
          />
        ) : null}
      </div>
      <div className="ncm-cover-card__title" title={title}>
        {title}
      </div>
      {footer !== undefined ? <div className="ncm-cover-card__sub">{footer}</div> : null}
    </article>
  )
}
