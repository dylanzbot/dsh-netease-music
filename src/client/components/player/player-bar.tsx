/* 底部固定音乐播放栏（QQ 音乐风格布局）。 */

import { useRef, useState } from 'react'
import type { NcmSongDTO } from '../../../types/index.js'
import { useNcmPlayer } from '../../hooks/use-player.js'
import {
  next,
  playPrevious,
  playSongs,
  seek,
  setQuality,
  setVolume,
  toggleLike,
  toggleMute,
  togglePlay,
  toggleShuffle,
} from '../../player/engine.js'
import { NcmImage } from '../base/image.js'
import {
  NcmCommentIcon,
  NcmHeartIcon,
  NcmNextIcon,
  NcmPrevIcon,
  NcmQueueIcon,
  NcmShuffleIcon,
} from '../base/icons.js'
import { NcmPlayButton } from '../base/play-button.js'
import { NcmPlayQueue } from './play-queue.js'
import { NcmQualityPopover } from './quality-popover.js'
import { formatClock, formatCount } from '../../utils/format.js'
import { NcmSongTag } from '../base/tags.js'
import { NcmVolumePopover } from './volume-popover.js'
import './player-bar.css'

/** 底部播放栏 props。 */
export interface NcmPlayerBarProps {
  /** 打开评论抽屉（传整首歌，供评论抽屉展示歌手 / 专辑）。 */
  readonly onOpenComments?: (song: NcmSongDTO) => void
}

/** 底部播放栏。 */
export function NcmPlayerBar({ onOpenComments }: NcmPlayerBarProps = {}) {
  const state = useNcmPlayer()
  const [queueOpen, setQueueOpen] = useState(false)
  const queueBtnRef = useRef<HTMLButtonElement | null>(null)
  const current = state.current
  const hasSong = current !== null
  const liked = current !== null && state.likedIds.includes(current.id)
  const duration = state.duration > 0 ? state.duration : (current?.durationMs ?? 0) / 1000

  return (
    <footer className={`ncm-player${hasSong ? ' ncm-player--active' : ''}`} aria-label="音乐播放栏">
      <NcmPlayQueue
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        anchorRef={queueBtnRef}
        songs={state.queue}
        currentIndex={state.index}
        playing={state.playing}
        hasVip={state.hasVip}
        unavailable={state.unavailable}
        onPick={(index) => {
          playSongs(state.queue, index)
          setQueueOpen(false)
        }}
      />

      <div className="ncm-player__track">
        <NcmImage
          className="ncm-player__cover"
          src={current?.coverUrl}
          variant="player"
          loading="eager"
        />
        <div className="ncm-player__info">
          <div className="ncm-player__title" title={current?.name ?? ''}>
            <span className="ncm-player__title-text ncm-ellipsis">{current?.name ?? '还没有播放中的歌曲'}</span>
            {current !== null ? (
              <NcmSongTag song={current} hasVip={state.hasVip} reason={state.unavailable[current.id]} />
            ) : null}
          </div>
          <div className="ncm-player__artist" title={current?.artists.join(' / ') ?? ''}>
            {current !== null ? current.artists.join(' / ') || '未知歌手' : '从搜索或歌单里选一首歌开始'}
          </div>
          {state.error !== null ? <div className="ncm-player__error">{state.error}</div> : null}
        </div>
        <div className="ncm-player__actions">
          <button
            type="button"
            className={`ncm-player__icon-btn${liked ? ' ncm-player__icon-btn--liked' : ''}`}
            aria-label={liked ? '取消喜欢' : '喜欢'}
            aria-pressed={liked}
            title={hasSong ? (liked ? '取消喜欢' : '添加到我喜欢的音乐') : '播放歌曲后才能收藏'}
            disabled={!hasSong || state.busy}
            onClick={() => {
              if (current !== null) void toggleLike(current.id)
            }}
          >
            <NcmHeartIcon size={16} />
          </button>
          <button
            type="button"
            className="ncm-player__comment-btn"
            aria-label={state.commentCount !== null ? `评论 ${state.commentCount} 条` : '评论'}
            title={hasSong ? '查看评论' : '播放歌曲后查看评论'}
            disabled={!hasSong}
            onClick={() => {
              if (current !== null) onOpenComments?.(current)
            }}
          >
            <NcmCommentIcon size={16} />
            {state.commentCount !== null && state.commentCount > 0 ? (
              <span className="ncm-player__comment-badge">{formatCount(state.commentCount)}</span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="ncm-player__center">
        <div className="ncm-player__controls">
          <button
            type="button"
            className={`ncm-player__icon-btn${state.shuffle ? ' ncm-player__icon-btn--active' : ''}`}
            aria-label="随机播放"
            aria-pressed={state.shuffle}
            title={state.shuffle ? '随机播放：开' : '随机播放：关'}
            onClick={toggleShuffle}
          >
            <NcmShuffleIcon size={17} />
          </button>
          <button type="button" className="ncm-player__icon-btn" aria-label="上一首" onClick={playPrevious} disabled={!hasSong}>
            <NcmPrevIcon size={17} />
          </button>
          <NcmPlayButton
            scene="player"
            playing={state.playing}
            loading={state.loading}
            disabled={!hasSong}
            onClick={togglePlay}
          />
          <button type="button" className="ncm-player__icon-btn" aria-label="下一首" onClick={next} disabled={state.queue.length === 0}>
            <NcmNextIcon size={17} />
          </button>
          <NcmVolumePopover
            volume={state.volume}
            muted={state.muted}
            onToggleMute={toggleMute}
            onVolumeChange={setVolume}
          />
        </div>
        <div className="ncm-player__progress">
          <span className="ncm-player__time">{formatClock(state.currentTime)}</span>
          <input
            className="ncm-player__range"
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(state.currentTime, Math.max(duration, 1))}
            aria-label="播放进度"
            disabled={!hasSong}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <span className="ncm-player__time">{formatClock(duration)}</span>
        </div>
      </div>

      <div className="ncm-player__tools">
        <NcmQualityPopover
          quality={state.quality}
          busy={state.busy}
          hasVip={state.hasVip}
          isSvip={state.isSvip}
          stream={state.stream}
          onSelect={(level) => void setQuality(level)}
        />
        {/* TODO: 音效功能暂未接入，先隐藏，后续接入后再打开。 */}
        {/* TODO: 歌词功能下一迭代接入，先隐藏。 */}
        <button
          ref={queueBtnRef}
          type="button"
          className={`ncm-player__icon-btn${queueOpen ? ' ncm-player__icon-btn--active' : ''}`}
          aria-label="播放队列"
          aria-expanded={queueOpen}
          aria-haspopup="dialog"
          onClick={() => setQueueOpen((value) => !value)}
        >
          <NcmQueueIcon size={18} />
        </button>
      </div>
    </footer>
  )
}
