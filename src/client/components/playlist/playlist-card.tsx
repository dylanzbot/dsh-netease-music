/* 歌单封面卡片（「我的」和首页推荐共用）。 */

import type { NcmPlaylistCardDTO as NcmPlaylistCardData } from '../../../types/index.js'
import { formatCount } from '../../utils/format.js'
import { NcmCoverCard } from './cover-card.js'
import { NcmPlayIcon } from '../base/icons.js'
import './playlist-card.css'

/** 歌单卡片 props。 */
export interface NcmPlaylistCardProps {
  readonly playlist: NcmPlaylistCardData
  /** 是否为「我喜欢的音乐」特殊卡。 */
  readonly liked?: boolean
  /** 点击卡片（进入歌单详情）；不传则仅展示。 */
  readonly onOpen?: (playlist: NcmPlaylistCardData) => void
  /** 点击封面播放按钮（播放歌单）。 */
  readonly onPlay?: (playlist: NcmPlaylistCardData) => void
}

/** 歌单封面卡片。 */
export function NcmPlaylistCard({ playlist, liked = false, onOpen, onPlay }: NcmPlaylistCardProps) {
  return (
    <NcmCoverCard
      coverUrl={playlist.coverUrl}
      title={playlist.name}
      liked={liked}
      footer={<>{playlist.trackCount} 首</>}
      badge={
        playlist.playCount > 0 ? (
          <>
            <NcmPlayIcon size={9} />
            {formatCount(playlist.playCount)}
          </>
        ) : undefined
      }
      onClick={onOpen !== undefined ? () => onOpen(playlist) : undefined}
      onPlay={onPlay !== undefined ? () => onPlay(playlist) : undefined}
      playLabel={`播放歌单：${playlist.name}`}
    />
  )
}
