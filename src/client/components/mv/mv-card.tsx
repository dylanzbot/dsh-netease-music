/* MV 卡片（点击后在原地变成内联 `<video>` 播放器）。 */

import type { NcmMvCardDTO as NcmMvCardData, NcmMvDetailDTO } from '../../../types/index.js'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { getMvDetail } from '../../api/artist.api.js'
import { formatCount, formatDuration } from '../../utils/format.js'
import { retryMessage } from '../../constants/message.js'
import { NcmPlayIcon } from '../base/icons.js'
import { NcmImage } from '../base/image.js'
import { NcmPlayButton } from '../base/play-button.js'
import { availableMvQualities, MV_QUALITY_LABEL, pickDefaultMvQuality, type MvQuality } from '../../utils/mv.js'
import { NcmMvControls, type MvControlMenu } from './mv-controls.js'
import './mv-card.css'

/** 档位类型别名（供本组件内类型标注）。 */
type Quality = MvQuality

/** 档位标签（复用 utils，用于卡片副标题展示）。 */
const QUALITY_LABEL = MV_QUALITY_LABEL

/** MV 卡片 props。 */
export interface NcmMvCardProps {
  readonly mv: NcmMvCardData
  /** 是否当前正在播放（父级统一管理，保证单实例）。 */
  readonly playing: boolean
  /** 申请播放这张 MV（父级会暂停音频、把其他卡切回封面）。 */
  readonly onRequestPlay: (mv: NcmMvCardData) => void
  /** 停止播放（切回封面）。 */
  readonly onStop: () => void
  /** 轻提示（不可播放 / 加载失败等）。 */
  readonly onNotice: (message: string) => void
}

/** MV 卡片（含内联播放器）。 */
export function NcmMvCard({ mv, playing, onRequestPlay, onStop, onNotice }: NcmMvCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  /** 播放器容器：全屏对它调用 requestFullscreen，控制栏与菜单都在全屏元素内部。 */
  const playerRef = useRef<HTMLDivElement | null>(null)

  const [detail, setDetail] = useState<NcmMvDetailDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [quality, setQuality] = useState<Quality | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // 播放器运行时状态
  const [paused, setPaused] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  /** 控制栏/菜单是否显示：鼠标移动即显示，静止 2.5s 后（且播放中）隐藏。 */
  const [controlsVisible, setControlsVisible] = useState(true)
  const [menu, setMenu] = useState<MvControlMenu>(null)
  /** 非全屏音量竖条弹层开关（hover 控制）。 */
  const [volumeOpen, setVolumeOpen] = useState(false)
  /** 关闭音量弹层的延迟计时器（给鼠标从图标移到竖条留时间）。 */
  const volumeTimerRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  /** 切清晰度待恢复的进度（在 onLoadedMetadata 里消费），避免挂一次性监听导致叠加/泄漏。 */
  const pendingSeekRef = useRef<{ at: number; wasPlaying: boolean } | null>(null)
  /** 音量 / 倍速 / menu / paused 的 ref 镜像，供异步 handler 读取最新值，避免陈旧闭包。 */
  const volumeRef = useRef(1)
  const speedRef = useRef(1)
  const menuRef = useRef<MvControlMenu>(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    menuRef.current = menu
  }, [menu])
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  /** 本次播放是否已弹过「不可播放/失败」Toast，避免 onError 重复提示。 */
  const noticedRef = useRef(false)

  // 进入播放态：拉取详情 → 选默认档位。拿不到可播源就弹 Toast 并退回封面。
  useEffect(() => {
    if (!playing) {
      setDetail(null)
      setQuality(null)
      setLoading(false)
      setFailed(false)
      setFullscreen(false)
      setMenu(null)
      noticedRef.current = false
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setFailed(false)
    noticedRef.current = false
    getMvDetail(mv.id, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return
        setDetail(value)
        const picked = pickDefaultMvQuality(value.urls)
        if (picked === null) {
          noticedRef.current = true
          onNotice('该 MV 暂不可播放')
          onStop()
          return
        }
        setQuality(picked)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        noticedRef.current = true
        setFailed(true)
        setLoading(false)
        onNotice(retryMessage('MV 加载失败'))
        onStop()
      })
    return () => controller.abort()
  }, [playing, mv.id, onNotice, onStop])

  // 监听全屏状态。
  useEffect(() => {
    const onFsChange = () => {
      const container = playerRef.current
      setFullscreen(container !== null && document.fullscreenElement === container)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // 点击菜单外部时关闭浮层菜单。
  useEffect(() => {
    if (menu === null) return
    const onDocClick = () => setMenu(null)
    // 用 setTimeout 让触发菜单的这次点击先完成，避免立即被关掉。
    const timer = window.setTimeout(() => document.addEventListener('click', onDocClick), 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', onDocClick)
    }
  }, [menu])

  // 组件卸载 / 停止播放时清掉控制栏自动隐藏计时器。
  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current)
    }
  }, [])

  /** 鼠标移动：显示控制栏并重置隐藏计时。 */
  const revealControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      // 播放中、未暂停、且没有打开菜单时才自动隐藏（读 ref 拿最新值）。
      if (!pausedRef.current && menuRef.current === null) setControlsVisible(false)
    }, 2500)
  }, [])

  /** 显示音量竖条（hover 进入图标或竖条都调用，顺带取消待关闭）。 */
  const revealVolume = useCallback(() => {
    if (volumeTimerRef.current !== null) {
      window.clearTimeout(volumeTimerRef.current)
      volumeTimerRef.current = null
    }
    setVolumeOpen(true)
  }, [])

  /** 延迟关闭音量竖条：给鼠标从图标移到竖条留 180ms，避免移开就消失。 */
  const scheduleHideVolume = useCallback(() => {
    if (volumeTimerRef.current !== null) window.clearTimeout(volumeTimerRef.current)
    volumeTimerRef.current = window.setTimeout(() => setVolumeOpen(false), 180)
  }, [])

  /** 卸载时清掉音量弹层的延迟计时器。 */
  useEffect(() => {
    return () => {
      if (volumeTimerRef.current !== null) window.clearTimeout(volumeTimerRef.current)
    }
  }, [])

  /** 播放 / 暂停。 */
  const togglePlay = () => {
    const video = videoRef.current
    if (video === null) return
    if (video.paused) void video.play().catch(() => onNotice(retryMessage('MV 播放失败')))
    else video.pause()
  }

  /** 拖动进度条。 */
  const onSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (video === null) return
    const time = Number(event.target.value)
    video.currentTime = time
    setCurrentTime(time)
  }

  /** 音量调节。 */
  const onVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (video === null) return
    const value = Number(event.target.value)
    video.volume = value
    video.muted = value === 0
    volumeRef.current = value
    setVolume(value)
    setMuted(value === 0)
  }

  /** 静音切换。 */
  const toggleMute = () => {
    const video = videoRef.current
    if (video === null) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  /* 切清晰度：只记录待恢复进度并更新档位状态。 */
  const changeQuality = (next: Quality) => {
    const video = videoRef.current
    const target = detail?.urls[next]
    if (video === null || target === undefined || next === quality) {
      setMenu(null)
      return
    }
    pendingSeekRef.current = { at: video.currentTime, wasPlaying: !video.paused }
    setMenu(null)
    setQuality(next)
  }

  /** 切换播放速度。 */
  const changeSpeed = (next: number) => {
    const video = videoRef.current
    speedRef.current = next
    setSpeed(next)
    setMenu(null)
    if (video !== null) video.playbackRate = next
  }

  /*
  // 原 MV 下载实现（已注释停用，恢复时取消本块注释）：
  const downloadMv = () => {
    const target = detail !== null && quality !== null ? detail.urls[quality] : undefined
    if (target === undefined) {
      onNotice('当前清晰度暂不可下载')
      return
    }
    const baseName = (detail?.name ?? mv.name).replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
    const fileName = `${baseName}${quality !== null ? ` ${QUALITY_LABEL[quality]}` : ''}.mp4`
    const params = new URLSearchParams({ url: target, name: fileName })
    const href = `/api/ncm/mv/download?${params.toString()}`
    // 单次请求：直接由 <a download> 触发。原先先 fetch 1 字节预检再下载，
    // 同一 URL 会请求两次，大文件/弱网下明显加重宿主代理负担。
    // 接口错误由宿主返回明确状态码；下载失败表现为浏览器原生下载失败。
    const link = document.createElement('a')
    link.href = href
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  */

  /** 进入 / 退出全屏（对整个播放器容器）。 */
  const toggleFullscreen = () => {
    const container = playerRef.current
    if (container === null) return
    if (document.fullscreenElement === container) {
      void document.exitFullscreen?.().catch(() => { })
    } else {
      void container.requestFullscreen?.().catch(() => onNotice('当前环境不支持全屏'))
    }
  }

  /** 画中画切换。 */
  const togglePip = async () => {
    const video = videoRef.current
    if (video === null) return
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture?.()
      } else {
        await video.requestPictureInPicture?.()
      }
    } catch {
      onNotice('当前环境不支持画中画')
    }
  }

  /** video 播放出错（签名失效 / 网络）：弹一次 Toast 并退回封面。 */
  const handleVideoError = () => {
    if (noticedRef.current) return
    noticedRef.current = true
    onNotice(retryMessage('MV 播放失败'))
    onStop()
  }

  const currentSrc = detail !== null && quality !== null ? detail.urls[quality] : undefined
  const isPlaying = playing && currentSrc !== undefined
  const qualityOptions = detail !== null ? availableMvQualities(detail.urls) : []
  const hasPip = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled === true

  return (
    <article className={`ncm-mv-card${isPlaying ? ' ncm-mv-card--playing' : ''}`}>
      {isPlaying ? (
        <div
          ref={playerRef}
          className={`ncm-mv-card__player${controlsVisible || paused || menu !== null ? ' ncm-mv-card__player--show-controls' : ''}`}
          onMouseMove={revealControls}
          onMouseLeave={() => {
            if (!paused && menu === null) setControlsVisible(false)
          }}
        >
          <video
            key={quality ?? 'none'}
            ref={videoRef}
            className="ncm-mv-card__video"
            src={currentSrc}
            playsInline
            onClick={togglePlay}
            onError={handleVideoError}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget
              setDuration(video.duration)
              video.volume = volumeRef.current
              video.playbackRate = speedRef.current
              // 单一持久 handler 处理「首挂载」与「切档后恢复」两种情况。
              const pending = pendingSeekRef.current
              if (pending !== null) {
                pendingSeekRef.current = null
                try {
                  video.currentTime = pending.at
                } catch {
                  // 个别源 metadata 阶段不允许 seek，忽略即可。
                }
                if (pending.wasPlaying) void video.play().catch(() => onNotice(retryMessage('MV 播放失败')))
              } else {
                // 首次进入播放态：自动开始播放。
                void video.play().catch(() => onNotice(retryMessage('MV 播放失败')))
              }
            }}
          />

          {/* 中央播放/暂停大按钮（暂停时显示）。 */}
          {paused ? (
            <button
              type="button"
              className="ncm-mv-card__center-play"
              aria-label="播放"
              onClick={(event) => {
                event.stopPropagation()
                togglePlay()
              }}
            >
              <NcmPlayIcon size={42} />
            </button>
          ) : null}

          {/* ---- 自绘控制栏（拆分为独立组件） ---- */}
          <NcmMvControls
            paused={paused}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            muted={muted}
            speed={speed}
            quality={quality}
            qualityOptions={qualityOptions}
            fullscreen={fullscreen}
            hasPip={hasPip}
            menu={menu}
            volumeOpen={volumeOpen}
            onTogglePlay={togglePlay}
            onSeek={onSeek}
            onVolume={onVolume}
            onToggleMute={toggleMute}
            onChangeQuality={changeQuality}
            onChangeSpeed={changeSpeed}
            onTogglePip={() => void togglePip()}
            onToggleFullscreen={toggleFullscreen}
            onToggleMenu={(next) => setMenu(next)}
            onRevealVolume={revealVolume}
            onScheduleHideVolume={scheduleHideVolume}
          />
        </div>
      ) : (
        <div className="ncm-mv-card__cover">
          <NcmImage className="ncm-mv-card__cover-img" src={mv.coverUrl} variant="playlist" />
          <span className="ncm-mv-card__shade" aria-hidden="true" />
          <NcmPlayButton scene="cover" label={`播放 MV：${mv.name}`} loading={loading} onClick={() => onRequestPlay(mv)} />
          {failed ? <span className="ncm-mv-card__badge">加载失败</span> : null}
        </div>
      )}
      <div className="ncm-mv-card__meta">
        <span className="ncm-mv-card__name" title={mv.name}>
          {detail?.name ?? mv.name}
        </span>
        <span className="ncm-mv-card__sub ncm-ellipsis">
          {formatDuration(mv.durationMs)} · 播放 {formatCount(mv.playCount)}
          {isPlaying && quality !== null ? ` · ${QUALITY_LABEL[quality]}` : ''}
        </span>
      </div>
    </article>
  )
}
