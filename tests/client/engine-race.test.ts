// @vitest-environment jsdom
import type { NcmSongDTO } from '../../src/types/index.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSongUrl } from '../../src/client/api/song.api.js'
import { playerNotice, playSongs } from '../../src/client/player/engine.js'

vi.mock('../../src/client/api/song.api.js', () => ({
  DEFAULT_SONG_QUALITY: 'exhigh',
  SONG_QUALITY_OPTIONS: [{ level: 'exhigh', label: '极高', desc: '', tier: 'vip' }],
  getLikedSongIds: vi.fn(async () => []),
  getSongUrl: vi.fn(),
  setSongLike: vi.fn(),
}))
vi.mock('../../src/client/api/comment.api.js', () => ({
  getComments: vi.fn(async () => ({ comments: [], total: 0, more: false })),
}))

const getSongUrlMock = vi.mocked(getSongUrl)

function makeSong(id: number): NcmSongDTO {
  return { id, name: `song-${id}`, durationMs: 60_000, fee: 0, artists: [], album: '' } as NcmSongDTO
}

describe('S1：快速切歌的代次保护', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getSongUrlMock.mockReset()
  })

  it('旧 play() 被新切歌中断时不误报「播放失败」', async () => {
    const notices: string[] = []
    const unsubscribe = playerNotice.subscribe((message) => notices.push(message))

    let interrupted = 0
    const pending: Array<{ reject: (error: DOMException) => void }> = []
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () {
      // 模拟新 load 打断尚未完成的旧 play()
      for (const entry of pending.splice(0)) {
        interrupted += 1
        entry.reject(new DOMException('interrupted', 'AbortError'))
      }
      return new Promise<void>((_resolve, reject) => pending.push({ reject }))
    })

    let resolveFirstUrl!: (value: { url: string; br: number; type: string; level: string }) => void
    getSongUrlMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstUrl = resolve
          }),
      )
      .mockResolvedValueOnce({ url: 'https://x/b.mp3', br: 320000, type: 'mp3', level: 'exhigh' })

    playSongs([makeSong(1)])
    // 等 A 拿到 url 并进入未完成的 play()
    await vi.waitFor(() => expect(getSongUrlMock).toHaveBeenCalledTimes(1))
    resolveFirstUrl({ url: 'https://x/a.mp3', br: 320000, type: 'mp3', level: 'exhigh' })
    await vi.waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1))

    // 此时 B 切歌：第二次 play() 会打断 A 尚未完成的 play()
    playSongs([makeSong(2)])

    await vi.waitFor(() => expect(interrupted).toBe(1))
    expect(notices.filter((message) => message.includes('播放失败'))).toEqual([])

    unsubscribe()
  })
})
