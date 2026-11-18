import { describe, expect, it } from 'vitest'
import { cssUrl } from '../../src/client/utils/css.js'

describe('cssUrl', () => {
  it('正常 URL 生成带引号的 CSS url()', () => {
    expect(cssUrl('https://p1.music.126.net/a.jpg')).toBe('url("https://p1.music.126.net/a.jpg")')
  })

  it('剔除会破坏 CSS 声明的引号与换行', () => {
    expect(cssUrl('https://x/a"b.jpg')).toBe('url("https://x/ab.jpg")')
    expect(cssUrl("https://x/a'b.jpg")).toBe('url("https://x/ab.jpg")')
    expect(cssUrl('https://x/a\n\rb.jpg')).toBe('url("https://x/ab.jpg")')
  })

  it('空串或只含非法字符时返回 undefined', () => {
    expect(cssUrl('')).toBeUndefined()
    expect(cssUrl('""')).toBeUndefined()
    expect(cssUrl('\n\r')).toBeUndefined()
  })
})
