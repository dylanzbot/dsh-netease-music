/* 搜索结果下拉浮层。 */

import type { RefObject } from 'react'
import type {
  NcmAlbumCardDTO,
  NcmArtistCardDTO,
  NcmLibrarySearchDTO,
  NcmLibrarySearchItemDTO,
  NcmMultiSearchDTO,
  NcmPlaylistCardDTO,
  NcmSongDTO,
} from '../../../types/index.js'
import { formatDuration } from '../../utils/format.js'
import { NcmMusicIcon } from '../base/icons.js'
import { NcmImage } from '../base/image.js'
import { NcmPopover } from '../base/popover.js'
import { NcmSongTag } from '../base/tags.js'
import './search-popover.css'

/** 每组最多展示条数（更多走「查看全部」入口由页面承接，这里先截断）。 */
const GROUP_LIMIT = 5

/** 搜索结果浮层 props。 */
export interface NcmSearchPopoverProps {
  readonly open: boolean
  readonly onClose: () => void
  /** 搜索框根节点：点击它不算「点外部」。 */
  readonly anchorRef?: RefObject<HTMLElement | null>
  readonly keyword: string
  readonly library: NcmLibrarySearchDTO | null
  readonly multi: NcmMultiSearchDTO | null
  readonly loading: boolean
  readonly failed: boolean
  readonly hasVip: boolean
  /** 选中一首歌（附带当前结果队列）。 */
  readonly onPick: (song: NcmSongDTO, queue: readonly NcmSongDTO[], index: number) => void
  /** 点击歌手结果。 */
  readonly onOpenArtist: (artist: NcmArtistCardDTO) => void
  /** 点击专辑结果。 */
  readonly onOpenAlbum: (album: NcmAlbumCardDTO) => void
  /** 点击歌单结果。 */
  readonly onOpenPlaylist: (playlist: NcmPlaylistCardDTO) => void
}

/** 「我的歌单 / 我的收藏」分组。 */
function LibraryGroup({
  title,
  items,
  hasVip,
  onPick,
}: {
  title: string
  items: readonly NcmLibrarySearchItemDTO[]
  hasVip: boolean
  onPick: (song: NcmSongDTO, queue: readonly NcmSongDTO[], index: number) => void
}) {
  if (items.length === 0) return null
  const queue = items.map((item) => item.song)
  return (
    <section className="ncm-search__library-group">
      <h4 className="ncm-search__library-group-title">{title}</h4>
      <ul className="ncm-search__library-list">
        {items.map((item, index) => (
          <li key={`${item.playlist.id}-${item.song.id}-${index}`}>
            <button
              type="button"
              className={`ncm-search__library-row${item.song.noCopyright === true ? ' ncm-search__library-row--disabled' : ''}`}
              disabled={item.song.noCopyright === true}
              onClick={() => onPick(item.song, queue, index)}
            >
              <span className="ncm-search__library-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="ncm-search__library-song">
                <span className="ncm-search__library-song-name">{item.song.name}</span>
                <span className="ncm-search__library-song-artist"> — {item.song.artists.join(' / ') || '未知歌手'}</span>
              </span>
              <NcmSongTag song={item.song} hasVip={hasVip} />
              <span className="ncm-search__library-playlist" title={item.playlist.name}>
                {item.playlist.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** 分组标题：与结果行左对齐的柔和小标签 + 计数徽标。 */
function GroupTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="ncm-search__group-title">
      <span className="ncm-search__group-label">{title}</span>
      {count > 0 ? <span className="ncm-search__group-count">{count}</span> : null}
    </div>
  )
}

/** 搜索结果下拉浮层。 */
export function NcmSearchPopover({
  open,
  onClose,
  anchorRef,
  keyword,
  library,
  multi,
  loading,
  failed,
  hasVip,
  onPick,
  onOpenArtist,
  onOpenAlbum,
  onOpenPlaylist,
}: NcmSearchPopoverProps) {
  const hasLibraryResults = library !== null && (library.mine.length > 0 || library.collections.length > 0)
  const songs = multi?.songs ?? []
  const artists = multi?.artists ?? []
  const albums = multi?.albums ?? []
  const playlists = multi?.playlists ?? []
  const hasGlobal = songs.length > 0 || artists.length > 0 || albums.length > 0 || playlists.length > 0
  const hasAnyResult = hasLibraryResults || hasGlobal

  return (
    <NcmPopover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      className="ncm-search__pop"
      role="listbox"
      ariaLabel="搜索结果"
    >
      <div className="ncm-search__pop-head">
        <span>搜索「{keyword}」</span>
        {loading ? <span className="ncm-search__pop-loading">搜索中…</span> : null}
      </div>
      <div className="ncm-search__pop-body ncm-scroll">
        {loading && library === null && multi === null ? (
          <div className="ncm-search__skeletons" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div className="ncm-search__skeleton" key={item}>
                <span className="ncm-search__skeleton-cover" />
                <span className="ncm-search__skeleton-line" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && failed ? <div className="ncm-search__empty">搜索失败，请稍后重试。</div> : null}

        {!loading && !failed && !hasAnyResult && library !== null && multi !== null ? (
          <div className="ncm-search__empty">
            <NcmMusicIcon size={22} />
            <span>没有找到相关内容</span>
          </div>
        ) : null}

        {!loading && hasLibraryResults ? (
          <>
            <LibraryGroup title="我的歌单" items={library?.mine ?? []} hasVip={hasVip} onPick={onPick} />
            <LibraryGroup title="我的收藏" items={library?.collections ?? []} hasVip={hasVip} onPick={onPick} />
          </>
        ) : null}

        {/* 单曲 */}
        {!loading && songs.length > 0 ? (
          <section className="ncm-search__group">
            <GroupTitle title="单曲" count={multi?.counts.song ?? songs.length} />
            <ul className="ncm-search__list">
              {songs.slice(0, GROUP_LIMIT).map((song, index) => (
                <li key={`s-${song.id}-${index}`}>
                  <button type="button" className="ncm-search__row" onClick={() => onPick(song, songs, index)}>
                    <NcmImage className="ncm-search__row-cover" src={song.coverUrl} variant="song" />
                    <span className="ncm-search__row-main">
                      <span className="ncm-search__row-name">
                        {song.name}
                        <NcmSongTag song={song} hasVip={hasVip} />
                      </span>
                      <span className="ncm-search__row-meta ncm-ellipsis">
                        {song.artists.join(' / ') || '未知歌手'}
                        {song.album !== '' ? ` · ${song.album}` : ''}
                      </span>
                    </span>
                    <span className="ncm-search__row-time">{formatDuration(song.durationMs)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 歌手 */}
        {!loading && artists.length > 0 ? (
          <section className="ncm-search__group">
            <GroupTitle title="歌手" count={multi?.counts.artist ?? artists.length} />
            <ul className="ncm-search__list">
              {artists.slice(0, GROUP_LIMIT).map((artist) => (
                <li key={`a-${artist.id}`}>
                  <button type="button" className="ncm-search__row" onClick={() => onOpenArtist(artist)}>
                    <NcmImage className="ncm-search__row-cover ncm-search__row-cover--round" src={artist.avatarUrl} variant="avatar" />
                    <span className="ncm-search__row-main">
                      <span className="ncm-search__row-name">{artist.name}</span>
                      <span className="ncm-search__row-meta ncm-ellipsis">
                        {artist.alias.length > 0 ? `${artist.alias.join(' / ')} · ` : ''}歌手
                      </span>
                    </span>
                    <span className="ncm-search__row-time">{artist.musicSize > 0 ? `${artist.musicSize} 首` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 专辑 */}
        {!loading && albums.length > 0 ? (
          <section className="ncm-search__group">
            <GroupTitle title="专辑" count={multi?.counts.album ?? albums.length} />
            <ul className="ncm-search__list">
              {albums.slice(0, GROUP_LIMIT).map((album) => (
                <li key={`al-${album.id}`}>
                  <button type="button" className="ncm-search__row" onClick={() => onOpenAlbum(album)}>
                    <NcmImage className="ncm-search__row-cover" src={album.coverUrl} variant="playlist" />
                    <span className="ncm-search__row-main">
                      <span className="ncm-search__row-name">{album.name}</span>
                      <span className="ncm-search__row-meta ncm-ellipsis">
                        专辑{album.size > 0 ? ` · ${album.size} 首` : ''}
                        {album.type !== '' ? ` · ${album.type}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 歌单 */}
        {!loading && playlists.length > 0 ? (
          <section className="ncm-search__group">
            <GroupTitle title="歌单" count={multi?.counts.playlist ?? playlists.length} />
            <ul className="ncm-search__list">
              {playlists.slice(0, GROUP_LIMIT).map((playlist) => (
                <li key={`p-${playlist.id}`}>
                  <button type="button" className="ncm-search__row" onClick={() => onOpenPlaylist(playlist)}>
                    <NcmImage className="ncm-search__row-cover" src={playlist.coverUrl} variant="playlist" />
                    <span className="ncm-search__row-main">
                      <span className="ncm-search__row-name">{playlist.name}</span>
                      <span className="ncm-search__row-meta ncm-ellipsis">
                        歌单{playlist.creatorName !== '' ? ` · by ${playlist.creatorName}` : ''}
                        {playlist.trackCount > 0 ? ` · ${playlist.trackCount} 首` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <div className="ncm-search__pop-foot">搜索歌曲 / 歌手 / 专辑 / 歌单 · 点击即播放或打开</div>
    </NcmPopover>
  )
}
