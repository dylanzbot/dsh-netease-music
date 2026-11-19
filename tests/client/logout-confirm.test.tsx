// @vitest-environment jsdom
import type { NcmMeDTO } from '../../src/types/index.js'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthStatus, getMe, logout as requestLogout } from '../../src/client/api/account.api.js'
import { getSettings } from '../../src/client/api/settings.api.js'
import { NcmPanel } from '../../src/client/panel.js'

vi.mock('../../src/client/api/account.api.js', () => ({
  getAuthStatus: vi.fn(),
  getMe: vi.fn(),
  logout: vi.fn(),
}))
vi.mock('../../src/client/api/settings.api.js', () => ({ getSettings: vi.fn() }))
vi.mock('../../src/client/api/playlist.api.js', () => ({
  getMyPlaylists: vi.fn(async () => ({ liked: null, playlists: [], collections: [] })),
  getPlaylistSongs: vi.fn(async () => []),
}))
vi.mock('../../src/client/player/engine.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/player/engine.js')>()
  return {
    ...actual,
    getPlayerState: vi.fn(() => ({
      current: null, queue: [], index: -1, playing: false, loading: false,
      currentTime: 0, duration: 0, volume: 0.8, muted: false, shuffle: false,
      hasVip: false, isSvip: false, quality: 'exhigh', stream: null,
      commentCount: null, likedIds: [], busy: false, error: null, unavailable: {},
    })),
    loadLikedSongs: vi.fn(async () => {}),
    playSongs: vi.fn(),
    playerNotice: { subscribe: () => () => {} },
    setVipStatus: vi.fn(),
    stopPlayback: vi.fn(),
  }
})

const me = {
  profile: {
    userId: 1, nickname: 'tester', avatarUrl: '', backgroundUrl: '', signature: '',
    gender: 0, level: 1, listenSongs: 10, vipType: 0, follows: 0, followeds: 0,
    playlistCount: 0, createTime: 0,
  },
  liked: null,
  playlists: [],
  collections: [],
} as unknown as NcmMeDTO

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthStatus).mockResolvedValue({ loggedIn: true })
  vi.mocked(getMe).mockResolvedValue(me)
  vi.mocked(getSettings).mockResolvedValue({ showFollowStats: true })
  vi.mocked(requestLogout).mockResolvedValue({ loggedIn: false })
})

describe('退出登录二次确认', () => {
  it('点「退出」只弹确认框，不立刻退出', async () => {
    render(<NcmPanel />)
    await screen.findByText('tester')

    fireEvent.click(document.querySelector<HTMLButtonElement>('.ncm-nav-rail__btn--quiet')!)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('退出后将清除本地保存的登录凭证，确定要退出吗？')).toBeTruthy()
    expect(requestLogout).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '再想想' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(requestLogout).not.toHaveBeenCalled()
  })

  it('确认后才真正调用退出接口', async () => {
    render(<NcmPanel />)
    await screen.findByText('tester')

    fireEvent.click(document.querySelector<HTMLButtonElement>('.ncm-nav-rail__btn--quiet')!)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '退出登录' }))

    await vi.waitFor(() => expect(requestLogout).toHaveBeenCalledTimes(1))
  })
})
