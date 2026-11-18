import { describe, expect, it, vi } from 'vitest'
import { cookiePairs, joinCookie, mergeCookieStrings, normalizeCookieString, readSetCookies } from '../../src/host/utils/cookie.js'

describe('readSetCookies', () => {
  it('优先使用 Headers.getSetCookie，保留多条', () => {
    const headers = new Headers()
    headers.append('set-cookie', 'a=1; Path=/')
    headers.append('set-cookie', 'b=2; HttpOnly')
    expect(readSetCookies(headers)).toEqual(['a=1; Path=/', 'b=2; HttpOnly'])
  })

  it('没有 getSetCookie 时回退到 get(set-cookie)', () => {
    const fake = { get: vi.fn(() => 'a=1; Path=/') } as unknown as Headers
    expect(readSetCookies(fake)).toEqual(['a=1; Path=/'])
    expect(fake.get).toHaveBeenCalledWith('set-cookie')
  })

  it('没有 Set-Cookie 时返回空数组', () => {
    const missing = { get: vi.fn(() => null) } as unknown as Headers
    const empty = { get: vi.fn(() => '') } as unknown as Headers
    expect(readSetCookies(missing)).toEqual([])
    expect(readSetCookies(empty)).toEqual([])
    expect(readSetCookies(new Headers())).toEqual([])
  })
})

describe('cookiePairs', () => {
  it('只保留 name=value，丢掉属性', () => {
    expect(cookiePairs(['a=1; Path=/', 'b=2; HttpOnly', ' c=3 ; Max-Age=10'])).toEqual(['a=1', 'b=2', 'c=3'])
  })

  it('忽略空项与没有等号的项', () => {
    expect(cookiePairs(['', '   ', 'not-a-pair', '; Path=/'])).toEqual([])
  })
})

describe('joinCookie', () => {
  it('用 "; " 拼接', () => {
    expect(joinCookie(['a=1', 'b=2'])).toBe('a=1; b=2')
    expect(joinCookie([])).toBe('')
  })
})

describe('normalizeCookieString', () => {
  it('丢弃 Path / Domain / Max-Age / HttpOnly / Secure / SameSite 等属性', () => {
    expect(
      normalizeCookieString('MUSIC_U=abc; Path=/; Domain=.music.163.com; Max-Age=100; HttpOnly; Secure; SameSite=Lax; __csrf=xyz'),
    ).toBe('MUSIC_U=abc; __csrf=xyz')
  })

  it('属性名大小写不敏感', () => {
    expect(normalizeCookieString('A=1; PATH=/; httponly; SAMESITE=None; B=2')).toBe('A=1; B=2')
  })

  it('忽略无键或空片段', () => {
    expect(normalizeCookieString('=bad; good=1;; ;   ')).toBe('good=1')
    expect(normalizeCookieString('')).toBe('')
  })
})

describe('mergeCookieStrings', () => {
  it('同名 key 以最后出现的为准', () => {
    expect(mergeCookieStrings('a=1; Path=/', undefined, 'a=2; b=3', '')).toBe('a=2; b=3')
  })

  it('合并后输出纯 name=value（不带属性）', () => {
    expect(mergeCookieStrings('a=1; HttpOnly', 'b=2; Max-Age=5')).toBe('a=1; b=2')
  })

  it('全部为空时返回空串', () => {
    expect(mergeCookieStrings(undefined, '', undefined)).toBe('')
  })
})
