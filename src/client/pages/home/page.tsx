/* 「首页」（发现音乐）。 */

import type {
  NcmAlbumCardDTO,
  NcmArtistCardDTO,
  NcmPlaylistCardDTO as NcmPlaylistCardData,
  NcmProfileDTO,
  NcmSongDTO,
} from '../../../types/index.js'
import { useCallback } from 'react'
import { getDiscover } from '../../api/song.api.js'
import { useAsync } from '../../hooks/use-async.js'
import { NcmPlaylistCard } from '../../components/playlist/playlist-card.js'
import { NcmSearchBox } from '../../components/search/search-box.js'
import { NcmMusicIcon, NcmPlayIcon, NcmSparkIcon } from '../../components/base/icons.js'
import { NcmImage } from '../../components/base/image.js'
import { formatDuration } from '../../utils/format.js'
import './page.css'

/** 首页 props。 */
export interface HomePageProps {
  readonly profile: NcmProfileDTO
  readonly onPickSong?: (song: NcmSongDTO, queue?: readonly NcmSongDTO[], index?: number) => void
  readonly onOpenPlaylist?: (playlist: NcmPlaylistCardData) => void
  readonly onPlayPlaylist?: (playlist: NcmPlaylistCardData) => void
  /** 搜索结果点击歌手 → 打开歌手详情。 */
  readonly onOpenArtist?: (artist: NcmArtistCardDTO) => void
  /** 搜索结果点击专辑 → 打开专辑弹窗。 */
  readonly onOpenAlbum?: (album: NcmAlbumCardDTO) => void
}

/** 按时段给问候语。 */
function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

/** 今日日期。 */
function today(): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
}

/** 首页。 */
export default function HomePage({ profile, onPickSong, onOpenPlaylist, onPlayPlaylist, onOpenArtist, onOpenAlbum }: HomePageProps) {
  const fetchDiscover = useCallback((signal: AbortSignal) => getDiscover(signal), [])
  const { data, loading, error: failed } = useAsync(fetchDiscover, [])
  const hasVip = profile.vipType > 0 || profile.vipLevel !== undefined

  return (
    <div className="ncm-home ncm-scroll">
      <div className="ncm-home__inner">
        <header className="ncm-home__head">
          <p className="ncm-home__eyebrow">
            <NcmSparkIcon size={13} />
            为你精选
          </p>
          <h1 className="ncm-home__title">
            {greeting()}，{profile.nickname}
          </h1>
          <p className="ncm-home__sub">今天也来点好听的。</p>
          <span className="ncm-home__date">{today()}</span>
        </header>

        <div className="ncm-search-box">
          <NcmSearchBox placeholder="搜索歌曲、歌手、专辑、歌单…" hasVip={hasVip} onPickSong={onPickSong} onOpenArtist={onOpenArtist} onOpenAlbum={onOpenAlbum} onOpenPlaylist={onOpenPlaylist} />
        </div>

        <section className="ncm-home__section">
          <header className="ncm-home__section-head">
            <span className="ncm-section__bar" aria-hidden="true" />
            <h2>推荐歌单</h2>
            <span className="ncm-section__count">{loading ? '··' : (data?.playlists.length ?? 0)}</span>
          </header>

          {loading ? (
            <div className="ncm-home__skeleton-grid" aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => (
                <div className="ncm-home__skeleton-card" key={index}>
                  <span className="ncm-home__skeleton-cover" />
                  <span className="ncm-home__skeleton-title" />
                </div>
              ))}
            </div>
          ) : failed ? (
            <div className="ncm-home__error">
              <NcmMusicIcon size={26} />
              <p>推荐加载失败，请稍后刷新重试。</p>
            </div>
          ) : (
            <div className="ncm-playlist-grid ncm-home__grid">
              {(data?.playlists ?? []).map((playlist) => (
                <NcmPlaylistCard key={playlist.id} playlist={playlist} onOpen={onOpenPlaylist}
                  onPlay={onPlayPlaylist} />
              ))}
            </div>
          )}
        </section>

        <section className="ncm-home__section">
          <header className="ncm-home__section-head">
            <span className="ncm-section__bar" aria-hidden="true" />
            <h2>新歌速递</h2>
            <span className="ncm-section__count">{loading ? '··' : (data?.newSongs.length ?? 0)}</span>
          </header>

          {loading ? (
            <div className="ncm-home__song-skeletons" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="ncm-home__song-skeleton" key={index} />
              ))}
            </div>
          ) : (
            <ul className="ncm-home__song-list">
              {(data?.newSongs ?? []).map((song, index) => (
                <li key={song.id}>
                  <button type="button" className="ncm-home__song" onClick={() => onPickSong?.(song, data?.newSongs, index)}>
                    <NcmImage className="ncm-home__song-cover" src={song.coverUrl} variant="song" />
                    <span className="ncm-home__song-main">
                      <span className="ncm-home__song-name">{song.name}</span>
                      <span className="ncm-home__song-meta ncm-ellipsis">{song.artists.join(' / ') || '未知歌手'}</span>
                    </span>
                    <span className="ncm-home__song-time">{formatDuration(song.durationMs)}</span>
                    <span className="ncm-home__song-play" aria-hidden="true">
                      <NcmPlayIcon size={11} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="ncm-mine__foot">推荐内容来自网易云音乐</footer>
      </div>
    </div>
  )
}
