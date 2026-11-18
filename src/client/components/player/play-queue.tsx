/* 播放队列浮层（基于通用 NcmPopover）。 */

import type { RefObject } from 'react'
import type { NcmSongDTO, PlaybackUnavailableReason } from '../../../types/index.js'
import { NcmPlayingBars } from '../base/playing-bars.js'
import { NcmPopover } from '../base/popover.js'
import { NcmSongTag } from '../base/tags.js'
import './play-queue.css'

/** 播放队列 props。 */
export interface NcmPlayQueueProps {
  readonly open: boolean
  readonly onClose: () => void
  /** 队列按钮：点击它不算「点外部」。 */
  readonly anchorRef?: RefObject<HTMLElement | null>
  readonly songs: readonly NcmSongDTO[]
  readonly currentIndex: number
  readonly playing: boolean
  readonly hasVip: boolean
  readonly unavailable: Readonly<Record<number, PlaybackUnavailableReason>>
  /** 点击队列中的歌曲。 */
  readonly onPick: (index: number) => void
}

/** 播放队列浮层。 */
export function NcmPlayQueue({
  open,
  onClose,
  anchorRef,
  songs,
  currentIndex,
  playing,
  hasVip,
  unavailable,
  onPick,
}: NcmPlayQueueProps) {
  return (
    <NcmPopover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      className="ncm-play-queue"
      role="dialog"
      ariaLabel="播放队列"
      style={{ right: 22, bottom: 'var(--ncm-player-pop-bottom, 104px)' }}
    >
      <div className="ncm-play-queue__head">
        <span>播放队列</span>
        <span>{songs.length} 首</span>
      </div>
      {songs.length === 0 ? (
        <div className="ncm-play-queue__empty">队列还是空的</div>
      ) : (
        <ul className="ncm-play-queue__list ncm-scroll">
          {songs.map((song, index) => {
            const isCurrent = index === currentIndex
            return (
              <li key={`${song.id}-${index}`}>
                <button
                  type="button"
                  className={`ncm-play-queue__item${isCurrent ? ' ncm-play-queue__item--current' : ''}`}
                  onClick={() => onPick(index)}
                >
                  {isCurrent ? (
                    <NcmPlayingBars active={playing} />
                  ) : (
                    <span className="ncm-play-queue__index">{String(index + 1).padStart(2, '0')}</span>
                  )}
                  <span className="ncm-play-queue__main">
                    <span className="ncm-play-queue__name">{song.name}</span>
                    <NcmSongTag song={song} hasVip={hasVip} reason={unavailable[song.id]} />
                  </span>
                  <span className="ncm-play-queue__artist">{song.artists.join(' / ')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </NcmPopover>
  )
}
