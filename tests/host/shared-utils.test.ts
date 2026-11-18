import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseJsonOrRaw } from '../../src/utils/json.js'
import { MS_PER_DAY } from '../../src/constants/time.js'
import { daysSince } from '../../src/utils/time.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('parseJsonOrRaw', () => {
  it('合法 JSON 返回解析结果', () => {
    expect(parseJsonOrRaw('{"code":200}')).toEqual({ code: 200 })
    expect(parseJsonOrRaw('[1,2,3]')).toEqual([1, 2, 3])
    expect(parseJsonOrRaw('"hello"')).toBe('hello')
    expect(parseJsonOrRaw('null')).toBeNull()
  })

  it('非法 JSON 不抛错，返回 { raw }', () => {
    expect(parseJsonOrRaw('<html>502</html>')).toEqual({ raw: '<html>502</html>' })
    expect(parseJsonOrRaw('')).toEqual({ raw: '' })
  })
})

describe('daysSince', () => {
  it('非法 / 非正时间戳返回 0', () => {
    expect(daysSince(0)).toBe(0)
    expect(daysSince(-1)).toBe(0)
    expect(daysSince(Number.NaN)).toBe(0)
    expect(daysSince(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('按整天向下取整，且最小为 1', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-10T00:00:00Z'))
    const now = Date.now()

    expect(daysSince(now)).toBe(1) // 同一天至少算 1 天
    expect(daysSince(now - MS_PER_DAY)).toBe(1)
    expect(daysSince(now - 2 * MS_PER_DAY)).toBe(2)
    expect(daysSince(now - 2.9 * MS_PER_DAY)).toBe(2)
  })
})
