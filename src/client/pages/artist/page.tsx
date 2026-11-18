/* 歌手详情页。 */

import { useCallback, useEffect, useState } from 'react'
import type { NcmAlbumCardDTO, NcmMvCardDTO, NcmSongDTO } from '../../../types/index.js'
import {
  getAlbumDetail,
  getArtistAlbums,
  getArtistInfo,
  getArtistMvs,
  getArtistSongs,
  setArtistFollow,
} from '../../api/artist.api.js'
import { ArtistHero } from '../../components/artist/artist-hero.js'
import { ArtistTabs, type ArtistTab } from '../../components/artist/artist-tabs.js'
import { NcmAlbumModal } from '../../components/album/album-modal.js'
import { NcmConfirmModal } from '../../components/base/confirm-modal.js'
import { NcmSkeleton } from '../../components/base/skeleton.js'
import { NcmCoverCard } from '../../components/playlist/cover-card.js'
import { NcmMvCard } from '../../components/mv/mv-card.js'
import { NcmSongTable } from '../../components/song/song-table.js'
import { useAsync } from '../../hooks/use-async.js'
import { usePagedList } from '../../hooks/use-paged-list.js'
import { pausePlaybackIfPlaying } from '../../player/engine.js'
import { formatCount, formatDate } from '../../utils/format.js'
import { retryMessage } from '../../constants/message.js'
import './page.css'

/** 歌曲 / 专辑 / MV 列表分页大小。 */
const PAGE_SIZE = 50

/** 详情页 props。 */
export interface ArtistPageProps {
  readonly artistId: number
  /** 返回上一页。 */
  readonly onBack: () => void
  /** 播放一组歌曲（队列 + 起始索引）。 */
  readonly onPlayQueue: (songs: readonly NcmSongDTO[], index: number) => void
  /** 当前账号是否黑胶会员（用于无版权提示）。 */
  readonly hasVip: boolean
  /** 轻提示（如播放整张专辑失败）。 */
  readonly onNotice?: (message: string) => void
}

/** 歌手详情页。 */
export default function ArtistPage({ artistId, onBack, onPlayQueue, hasVip, onNotice }: ArtistPageProps) {
  // 详情（含热门歌曲）。
  const fetchInfo = useCallback((signal: AbortSignal) => getArtistInfo(artistId, signal), [artistId])
  const { data: info, loading, error: failed } = useAsync(fetchInfo, [artistId])

  // 默认选中「热门歌曲」，尽管「全部歌曲」排在 Tab 第一位。
  const [tab, setTab] = useState<ArtistTab>('hot')
  const [descExpanded, setDescExpanded] = useState(false)

  // 关注状态（乐观更新）
  const [followed, setFollowed] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  // 取消关注需要二次确认。
  const [confirmUnfollow, setConfirmUnfollow] = useState(false)

  // 切歌手时重置局部 UI 状态。
  useEffect(() => {
    setTab('hot')
    setDescExpanded(false)
    setConfirmUnfollow(false)
  }, [artistId])

  // 详情回来后同步关注状态与默认 tab。
  useEffect(() => {
    if (info !== null) setFollowed(info.artist.followed)
  }, [info])

  // 全部歌曲（切到该 Tab 才加载）。
  const allSongs = usePagedList<NcmSongDTO>({
    pageSize: PAGE_SIZE,
    deps: [artistId, tab === 'all'],
    auto: tab === 'all',
    fetchPage: (offset, size, signal) =>
      getArtistSongs(artistId, 'hot', offset, size, signal).then((result) => ({
        items: result.songs,
        more: result.more,
        total: result.total,
      })),
  })

  // 专辑（切到该 Tab 才加载）。
  const albums = usePagedList<NcmAlbumCardDTO>({
    pageSize: PAGE_SIZE,
    deps: [artistId, tab === 'albums'],
    auto: tab === 'albums',
    fetchPage: (offset, size, signal) =>
      getArtistAlbums(artistId, size, offset, signal).then((result) => ({
        items: result.albums,
        more: result.more,
      })),
  })

  // MV（切到该 Tab 才加载）。
  const mvs = usePagedList<NcmMvCardDTO>({
    pageSize: PAGE_SIZE,
    deps: [artistId, tab === 'mvs'],
    auto: tab === 'mvs',
    fetchPage: (offset, size, signal) =>
      getArtistMvs(artistId, size, offset, signal).then((result) => ({
        items: result.mvs,
        more: result.more,
      })),
  })

  /** 当前打开的专辑弹窗（null = 关闭）。 */
  const [activeAlbum, setActiveAlbum] = useState<NcmAlbumCardDTO | null>(null)
  /** 正在为播放按钮拉取整张专辑的专辑 id（防重复点击）。 */
  const [playAlbumId, setPlayAlbumId] = useState<number | null>(null)
  /** 当前正在内联播放的 MV id（null = 都在封面态）。 */
  const [playingMvId, setPlayingMvId] = useState<number | null>(null)

  /** 真正执行关注 / 取关（乐观更新，失败回滚）。 */
  const applyFollow = useCallback(
    async (next: boolean) => {
      if (followBusy) return
      setFollowBusy(true)
      setFollowed(next)
      try {
        await setArtistFollow(artistId, next)
      } catch {
        setFollowed(!next)
      } finally {
        setFollowBusy(false)
      }
    },
    [artistId, followBusy],
  )

  /** 点击关注按钮：关注直接执行，取消关注先弹二次确认。 */
  const toggleFollow = useCallback(() => {
    if (followBusy) return
    if (followed) setConfirmUnfollow(true)
    else void applyFollow(true)
  }, [followed, followBusy, applyFollow])

  /**
   * 点击封面的播放按钮：拉取整张专辑并直接播放（不打开弹窗）。
   * 播放按钮和卡片点击是两条路径，这里只负责「立即播放」。
   */
  const playAlbum = useCallback(
    async (album: NcmAlbumCardDTO) => {
      if (playAlbumId !== null) return
      setPlayAlbumId(album.id)
      try {
        const detail = await getAlbumDetail(album.id)
        if (detail.songs.length > 0) onPlayQueue(detail.songs, 0)
        else onNotice?.('这张专辑暂无可播放的歌曲')
      } catch {
        onNotice?.(retryMessage('专辑加载失败'))
      } finally {
        setPlayAlbumId(null)
      }
    },
    [playAlbumId, onPlayQueue, onNotice],
  )

  /**
   * 点击 MV 卡片播放：单实例播放 + 与音频互斥。
   * 先暂停底部音乐音频（若在播），再把这一个 MV 切到播放态。
   */
  const handleRequestPlayMv = useCallback(
    (mv: NcmMvCardDTO) => {
      const audioWasPlaying = pausePlaybackIfPlaying()
      setPlayingMvId(mv.id)
      if (audioWasPlaying) onNotice?.('MV 播放中，已暂停音乐')
    },
    [onNotice],
  )

  /** 歌曲表格统一走共享组件（与歌单页完全一致）。 */
  const renderSongTable = (songs: readonly NcmSongDTO[]) => (
    <NcmSongTable songs={songs} hasVip={hasVip} onPlaySong={onPlayQueue} />
  )

  if (loading) {
    return (
      <div className="ncm-artist ncm-scroll">
        <div className="ncm-artist__back-row">
          <button type="button" className="ncm-artist__back ncm-icon-btn" onClick={onBack}>
            <span aria-hidden="true">←</span> 返回
          </button>
        </div>
        <NcmSkeleton rows={6} cover />
      </div>
    )
  }

  if (failed || info === null) {
    return (
      <div className="ncm-artist ncm-scroll">
        <div className="ncm-artist__back-row">
          <button type="button" className="ncm-artist__back ncm-icon-btn" onClick={onBack}>
            <span aria-hidden="true">←</span> 返回
          </button>
        </div>
        <div className="ncm-artist__empty ncm-empty-state">歌手加载失败，请返回后重试</div>
      </div>
    )
  }

  const { artist, hotSongs } = info

  // 「全部歌曲」数量：详情接口已带 musicSize，未点进该 Tab 前先用它兜底，
  // 避免 Tab 上一直显示 0、点进去才变数字。
  const allSongsTotal = allSongs.total > 0 ? allSongs.total : artist.musicSize

  /** Tab 文案（数量用括号标识）。 */
  const tabs: ReadonlyArray<readonly [ArtistTab, string]> = [
    ['all', `全部歌曲 (${formatCount(allSongsTotal)})`],
    ['hot', `热门歌曲 (${hotSongs.length})`],
    ['albums', `专辑 (${formatCount(artist.albumSize)})`],
    ['mvs', `MV (${formatCount(artist.mvSize)})`],
  ]

  const isSongTab = tab === 'hot' || tab === 'all'
  const playAllSongs = tab === 'hot' ? hotSongs : allSongs.items

  return (
    <div className="ncm-artist ncm-scroll">
      <div className="ncm-artist__back-row">
        <button type="button" className="ncm-artist__back ncm-icon-btn" onClick={onBack}>
          <span aria-hidden="true">←</span> 返回
        </button>
      </div>

      <div className="ncm-artist__inner">
        <ArtistHero
          artist={artist}
          followed={followed}
          followBusy={followBusy}
          descExpanded={descExpanded}
          onToggleFollow={toggleFollow}
          onToggleDesc={() => setDescExpanded((v) => !v)}
        />

        <ArtistTabs
          tab={tab}
          tabs={tabs}
          onSelectTab={setTab}
          showPlayAll={isSongTab}
          playAllDisabled={playAllSongs.length === 0}
          onPlayAll={() => onPlayQueue(playAllSongs, 0)}
        />

        <section className="ncm-artist__body">
          {/* key={tab}：切 Tab 时重挂载内容区，触发 motion.css 的淡入过渡 */}
          <div className="ncm-artist__tab-panel" key={tab}>
            {tab === 'hot' ? <>{renderSongTable(hotSongs)}</> : null}

          {tab === 'all' ? (
            <>
              {allSongs.loading && allSongs.items.length === 0 ? (
                <NcmSkeleton rows={6} />
              ) : (
                renderSongTable(allSongs.items)
              )}
              {allSongs.more ? (
                <button
                  type="button"
                  className="ncm-artist__load-more"
                  disabled={allSongs.loadingMore}
                  onClick={allSongs.loadMore}
                >
                  {allSongs.loadingMore ? '加载中…' : '加载更多'}
                </button>
              ) : null}
            </>
          ) : null}

          {tab === 'albums' ? (
            <>
              {albums.loading && albums.items.length === 0 ? (
                <NcmSkeleton rows={6} variant="grid" />
              ) : albums.items.length === 0 ? (
                <div className="ncm-artist__empty ncm-empty-state">暂无专辑</div>
              ) : (
                <>
                  <div className="ncm-artist__albums">
                    {albums.items.map((album) => (
                      <NcmCoverCard
                        key={album.id}
                        coverUrl={album.coverUrl}
                        title={album.name}
                        active={activeAlbum?.id === album.id}
                        footer={
                          <>
                            {album.type !== '' ? `${album.type} · ` : ''}
                            {formatDate(album.publishTime) || '未知日期'}
                          </>
                        }
                        onClick={() => setActiveAlbum(album)}
                        onPlay={() => void playAlbum(album)}
                        playLabel={`播放专辑：${album.name}`}
                      />
                    ))}
                  </div>
                  {albums.more ? (
                    <button
                      type="button"
                      className="ncm-artist__load-more"
                      disabled={albums.loadingMore}
                      onClick={albums.loadMore}
                    >
                      {albums.loadingMore ? '加载中…' : '加载更多专辑'}
                    </button>
                  ) : null}
                </>
              )}
            </>
          ) : null}

          {tab === 'mvs' ? (
            <>
              {mvs.loading && mvs.items.length === 0 ? (
                <NcmSkeleton rows={4} variant="grid" />
              ) : mvs.items.length === 0 ? (
                <div className="ncm-artist__empty ncm-empty-state">暂无 MV</div>
              ) : (
                <div className="ncm-artist__mvs">
                  {mvs.items.map((mv) => (
                    <NcmMvCard
                      key={mv.id}
                      mv={mv}
                      playing={playingMvId === mv.id}
                      onRequestPlay={handleRequestPlayMv}
                      onStop={() => setPlayingMvId(null)}
                      onNotice={onNotice ?? (() => {})}
                    />
                  ))}
                </div>
              )}
              {mvs.more ? (
                <button
                  type="button"
                  className="ncm-artist__load-more"
                  disabled={mvs.loadingMore}
                  onClick={mvs.loadMore}
                >
                  {mvs.loadingMore ? '加载中…' : '加载更多 MV'}
                </button>
              ) : null}
            </>
          ) : null}
          </div>
        </section>
      </div>

      <NcmAlbumModal
        key={activeAlbum?.id ?? 'closed'}
        album={activeAlbum}
        hasVip={hasVip}
        artistName={artist.name}
        onClose={() => setActiveAlbum(null)}
        onPlayQueue={onPlayQueue}
      />

      <NcmConfirmModal
        open={confirmUnfollow}
        title="取消关注"
        message={`确定不再关注「${artist.name}」吗？`}
        confirmText="取关"
        cancelText="再想想"
        onCancel={() => setConfirmUnfollow(false)}
        onConfirm={() => {
          setConfirmUnfollow(false)
          void applyFollow(false)
        }}
      />
    </div>
  )
}
