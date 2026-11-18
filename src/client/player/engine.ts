/* 网易云音乐播放器引擎（浏览器侧单例）。 */

import type { NcmPlayerStateVO, NcmQualityLevel, NcmSongDTO, PlaybackUnavailableReason } from '../../types/index.js'
import {
  DEFAULT_SONG_QUALITY,
  SONG_QUALITY_OPTIONS,
  getLikedSongIds,
  getSongUrl,
  setSongLike,
} from '../api/song.api.js'
import { getComments } from '../api/comment.api.js'
import { createEmitter, createStore } from '../utils/pubsub.js'
import { logError, logWarn } from '../utils/logger.js'
import { MSG_OPERATION_FAILED, MSG_PLAY_FAILED } from '../constants/message.js'

/** 本地存储：用户选择的音质。 */
const QUALITY_STORAGE_KEY = 'dsh-netease-music:quality'
const BLANK_LIKED_IDS: readonly number[] = []

/* 标识「本插件创建的 audio 元素」的 data 属性。 */
export const AUDIO_MARKER_ATTR = 'data-dsh-netease-music-audio'

/** 清掉页面里所有本插件残留的 audio 节点。 */
function removePluginAudioElements(): void {
  if (typeof document === 'undefined') return
  const stale = document.querySelectorAll<HTMLAudioElement>(`audio[${AUDIO_MARKER_ATTR}]`)
  stale.forEach((el) => {
    try {
      el.pause()
    } catch {
      // 忽略暂停失败（节点可能已被移除）
    }
    el.remove()
  })
}

/** 旧版本存的是 br 数字，做一次迁移。 */
const LEGACY_QUALITY_BR: Readonly<Record<string, NcmQualityLevel>> = {
  '128000': 'standard',
  '192000': 'higher',
  '320000': 'exhigh',
  '990000': 'lossless',
}

/** 读取持久化的音质设置；非法 / 不可用则回退默认。 */
function readStoredQuality(): NcmQualityLevel {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SONG_QUALITY
    const raw = localStorage.getItem(QUALITY_STORAGE_KEY) ?? ''
    if (SONG_QUALITY_OPTIONS.some((option) => option.level === raw)) return raw as NcmQualityLevel
    return LEGACY_QUALITY_BR[raw] ?? DEFAULT_SONG_QUALITY
  } catch {
    return DEFAULT_SONG_QUALITY
  }
}

/** 音质等级 → 展示文案。 */
export function qualityLabel(level: NcmQualityLevel): string {
  return SONG_QUALITY_OPTIONS.find((option) => option.level === level)?.label ?? '标准'
}

/** 上游返回的 level 字符串 → 展示文案（未知等级原样返回）。 */
export function qualityLabelOf(level: string): string {
  const option = SONG_QUALITY_OPTIONS.find((item) => item.level === level)
  return option !== undefined ? option.label : level
}

/** 实际码率 → 「320 kbps MP3」/「1.7 Mbps FLAC」。 */
export function formatStream(br: number, type: string): string {
  if (!Number.isFinite(br) || br <= 0) return '未知码率'
  const bitrate = br >= 1_000_000 ? `${(br / 1_000_000).toFixed(2)} Mbps` : `${Math.round(br / 1000)} kbps`
  return type !== '' ? `${bitrate} ${type.toUpperCase()}` : bitrate
}

const INITIAL: NcmPlayerStateVO = {
  current: null,
  queue: [],
  index: -1,
  playing: false,
  loading: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  hasVip: false,
  isSvip: false,
  quality: DEFAULT_SONG_QUALITY,
  stream: null,
  commentCount: null,
  likedIds: BLANK_LIKED_IDS,
  busy: false,
  error: null,
  unavailable: {},
}

const store = createStore<NcmPlayerStateVO>({ ...INITIAL, quality: readStoredQuality() })

/** 播放提示（Toast 等），页面层订阅。 */
export const playerNotice = createEmitter<string>()

let audio: HTMLAudioElement | null = null

/* 播放请求代次：快速切歌时旧请求不得再改状态 / 报错。 */
let playSeq = 0
/** 最近一次真正开始播放的请求代次（用于区分 audio error 的归属）。 */
let activePlaySeq = 0
/** timeupdate 节流时间戳：约每 500ms 通知一次，避免订阅者高频重渲染。 */
let lastTimeUpdate = 0

/** 递增代次，使所有在途的 loadAndPlay 立即失效。 */
function invalidatePlayback(): void {
  playSeq += 1
}

/** 随机播放 / 上一首使用的播放历史（存队列下标）。 */
let playHistory: number[] = []
let historyCursor = -1

/** 记录一次成功播放，供「上一首」回退。 */
function rememberPlay(index: number): void {
  if (historyCursor >= 0 && playHistory[historyCursor] === index) return
  playHistory = playHistory.slice(0, historyCursor + 1)
  playHistory.push(index)
  historyCursor = playHistory.length - 1
}

/** 读取当前状态（供 useNcmPlayer 初始化）。 */
export function getPlayerState(): NcmPlayerStateVO {
  return store.get()
}

/** 订阅状态变化。 */
export function subscribePlayer(listener: (state: NcmPlayerStateVO) => void): () => void {
  return store.subscribe(listener)
}

/** 更新状态并通知订阅者。 */
function emit(patch: Partial<NcmPlayerStateVO>): void {
  store.set(patch)
}

/** 懒创建唯一的 Audio 节点（挂到 body 上，display:none 不影响布局）。 */
function ensureAudio(): HTMLAudioElement | null {
  if (audio !== null) return audio
  if (typeof Audio === 'undefined') return null

  // 创建前先清空页面上所有属于本插件的残留 audio（HMR / 旧实例），避免叠加播放。
  removePluginAudioElements()

  audio = new Audio()
  // 打上插件归属标识，便于下次创建前清理，也方便在 DevTools 里辨认。
  audio.setAttribute(AUDIO_MARKER_ATTR, '')
  audio.preload = 'auto'
  audio.volume = store.get().volume
  audio.style.display = 'none'

  audio.addEventListener('timeupdate', () => {
    const now = Date.now()
    if (now - lastTimeUpdate < 500) return
    lastTimeUpdate = now
    const target = audio
    if (target === null) return
    const duration = Number.isFinite(target.duration) ? target.duration : store.get().duration
    emit({ currentTime: target.currentTime, duration })
  })
  audio.addEventListener('loadedmetadata', () => {
    if (audio !== null && Number.isFinite(audio.duration)) emit({ duration: audio.duration })
  })
  audio.addEventListener('play', () => emit({ playing: true, loading: false }))
  audio.addEventListener('pause', () => emit({ playing: false }))
  audio.addEventListener('ended', () => next())
  audio.addEventListener('error', (event) => {
    // 旧请求被新切歌中断时，浏览器也可能在共享 audio 上抛 error；不算真实失败。
    if (activePlaySeq !== playSeq) return
    const target = event.currentTarget as HTMLAudioElement | null
    logError('player/audio', 'audio error', { hasSrc: target !== null && target.src !== '' })
    emit({ playing: false, loading: false, error: '播放失败，可能是版权限制或网络问题' })
    playerNotice.publish('播放失败，可能是版权限制或网络问题')
  })

  if (typeof document !== 'undefined' && document.body !== null) {
    document.body.appendChild(audio)
  }
  return audio
}

/* 加载并播放一首歌。 */
/* 拉取指定歌曲的评论数（best-effort，失败保持 null）。 */
async function loadCommentCount(songId: number): Promise<void> {
  try {
    const page = await getComments('song', songId, 1, 0)
    if (store.get().current?.id === songId) {
      emit({ commentCount: page.total })
    }
  } catch {
    // 忽略：评论数失败不影响播放
  }
}

async function loadAndPlay(song: NcmSongDTO, targetIndex: number, nextQueue?: readonly NcmSongDTO[]): Promise<void> {
  const seq = ++playSeq
  emit({ loading: true, error: null })
  // 换歌：先清空评论数（异步拉取放到播放成功、current 设置之后，避免串歌判断失效）。
  emit({ commentCount: null })
  try {
    const { url, br, type, level } = await getSongUrl(song.id, store.get().quality)
    if (seq !== playSeq) return // 已被更新的切歌取代
    if (url === '') {
      const reason: PlaybackUnavailableReason = song.fee === 1 ? 'vip' : 'copyright'
      emit({
        loading: false,
        stream: null,
        unavailable: { ...store.get().unavailable, [song.id]: reason },
      })
      playerNotice.publish(
        reason === 'vip'
          ? `《${song.name}》需要黑胶会员，暂时无法播放`
          : `《${song.name}》无版权，暂时无法播放`,
      )
      return
    }

    const target = ensureAudio()
    if (target === null) {
      emit({ loading: false })
      playerNotice.publish('当前环境不支持音频播放')
      return
    }

    target.src = url
    target.currentTime = 0
    activePlaySeq = seq
    await target.play()
    if (seq !== playSeq) return // play() 期间又被切歌，忽略旧结果
    const nextUnavailable = { ...store.get().unavailable }
    delete nextUnavailable[song.id]
    rememberPlay(targetIndex)
    emit({
      ...(nextQueue !== undefined ? { queue: nextQueue } : {}),
      current: song,
      index: targetIndex,
      currentTime: 0,
      duration: song.durationMs / 1000 || target.duration || 0,
      playing: true,
      loading: false,
      error: null,
      stream: { br, type, level },
      unavailable: nextUnavailable,
    })
    // 播放成功、current 已是本歌，再异步拉取评论数（不阻塞播放）。
    void loadCommentCount(song.id)
  } catch (error) {
    // 过期请求的失败直接吞掉：新歌正在播放，旧 play() 被中断不是真失败。
    if (seq !== playSeq) return
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'AbortError') return // 被新的 load 中断
    const message = error instanceof Error ? error.message : String(error)
    logWarn('player/load', 'play failed', { songId: song.id, message })
    emit({ loading: false, playing: false, stream: null })
    playerNotice.publish(
      message.includes('NotAllowed') ? '浏览器拦截了自动播放，请再点一次播放按钮' : MSG_PLAY_FAILED,
    )
  }
}

/** 播放一组歌曲（新队列，只有第一首成功后才替换当前队列）。 */
export function playSongs(songs: readonly NcmSongDTO[], startIndex = 0): void {
  const queue = songs.filter((song) => song.id > 0)
  if (queue.length === 0) return
  const index = Math.max(0, Math.min(startIndex, queue.length - 1))
  const current = queue[index]
  if (current === undefined) return
  playHistory = [index]
  historyCursor = 0
  emit({ loading: true, error: null })
  void loadAndPlay(current, index, queue)
}

/** 播放 / 暂停。 */
export function togglePlay(): void {
  const current = store.get().current
  if (current === null) return
  const target = ensureAudio()
  if (target === null) return
  if (target.paused) {
    if (target.src === '') {
      void loadAndPlay(current, store.get().index)
    } else {
      void target.play().catch(() => playerNotice.publish(MSG_PLAY_FAILED))
    }
  } else {
    target.pause()
  }
}

/** 上一首；播放超过 3 秒时先回到本首开头。 */
export function playPrevious(): void {
  const state = store.get()
  if (state.current === null) return
  if (state.currentTime > 3) {
    seek(0)
    return
  }
  if (state.queue.length === 0) return
  // 随机模式下优先沿播放历史回退；没有历史时再按队列上一首。
  if (state.shuffle && historyCursor > 0) {
    historyCursor -= 1
    const historyIndex = playHistory[historyCursor]
    const historySong = historyIndex !== undefined ? state.queue[historyIndex] : undefined
    if (historyIndex !== undefined && historySong !== undefined) {
      void loadAndPlay(historySong, historyIndex)
      return
    }
  }
  const index = state.index <= 0 ? state.queue.length - 1 : state.index - 1
  const song = state.queue[index]
  if (song !== undefined) void loadAndPlay(song, index)
}

/** 下一首。 */
export function next(): void {
  const state = store.get()
  if (state.queue.length === 0) return
  let index = state.index
  if (state.shuffle) {
    // 随机播放：尽量避免连续重复当前歌曲。
    if (state.queue.length === 1) {
      index = 0
    } else {
      do {
        index = Math.floor(Math.random() * state.queue.length)
      } while (index === state.index)
    }
  } else {
    // 随机播放关闭 == 顺序播放：按队列顺序循环下一首。
    index = (state.index + 1) % state.queue.length
  }
  const song = state.queue[index]
  if (song !== undefined) void loadAndPlay(song, index)
}

/** 跳转进度（秒）。 */
export function seek(seconds: number): void {
  if (store.get().current === null) return
  const target = ensureAudio()
  if (target === null || !Number.isFinite(seconds)) return
  target.currentTime = Math.max(0, seconds)
  emit({ currentTime: target.currentTime })
}

/** 设置音量（0-1）。 */
export function setVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume))
  const target = ensureAudio()
  if (target !== null) {
    target.volume = clamped
    target.muted = clamped === 0
  }
  emit({ volume: clamped, muted: clamped === 0 })
}

/** 静音开关。 */
export function toggleMute(): void {
  const target = ensureAudio()
  if (target === null) return
  target.muted = !target.muted
  emit({ muted: target.muted })
}

/** 同步当前账号会员状态（hasVip 用于队列标签，isSvip 用于音质档位）。 */
export function setVipStatus(vipType: number): void {
  emit({ hasVip: vipType > 0, isSvip: vipType >= 110 })
}

/** 随机播放开关。 */
export function toggleShuffle(): void {
  emit({ shuffle: !store.get().shuffle })
}

/* 切换音质。 */
export async function setQuality(level: NcmQualityLevel): Promise<void> {
  if (!SONG_QUALITY_OPTIONS.some((option) => option.level === level)) return
  if (store.get().busy) return
  const previous = store.get().quality
  if (previous === level) return
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(QUALITY_STORAGE_KEY, level)
  } catch {
    // localStorage 不可用时仅本次会话生效
  }
  emit({ quality: level, busy: true })

  const state = store.get()
  const song = state.current
  // 注意：不能因为 ensureAudio() 还没创建音频节点就当作「没在播放」。
  // 只有当前确实没有歌曲时，才提示「下一首生效」；否则重建当前歌曲音源、本首立即生效。
  const target = ensureAudio()
  if (song === null) {
    emit({ busy: false })
    playerNotice.publish(`音质已设为${qualityLabel(level)}，下一首生效`)
    return
  }
  if (target === null) {
    emit({ busy: false })
    playerNotice.publish(`音质已设为${qualityLabel(level)}，播放时生效`)
    return
  }

  /** 回退到切换前的音质。 */
  const rollbackQuality = () => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(QUALITY_STORAGE_KEY, previous)
    } catch {
      // ignore
    }
    emit({ quality: previous, busy: false })
  }

  const resumeAt = target.currentTime
  const wasPlaying = !target.paused
  try {
    const { url, br, type, level: actualLevel } = await getSongUrl(song.id, level)
    if (url === '') {
      rollbackQuality()
      playerNotice.publish(`${qualityLabel(level)}暂不可用（可能需要更高会员），已保留${qualityLabel(previous)}`)
      return
    }
    target.src = url
    target.currentTime = resumeAt
    if (wasPlaying) await target.play()
    emit({ busy: false, error: null, stream: { br, type, level: actualLevel } })
    const actual = formatStream(br, type)
    playerNotice.publish(
      actualLevel !== level && actualLevel !== ''
        ? `已切换为${qualityLabel(level)}（上游回退到${qualityLabelOf(actualLevel)} · ${actual}）`
        : `已切换为${qualityLabel(level)}（${actual}）`,
    )
  } catch {
    rollbackQuality()
    playerNotice.publish('切换音质失败，已保留原音质')
  }
}

/** 加载「我喜欢的音乐」ID 列表（登录成功后调用）。 */
export async function loadLikedSongs(): Promise<void> {
  try {
    const ids = await getLikedSongIds()
    emit({ likedIds: ids })
  } catch {
    // 喜欢列表拉取失败不影响播放，保持空列表
  }
}

/** 判断某首歌是否已喜欢。 */
export function isSongLiked(id: number): boolean {
  return store.get().likedIds.includes(id)
}

/** 喜欢 / 取消喜欢（乐观更新，失败回滚并提示）。 */
export async function toggleLike(id: number): Promise<void> {
  if (store.get().busy) return
  const state = store.get()
  const liked = state.likedIds.includes(id)
  const next = !liked
  const optimistic = next ? [...state.likedIds, id] : state.likedIds.filter((item) => item !== id)
  emit({ likedIds: optimistic, busy: true })
  try {
    await setSongLike(id, next)
    emit({ busy: false })
    playerNotice.publish(next ? '已添加到我喜欢的音乐' : '已取消喜欢')
  } catch {
    emit({ likedIds: state.likedIds, busy: false })
    playerNotice.publish(MSG_OPERATION_FAILED)
  }
}

/** 停止并清空播放器（退出登录时调用）；音质设置保留。 */
export function stopPlayback(): void {
  invalidatePlayback() // 作废在途的切歌请求（退出登录 / 清空播放器）
  playHistory = []
  historyCursor = -1
  const target = ensureAudio()
  if (target !== null) {
    target.pause()
    target.removeAttribute('src')
    target.load()
  }
  emit({ ...INITIAL, quality: store.get().quality })
}

/* 若音频正在播放则暂停（不清空队列）。 */
export function pausePlaybackIfPlaying(): boolean {
  const target = ensureAudio()
  if (target === null || target.paused) return false
  target.pause()
  return true
}
