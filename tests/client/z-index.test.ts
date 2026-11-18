import { beforeEach, describe, expect, it } from 'vitest'
import { Z_INDEX_BASE, currentZIndex, nextZIndex, resetZIndex } from '../../src/client/utils/z-index.js'

describe('z-index 分配', () => {
  beforeEach(() => resetZIndex())

  it('基准值从 2000 开始，每次调用递增 1', () => {
    expect(Z_INDEX_BASE).toBe(2000)
    expect(nextZIndex()).toBe(2000)
    expect(nextZIndex()).toBe(2001)
    expect(nextZIndex()).toBe(2002)
  })

  it('currentZIndex 返回已分配到的最大值', () => {
    expect(currentZIndex()).toBe(Z_INDEX_BASE - 1)
    nextZIndex()
    nextZIndex()
    expect(currentZIndex()).toBe(Z_INDEX_BASE + 1)
  })

  it('resetZIndex 可重置到默认值或自定义值', () => {
    nextZIndex()
    resetZIndex()
    expect(nextZIndex()).toBe(Z_INDEX_BASE)

    resetZIndex(100)
    expect(nextZIndex()).toBe(100)
    expect(currentZIndex()).toBe(100)
  })
})
