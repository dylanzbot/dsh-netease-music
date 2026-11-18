// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NcmErrorBoundary } from '../../src/client/components/base/error-boundary.js'

function Bomb(): never {
  throw new Error('render exploded')
}

describe('面板级错误边界', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('子组件渲染抛错时显示兜底页面而不是白屏', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // React 开发版会向 window 派发 error 事件，jsdom 会把它打印出来；这是预期行为。
    const swallow = (event: ErrorEvent) => event.preventDefault()
    window.addEventListener('error', swallow)
    const view = render(
      <NcmErrorBoundary>
        <Bomb />
      </NcmErrorBoundary>,
    )
    window.removeEventListener('error', swallow)

    expect(view.container.textContent).toContain('音乐空间暂时打不开')
    expect(view.container.textContent).toContain('render exploded')
    expect(screen.getByRole('button', { name: '重新加载' })).toBeTruthy()
  })

  it('正常子内容原样渲染', () => {
    const view = render(
      <NcmErrorBoundary>
        <span>ok content</span>
      </NcmErrorBoundary>,
    )
    expect(view.container.textContent).toBe('ok content')
  })
})
