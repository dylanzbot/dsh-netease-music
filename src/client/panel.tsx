/* 中间主面板区的网易云音乐 UI。 */

import type { NcmAlbumCardDTO, NcmMeDTO, NcmPlaylistCardDTO, NcmRelationKindVO, NcmSettingsDTO, NcmSongDTO } from '../types/index.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuthStatus, getMe, logout as requestLogout } from './api/account.api.js'
import { getSettings } from './api/settings.api.js'
import { getMyPlaylists, getPlaylistSongs } from './api/playlist.api.js'
import ArtistListPage from './pages/artist-list/page.js'
import ArtistPage from './pages/artist/page.js'
import ErrorPage from './pages/error/page.js'
import HomePage from './pages/home/page.js'
import LoginPage from './pages/login/page.js'
import LoadingPage from './pages/loading/page.js'
import MinePage from './pages/mine/page.js'
import PlaylistPage from './pages/playlist/page.js'
import { NcmNavRail } from './components/common/nav-rail.js'
import { NcmAlbumModal } from './components/album/album-modal.js'
import { NcmConfirmModal } from './components/base/confirm-modal.js'
import { NcmPlayerBar } from './components/player/player-bar.js'
import { NcmRelationModal } from './components/user/relation-modal.js'
import { NcmToast } from './components/base/toast.js'
import { NcmCommentDrawer } from './components/comment/comment-drawer.js'
import { loadLikedSongs, playSongs, playerNotice, setVipStatus, stopPlayback } from './player/engine.js'
import { ApiError } from './utils/request.js'
import { logError, logInfo } from './utils/logger.js'
import { ERROR_CODE_NOT_LOGGED_IN } from '../constants/error-code.js'
import { MSG_LOAD_FAILED, retryMessage } from './constants/message.js'

/** 主面板区注入的 props。 */
export interface NcmPanelProps {
  /** 期望的方形边长（面板区一般不传）。 */
  readonly size?: number
  /** 当前面板是否被选中。 */
  readonly active?: boolean
}

/** 页面阶段。 */
type Phase = 'booting' | 'guest' | 'member' | 'error'

/** 登录后的三个页面。 */
type Tab = 'home' | 'artist' | 'mine'

/**
 * 面板主体。
 */
export function NcmPanel() {
  const [phase, setPhase] = useState<Phase>('booting')
  const [me, setMe] = useState<NcmMeDTO | null>(null)
  const [tab, setTab] = useState<Tab>('mine')
  const [activePlaylist, setActivePlaylist] = useState<NcmPlaylistCardDTO | null>(null)
  /** 当前打开的歌手详情（null 表示停留在歌手列表）。 */
  const [activeArtist, setActiveArtist] = useState<{ id: number; name: string } | null>(null)
  /** 从搜索结果打开的专辑弹窗。 */
  const [activeAlbum, setActiveAlbum] = useState<NcmAlbumCardDTO | null>(null)
  const [errorText, setErrorText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [relationKind, setRelationKind] = useState<'follows' | 'fans' | null>(null)
  const [commentSong, setCommentSong] = useState<NcmSongDTO | null>(null)
  const [settings, setSettings] = useState<NcmSettingsDTO>({ showFollowStats: true })
  const bootSeq = useRef(0)
  const toastTimer = useRef<number | null>(null)

  /** 重新判断登录态并加载「我的」数据。 */
  const load = useCallback(async () => {
    const seq = ++bootSeq.current
    setPhase('booting')
    setErrorText('')
    try {
      const status = await getAuthStatus()
      if (seq !== bootSeq.current) return
      if (!status.loggedIn) {
        setMe(null)
        setPhase('guest')
        return
      }
      const [data, prefs] = await Promise.all([
        getMe(),
        getSettings().catch(() => ({ showFollowStats: true })),
      ])
      if (seq !== bootSeq.current) return
      setMe(data)
      setSettings(prefs)
      setVipStatus(data.profile.vipType)
      // 拉取「我喜欢的音乐」ID，供播放栏喜欢按钮判断状态（失败不影响主流程）。
      void loadLikedSongs()
      setTab('mine')
      setActivePlaylist(null)
      setPhase('member')
      logInfo('panel/boot', 'logged in', { userId: data.profile.userId })
    } catch (error) {
      if (seq !== bootSeq.current) return
      logError('panel/boot', 'load failed', {
        code: error instanceof ApiError ? error.code : '',
        message: error instanceof Error ? error.message : String(error),
      })
      if (error instanceof ApiError && error.code === ERROR_CODE_NOT_LOGGED_IN) {
        setMe(null)
        setPhase('guest')
        return
      }
      setErrorText(error instanceof Error ? error.message : MSG_LOAD_FAILED)
      setPhase('error')
    }
  }, [])

  /* 只刷新歌单列表（收藏 / 取消收藏后调用）。 */
  const refreshPlaylists = useCallback(async () => {
    try {
      const lists = await getMyPlaylists()
      setMe((prev) =>
        prev === null
          ? prev
          : { ...prev, liked: lists.liked, playlists: lists.playlists, collections: lists.collections },
      )
    } catch {
      // 刷新失败不打断当前界面，下次进入「我的」仍会重新加载。
    }
  }, [])

  useEffect(() => {
    void load()
    return () => {
      bootSeq.current += 1
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    }
  }, [load])

  // 设置页切换开关后，已打开的面板实时刷新显示状态。
  useEffect(() => {
    const refresh = () => {
      void getSettings()
        .then(setSettings)
        .catch(() => {})
    }
    window.addEventListener('ncm-settings-changed', refresh)
    return () => window.removeEventListener('ncm-settings-changed', refresh)
  }, [])

  /** 退出登录（确认后调用）。 */
  const handleLogout = useCallback(async () => {
    try {
      await requestLogout()
    } catch {
      // 即使宿主侧网络异常，也把本地界面切回登录页；Cookie 由宿主优先清理。
    }
    stopPlayback()
    setVipStatus(0)
    setSettings({ showFollowStats: true })
    setMe(null)
    setActivePlaylist(null)
    setActiveArtist(null)
    setPhase('guest')
    setLogoutConfirmOpen(false)
  }, [])

  /** 小提示（歌单加载等）。 */
  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  /** 搜索 / 新歌点击：加入播放并开始播放。 */
  const handlePickSong = useCallback((song: NcmSongDTO, queue?: readonly NcmSongDTO[], index?: number) => {
    playSongs(queue !== undefined && queue.length > 0 ? queue : [song], index ?? 0)
  }, [])

  // 播放提示（版权 / 会员 / 网络错误）统一由引擎发布，这里转成 Toast。
  useEffect(() => playerNotice.subscribe((message) => showToast(message)), [showToast])

  /** 点击歌单卡片其他区域：进入歌单详情页。 */
  const handleOpenPlaylist = useCallback((playlist: NcmPlaylistCardDTO) => {
    setActivePlaylist(playlist)
  }, [])

  /** 搜索结果点击歌手：切到「歌手」tab 并打开该歌手详情。 */
  const handleOpenArtistFromSearch = useCallback((artist: { id: number; name: string }) => {
    setActivePlaylist(null)
    setTab('artist')
    setActiveArtist({ id: artist.id, name: artist.name })
  }, [])

  /** 点击歌单封面播放按钮：拉取整张歌单并从第一首开始播放。 */
  const handlePlayPlaylist = useCallback(
    async (playlist: NcmPlaylistCardDTO) => {
      showToast(`正在播放「${playlist.name}」…`)
      try {
        const songs = await getPlaylistSongs(playlist.id)
        if (songs.length === 0) {
          showToast('这个歌单还没有可播放的歌曲')
          return
        }
        playSongs(songs, 0)
        setToast(null)
      } catch {
        showToast(retryMessage('歌单加载失败'))
      }
    },
    [showToast],
  )

  if (phase === 'booting') {
    return (
      <div className="ncm-panel">
        <LoadingPage />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="ncm-panel">
        <ErrorPage message={errorText} onRetry={() => void load()} />
      </div>
    )
  }

  if (phase === 'guest' || me === null) {
    return (
      <div className="ncm-panel">
        <LoginPage onLoggedIn={() => void load()} />
      </div>
    )
  }

  return (
    <div className="ncm-panel">
      <div className="ncm-shell">
        <div className="ncm-shell__main">
          {activePlaylist !== null ? (
            <PlaylistPage
              playlist={activePlaylist}
              me={me}
              onBack={() => {
                setActivePlaylist(null)
                void refreshPlaylists()
              }}
              onSelectPlaylist={setActivePlaylist}
              onPlayQueue={(songs, index) => playSongs(songs, index)}
              onMeChanged={() => void refreshPlaylists()}
            />
          ) : tab === 'artist' && activeArtist !== null ? (
            <ArtistPage
              artistId={activeArtist.id}
              hasVip={me.profile.vipType > 0 || me.profile.vipLevel !== undefined}
              onBack={() => setActiveArtist(null)}
              onPlayQueue={(songs, index) => playSongs(songs, index)}
              onNotice={showToast}
            />
          ) : tab === 'artist' ? (
            <ArtistListPage onOpenArtist={(artist) => setActiveArtist({ id: artist.id, name: artist.name })} />
          ) : tab === 'home' ? (
            <HomePage
              profile={me.profile}
              onPickSong={handlePickSong}
              onOpenPlaylist={handleOpenPlaylist}
              onPlayPlaylist={handlePlayPlaylist}
              onOpenArtist={handleOpenArtistFromSearch}
              onOpenAlbum={setActiveAlbum}
            />
          ) : (
            <MinePage
              me={me}
              onPickSong={handlePickSong}
              onOpenPlaylist={handleOpenPlaylist}
              onPlayPlaylist={handlePlayPlaylist}
              onOpenRelation={(kind: NcmRelationKindVO) => setRelationKind(kind)}
              showFollowStats={settings.showFollowStats}
              onOpenArtist={handleOpenArtistFromSearch}
              onOpenAlbum={setActiveAlbum}
            />
          )}
        </div>

        <NcmPlayerBar onOpenComments={(song) => setCommentSong(song)} />

        <NcmRelationModal kind={relationKind} onClose={() => setRelationKind(null)} onNotice={showToast} />

        <NcmAlbumModal
          key={activeAlbum?.id ?? 'closed'}
          album={activeAlbum}
          hasVip={me.profile.vipType > 0 || me.profile.vipLevel !== undefined}
          artistName={activeAlbum?.artistName ?? ''}
          onClose={() => setActiveAlbum(null)}
          onPlayQueue={(songs, index) => playSongs(songs, index)}
        />

        <NcmCommentDrawer
          open={commentSong !== null}
          onClose={() => setCommentSong(null)}
          song={commentSong}
          currentUserId={me?.profile.userId ?? 0}
          onNotice={showToast}
        />

        <NcmNavRail
          active={tab}
          onSelect={(next) => {
            setActivePlaylist(null)
            setActiveArtist(null)
            setTab(next)
            if (next === 'mine') void refreshPlaylists()
          }}
          onLogout={() => setLogoutConfirmOpen(true)}
        />

        <NcmConfirmModal
          open={logoutConfirmOpen}
          title="退出登录"
          message="退出后将清除本地保存的登录凭证，确定要退出吗？"
          confirmText="退出登录"
          cancelText="再想想"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => void handleLogout()}
        />

        {toast !== null ? <NcmToast message={toast} /> : null}
      </div>
    </div>
  )
}
