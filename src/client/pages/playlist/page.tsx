/* 歌单详情页（参考网易云 PC 网页的歌单页结构）。 */

import type { NcmMeDTO, NcmPlaylistCardDTO as NcmPlaylistCardData, NcmSongDTO } from '../../../types/index.js'
import { useCallback, useEffect, useState } from 'react'
import { getPlaylistSongs, setPlaylistSubscribed } from '../../api/playlist.api.js'
import { useAsync } from '../../hooks/use-async.js'
import { NcmPlayIcon } from '../../components/base/icons.js'
import { NcmImage } from '../../components/base/image.js'
import { NcmSkeleton } from '../../components/base/skeleton.js'
import { NcmSongTable } from '../../components/song/song-table.js'
import { formatCount, formatDate } from '../../utils/format.js'
import './page.css'

/** 歌单详情页 props。 */
export interface PlaylistPageProps {
  readonly playlist: NcmPlaylistCardData
  readonly me: NcmMeDTO
  readonly onBack: () => void
  readonly onSelectPlaylist: (playlist: NcmPlaylistCardData) => void
  readonly onPlayQueue: (songs: readonly NcmSongDTO[], index: number) => void
  /** 收藏状态变化后通知上层刷新「我的」数据。 */
  readonly onMeChanged?: () => void
}

/** 歌单列表项。 */
function PlaylistNavItem({
  playlist,
  active,
  onClick,
}: {
  playlist: NcmPlaylistCardData
  active: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={`ncm-playlist-detail__nav-item${active ? ' ncm-playlist-detail__nav-item--active' : ''}`} onClick={onClick}>
      <NcmImage className="ncm-playlist-detail__nav-cover" src={playlist.coverUrl} variant="playlist" />
      <span className="ncm-playlist-detail__nav-main">
        <span className="ncm-playlist-detail__nav-name" title={playlist.name}>
          {playlist.name}
        </span>
        <span className="ncm-playlist-detail__nav-count">{playlist.trackCount} 首</span>
      </span>
    </button>
  )
}

/** 歌单详情页。 */
export default function PlaylistPage({ playlist, me, onBack, onSelectPlaylist, onPlayQueue, onMeChanged }: PlaylistPageProps) {
  const fetchSongs = useCallback((signal: AbortSignal) => getPlaylistSongs(playlist.id, signal), [playlist.id])
  const { data: songs, loading, error: failed } = useAsync(fetchSongs, [playlist.id])

  const created = [...(me.liked !== null ? [me.liked] : []), ...me.playlists]
  const hasVip = me.profile.vipType > 0 || me.profile.vipLevel !== undefined
  const createdText = formatDate(playlist.createTime)

  // 自己创建的歌单（含「我喜欢的音乐」）不显示收藏按钮。
  const isOwn = playlist.specialType === 5 || playlist.creatorId === me.profile.userId
  const [subscribed, setSubscribed] = useState(playlist.subscribed === true)
  const [subscribeBusy, setSubscribeBusy] = useState(false)

  // 切换歌单时同步收藏状态。
  useEffect(() => {
    setSubscribed(playlist.subscribed === true)
  }, [playlist.id, playlist.subscribed])

  const toggleSubscribe = async () => {
    if (subscribeBusy) return
    const next = !subscribed
    setSubscribeBusy(true)
    setSubscribed(next) // 乐观更新
    try {
      await setPlaylistSubscribed(playlist.id, next)
      // 收藏 / 取消收藏后，通知上层重新拉取「我的」数据（歌单可能增减）。
      onMeChanged?.()
    } catch {
      setSubscribed(!next) // 失败回滚
    } finally {
      setSubscribeBusy(false)
    }
  }

  return (
    <div className="ncm-playlist-detail">
      <div className="ncm-playlist-detail__back-row">
        <button type="button" className="ncm-playlist-detail__back ncm-icon-btn" onClick={onBack}>
          <span aria-hidden="true">←</span> 返回
        </button>
      </div>

      <div className="ncm-playlist-detail__layout">
        <aside className="ncm-playlist-detail__side ncm-scroll">
          <section className="ncm-playlist-detail__side-section">
            <h3>
              创建的歌单 <b>{created.length}</b>
            </h3>
            <div className="ncm-playlist-detail__nav-list">
              {created.map((item) => (
                <PlaylistNavItem
                  key={item.id}
                  playlist={item}
                  active={item.id === playlist.id}
                  onClick={() => onSelectPlaylist(item)}
                />
              ))}
            </div>
          </section>
          <section className="ncm-playlist-detail__side-section">
            <h3>
              收藏的歌单 <b>{me.collections.length}</b>
            </h3>
            <div className="ncm-playlist-detail__nav-list">
              {me.collections.map((item) => (
                <PlaylistNavItem
                  key={item.id}
                  playlist={item}
                  active={item.id === playlist.id}
                  onClick={() => onSelectPlaylist(item)}
                />
              ))}
            </div>
          </section>
        </aside>

        <main className="ncm-playlist-detail__main ncm-scroll">
          <header className="ncm-playlist-detail__head">
            <NcmImage className="ncm-playlist-detail__cover" src={playlist.coverUrl} variant="playlist" loading="eager" />
            <div className="ncm-playlist-detail__meta">
              <div className="ncm-playlist-detail__title-row">
                <span className="ncm-playlist-detail__type">歌单</span>
                <h1>{playlist.name}</h1>
              </div>
              <p>
                {playlist.creatorName !== '' ? `by ${playlist.creatorName} · ` : ''}
                {playlist.trackCount} 首 · 播放 {formatCount(playlist.playCount)}
                {createdText !== '' ? ` · 创建于 ${createdText}` : ''}
              </p>
              {playlist.tags.length > 0 ? (
                <div className="ncm-playlist-detail__tags">
                  {playlist.tags.map((tag) => (
                    <span key={tag} className="ncm-playlist-detail__tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {playlist.description !== '' ? (
                <p className="ncm-playlist-detail__desc" title={playlist.description}>
                  {playlist.description}
                </p>
              ) : null}
              <div className="ncm-playlist-detail__actions">
                <button
                  type="button"
                  className="ncm-playlist-detail__play ncm-btn ncm-btn--accent"
                  disabled={loading || failed || songs === null || songs.length === 0}
                  onClick={() => {
                    if (songs !== null && songs.length > 0) onPlayQueue(songs, 0)
                  }}
                >
                  <NcmPlayIcon size={14} /> 播放全部
                </button>
                {!isOwn ? (
                  <button
                    type="button"
                    className={`ncm-playlist-detail__action ncm-btn${subscribed ? ' ncm-playlist-detail__action--on' : ''}`}
                    disabled={subscribeBusy}
                    onClick={() => void toggleSubscribe()}
                  >
                    {subscribed ? '取消收藏' : '收藏'}
                  </button>
                ) : null}
                {/* 分享 / 下载：功能暂未实现，先注释掉入口。 */}
              </div>
            </div>
          </header>

          <section className="ncm-playlist-detail__songs">
            <header className="ncm-playlist-detail__songs-head">
              <h2>歌曲列表</h2>
              <span>{songs?.length ?? playlist.trackCount} 首</span>
            </header>
            {loading ? (
              <NcmSkeleton rows={8} />
            ) : failed ? (
              <div className="ncm-playlist-detail__empty">歌单加载失败，请返回后重试</div>
            ) : songs === null || songs.length === 0 ? (
              <div className="ncm-playlist-detail__empty">歌单里还没有歌曲</div>
            ) : (
              <NcmSongTable songs={songs} hasVip={hasVip} onPlaySong={onPlayQueue} showArtist />
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
