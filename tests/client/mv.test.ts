import { describe, expect, it } from 'vitest'
import type { NcmMvUrlsDTO } from '../../src/types/index.js'
import { MV_QUALITIES, MV_QUALITY_LABEL, availableMvQualities, pickDefaultMvQuality } from '../../src/client/utils/mv.js'

describe('availableMvQualities', () => {
  it('按低到高返回有非空 URL 的档位', () => {
    const urls: NcmMvUrlsDTO = { '240': 'a', '480': '', '720': 'c' }
    expect(availableMvQualities(urls)).toEqual(['240', '720'])
  })

  it('空对象返回空数组', () => {
    expect(availableMvQualities({})).toEqual([])
  })

  it('全部档位齐全时返回完整顺序', () => {
    const urls: NcmMvUrlsDTO = { '240': 'a', '480': 'b', '720': 'c', '1080': 'd' }
    expect(availableMvQualities(urls)).toEqual([...MV_QUALITIES])
  })
})

describe('pickDefaultMvQuality', () => {
  it('优先 720p', () => {
    const urls: NcmMvUrlsDTO = { '240': 'a', '480': 'b', '720': 'c', '1080': 'd' }
    expect(pickDefaultMvQuality(urls)).toBe('720')
  })

  it('没有 720p 时回退到可用的最高档', () => {
    expect(pickDefaultMvQuality({ '240': 'a', '480': 'b' })).toBe('480')
    expect(pickDefaultMvQuality({ '240': 'a' })).toBe('240')
    expect(pickDefaultMvQuality({ '1080': 'd' })).toBe('1080')
  })

  it('无可用档位返回 null', () => {
    expect(pickDefaultMvQuality({})).toBeNull()
    expect(pickDefaultMvQuality({ '480': '' })).toBeNull()
  })

  it('档位展示标签覆盖所有档位', () => {
    expect(MV_QUALITY_LABEL).toEqual({
      '240': '240P',
      '480': '480P',
      '720': '720P',
      '1080': '1080P',
    })
  })

  it('720 键存在但为空串时回退到最高可用档（修复 L4）', () => {
    expect(pickDefaultMvQuality({ '480': 'b', '720': '' })).toBe('480')
  })
})
