// @vitest-environment jsdom
import { createElement, Fragment, type ReactElement } from 'react'
import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  NETEASE_CUSTOM_EMOJI_URLS,
  renderCommentContent,
  resolveEmoji,
} from '../../src/client/utils/emoji.js'

function asElement(node: unknown): ReactElement {
  expect(typeof node).toBe('object')
  return node as ReactElement
}

describe('resolveEmoji', () => {
  it('自定义表情优先返回图片 URL', () => {
    const key = Object.keys(NETEASE_CUSTOM_EMOJI_URLS)[0]!
    const piece = resolveEmoji(key)
    expect(piece?.imageUrl).toBe(NETEASE_CUSTOM_EMOJI_URLS[key])
  })

  it('官方表情按 ID 生成 @2x 图片 URL', () => {
    const piece = resolveEmoji('大笑')
    expect(piece?.imageUrl).toBe('https://s1.music.126.net/style/web2/emoji/emoji_86@2x.png')
    expect(piece?.unicode).toBeUndefined()
  })

  it('别名归一化后能命中官方表情', () => {
    expect(resolveEmoji('笑')?.imageUrl).toBe(resolveEmoji('大笑')?.imageUrl)
    expect(resolveEmoji('赞')?.imageUrl).toBe(resolveEmoji('强')?.imageUrl)
    expect(resolveEmoji('18')?.imageUrl).toBe('https://s1.music.126.net/style/web2/emoji/emoji_186@2x.png')
  })

  it('只有 Unicode 映射时返回 unicode（无图片）', () => {
    expect(resolveEmoji('加油')).toEqual({ unicode: '💪' })
    expect(resolveEmoji('比心')).toEqual({ unicode: '🫶' })
  })

  it('未知表情返回 undefined', () => {
    expect(resolveEmoji('完全不存在的表情名字')).toBeUndefined()
    expect(resolveEmoji('')).toBeUndefined()
  })
})

describe('renderCommentContent', () => {
  it('空串返回空数组', () => {
    expect(renderCommentContent('')).toEqual([])
  })

  it('无表情标记时原样返回文本', () => {
    expect(renderCommentContent('hello 世界')).toEqual(['hello 世界'])
  })

  it('把 [大笑] 拆成文本 + img + 文本', () => {
    const nodes = renderCommentContent('你好[大笑]世界')
    expect(nodes).toHaveLength(3)
    expect(nodes[0]).toBe('你好')
    expect(nodes[2]).toBe('世界')

    const component = asElement(nodes[1])
    // 现在是受控的 EmojiImage 组件，而不是裸 <img>。
    expect(typeof component.type).toBe('function')
    expect(typeof component.key).toBe('string')
    expect(component.key).toMatch(/^emoji-\d+$/)

    const { container } = render(createElement(Fragment, null, ...nodes))
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('https://s1.music.126.net/style/web2/emoji/emoji_86@2x.png')
    expect(img?.getAttribute('alt')).toBe('[大笑]')
    expect(img?.getAttribute('title')).toBe('大笑')
    expect(img?.className).toBe('ncm-comment-item__emoji')
    expect(img?.getAttribute('loading')).toBe('lazy')
  })

  it('不认识的表情标记留在纯文本里，不拆分', () => {
    expect(renderCommentContent('a[这是没见过的表情]b')).toEqual(['a[这是没见过的表情]b'])
  })

  it('多个表情之间保留普通文本；相邻表情不产生空文本节点', () => {
    const spaced = renderCommentContent('[大笑]和[大哭]')
    expect(spaced).toHaveLength(3)
    expect(spaced[1]).toBe('和')
    expect(asElement(spaced[0]).type).toBe(asElement(spaced[2]).type)
    expect(typeof asElement(spaced[0]).type).toBe('function')

    const adjacent = renderCommentContent('[大笑][大哭]')
    expect(adjacent).toHaveLength(2)
    expect(adjacent.every((node) => typeof node !== 'string')).toBe(true)
  })

  it('Unicode-only 表情渲染为文本，不生成 img', () => {
    expect(renderCommentContent('[加油]')).toEqual(['💪'])
  })

  it('图片加载失败时通过 React state 降级为文本（不再直接改 DOM）', () => {
    const nodes = renderCommentContent('x[大笑]y')
    const { container } = render(createElement(Fragment, null, ...nodes))
    const img = container.querySelector('img')
    expect(img).not.toBeNull()

    act(() => {
      img?.dispatchEvent(new Event('error'))
    })

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('[大笑]')
  })

  it('不超过 32 字的标记才被识别为候选', () => {
    const tooLong = `[${'笑'.repeat(33)}]`
    expect(renderCommentContent(tooLong)).toEqual([tooLong])
  })
})
