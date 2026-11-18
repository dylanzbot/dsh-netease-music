import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUDIO_MARKER_ATTR,
  formatStream,
  getPlayerState,
  isSongLiked,
  qualityLabel,
  qualityLabelOf,
  setVipStatus,
  setVolume,
  stopPlayback,
  subscribePlayer,
  toggleShuffle,
} from '../../src/client/player/engine.js'

describe('engine 纯函数', () => {
  it('qualityLabel：已知等级返回中文标签，未知回退「标准」', () => {
    expect(qualityLabel('standard')).toBe('标准')
    expect(qualityLabel('exhigh')).toBe('极高')
    expect(qualityLabel('lossless')).toBe('无损')
    expect(qualityLabel('jymaster')).toBe('超清母带')
    expect(qualityLabel('not-a-level' as never)).toBe('标准')
  })

  it('qualityLabelOf：未知等级原样返回', () => {
    expect(qualityLabelOf('sky')).toBe('沉浸环绕声')
    expect(qualityLabelOf('weird-level')).toBe('weird-level')
  })

  it.each([
    [320000, 'mp3', '320 kbps MP3'],
    [128000, 'MP3', '128 kbps MP3'],
    [1764000, 'flac', '1.76 Mbps FLAC'],
    [1000000, '', '1.00 Mbps'],
    [0, 'mp3', '未知码率'],
    [-1, 'mp3', '未知码率'],
    [Number.NaN, 'mp3', '未知码率'],
  ])('formatStream(%s, %s) === %s', (br, type, expected) => {
    expect(formatStream(br, type)).toBe(expected)
  })

  it('audio 节点标记属性名稳定（HMR 清理依赖它）', () => {
    expect(AUDIO_MARKER_ATTR).toBe('data-dsh-netease-music-audio')
  })
})

describe('播放器 store', () => {
  beforeEach(() => {
    // stopPlayback 会重置到 INITIAL（保留音质设置），保证用例间不互相污染。
    stopPlayback()
  })

  it('初始状态符合预期', () => {
    const state = getPlayerState()
    expect(state.current).toBeNull()
    expect(state.queue).toEqual([])
    expect(state.index).toBe(-1)
    expect(state.playing).toBe(false)
    expect(state.volume).toBe(0.8)
    expect(state.muted).toBe(false)
    expect(state.shuffle).toBe(false)
    expect(state.error).toBeNull()
    expect(state.likedIds).toEqual([])
  })

  it('subscribePlayer 能收到状态更新，退订后停止', () => {
    const listener = vi.fn()
    const unsubscribe = subscribePlayer(listener)

    setVolume(0.5)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]?.[0].volume).toBe(0.5)

    unsubscribe()
    setVolume(0.6)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('setVolume 把音量夹到 0~1，0 时自动静音', () => {
    setVolume(2)
    expect(getPlayerState().volume).toBe(1)
    expect(getPlayerState().muted).toBe(false)

    setVolume(-3)
    expect(getPlayerState().volume).toBe(0)
    expect(getPlayerState().muted).toBe(true)
  })

  it('toggleShuffle 切换随机播放', () => {
    expect(getPlayerState().shuffle).toBe(false)
    toggleShuffle()
    expect(getPlayerState().shuffle).toBe(true)
    toggleShuffle()
    expect(getPlayerState().shuffle).toBe(false)
  })

  it('setVipStatus 根据 vipType 推导会员标记', () => {
    setVipStatus(0)
    expect(getPlayerState().hasVip).toBe(false)
    expect(getPlayerState().isSvip).toBe(false)

    setVipStatus(100)
    expect(getPlayerState().hasVip).toBe(true)
    expect(getPlayerState().isSvip).toBe(false)

    setVipStatus(110)
    expect(getPlayerState().hasVip).toBe(true)
    expect(getPlayerState().isSvip).toBe(true)
  })

  it('isSongLiked：初始为空，喜欢列表为空时恒为 false', () => {
    expect(isSongLiked(123)).toBe(false)
  })
})
