/* 通用歌曲表格（歌单详情 / 歌手详情 / 专辑弹窗共用）。 */

import type { NcmSongDTO } from '../../../types/index.js'
import { formatDuration } from '../../utils/format.js'
import { NcmPlayButton } from '../base/play-button.js'
import { NcmSongTag } from '../base/tags.js'
import './song-table.css'

/** 歌曲表格 props。 */
export interface NcmSongTableProps {
  readonly songs: readonly NcmSongDTO[]
  /** 当前账号是否黑胶会员（用于无版权 / VIP 标签）。 */
  readonly hasVip: boolean
  /** 点击某行播放：回传整份队列与该行索引。 */
  readonly onPlaySong: (queue: readonly NcmSongDTO[], index: number) => void
  /** 是否显示「歌手」列，默认 false（歌单页传 true）。 */
  readonly showArtist?: boolean
  /** 是否显示「专辑」列，默认 true（专辑弹窗传 false）。 */
  readonly showAlbum?: boolean
  /** 空列表文案。 */
  readonly emptyText?: string
}

/** 歌曲表格。 */
export function NcmSongTable({
  songs,
  hasVip,
  onPlaySong,
  showArtist = false,
  showAlbum = true,
  emptyText = '暂无歌曲',
}: NcmSongTableProps) {
  if (songs.length === 0) return <div className="ncm-song-table__empty ncm-empty-state">{emptyText}</div>

  return (
    <div className="ncm-song-table__wrap ncm-scroll">
      <table className={`ncm-song-table${showArtist ? '' : ' ncm-song-table--compact'}`}>
        <colgroup>
          <col className="ncm-song-table__col-index" />
          <col className="ncm-song-table__col-title" />
          {showArtist ? <col className="ncm-song-table__col-extra" /> : null}
          {showAlbum ? <col className="ncm-song-table__col-extra" /> : null}
          <col className="ncm-song-table__col-duration" />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th>歌曲标题</th>
            {showArtist ? <th>歌手</th> : null}
            {showAlbum ? <th>专辑</th> : null}
            <th>时长</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song, index) => (
            <tr
              key={`${song.id}-${index}`}
              className={song.noCopyright === true ? 'ncm-song-table__row--disabled' : ''}
            >
              <td className="ncm-song-table__index">{String(index + 1).padStart(2, '0')}</td>
              <td>
                <div className="ncm-song-table__title-cell">
                  <span className="ncm-song-table__song-name">{song.name}</span>
                  <NcmSongTag song={song} hasVip={hasVip} />
                  <NcmPlayButton
                    scene="row"
                    label={`播放：${song.name}`}
                    disabled={song.noCopyright === true}
                    onClick={() => onPlaySong(songs, index)}
                  />
                </div>
              </td>
              {showArtist ? (
                <td>
                  <span className="ncm-song-table__text">{song.artists.join(' / ') || '未知歌手'}</span>
                </td>
              ) : null}
              {showAlbum ? (
                <td>
                  <span className="ncm-song-table__text">{song.album || '—'}</span>
                </td>
              ) : null}
              <td className="ncm-song-table__duration">{formatDuration(song.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
