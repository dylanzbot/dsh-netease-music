// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NcmSongDTO } from '../../src/types/index.js'
import { NcmSongTag } from '../../src/client/components/base/tags.js'

const vipSong = { id: 1, fee: 1 } as NcmSongDTO
const svipSong = { id: 2, fee: 4 } as NcmSongDTO
const freeSong = { id: 3, fee: 0 } as NcmSongDTO

describe('NcmSongTag', () => {
  it('会员歌始终显示黑胶标签，与 hasVip 无关', () => {
    expect(render(<NcmSongTag song={vipSong} />).container.textContent).toBe('黑胶会员')
    expect(render(<NcmSongTag song={vipSong} hasVip={true} />).container.textContent).toBe('黑胶会员')
    expect(render(<NcmSongTag song={svipSong} hasVip={true} />).container.textContent).toBe('黑胶会员')
  })

  it('reason=vip 时也显示标签', () => {
    expect(render(<NcmSongTag song={freeSong} reason="vip" />).container.textContent).toBe('黑胶会员')
    expect(render(<NcmSongTag song={freeSong} reason="vip" hasVip={true} />).container.textContent).toBe('黑胶会员')
  })

  it('无版权标签优先于会员判断', () => {
    expect(render(<NcmSongTag song={{ ...vipSong, noCopyright: true }} hasVip={true} />).container.textContent).toBe('无版权')
    expect(render(<NcmSongTag song={vipSong} reason="copyright" hasVip={true} />).container.textContent).toBe('无版权')
  })

  it('普通免费歌曲不显示任何标签', () => {
    expect(render(<NcmSongTag song={freeSong} />).container.textContent).toBe('')
  })
})
