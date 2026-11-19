// @vitest-environment jsdom
import type { NcmRelationUserDTO } from '../../src/types/index.js'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { relationAction } from '../../src/client/api/user.api.js'
import { useAsync } from '../../src/client/hooks/use-async.js'
import { usePagedList } from '../../src/client/hooks/use-paged-list.js'
import { usePopupZIndex } from '../../src/client/hooks/use-popup-z-index.js'
import { useRelationAction } from '../../src/client/hooks/use-relation-action.js'
import { resetZIndex } from '../../src/client/utils/z-index.js'

vi.mock('../../src/client/api/user.api.js', () => ({ relationAction: vi.fn() }))

const relationActionMock = vi.mocked(relationAction)

const user: NcmRelationUserDTO = {
  userId: 42,
  nickname: '测试用户',
  avatarUrl: '',
  gender: 0,
  signature: '',
  level: 5,
  vipType: 0,
  badgeCount: 0,
  followed: false,
  mutual: false,
  relationTime: 0,
  mutualTime: 0,
}

beforeEach(() => {
  relationActionMock.mockReset()
})

describe('useAsync', () => {
  it('成功时暴露 data、loading=false、error=false', async () => {
    const fetcher = vi.fn(async () => ({ id: 1 }))
    const { result } = renderHook(() => useAsync(fetcher, []))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ id: 1 })
    expect(result.current.error).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('失败时 error=true，data 保持 null', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('boom')
    })
    const { result } = renderHook(() => useAsync(fetcher, []))

    await waitFor(() => expect(result.current.error).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('依赖变化触发重新请求', async () => {
    const fetcher = vi.fn(async (signal: AbortSignal) => signal.aborted ? 'aborted' : 'ok')
    const { result, rerender } = renderHook(({ key }) => useAsync(fetcher, [key]), {
      initialProps: { key: 'a' },
    })
    await waitFor(() => expect(result.current.data).toBe('ok'))

    rerender({ key: 'b' })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('reload 触发再次请求', async () => {
    const fetcher = vi.fn(async () => 'value')
    const { result } = renderHook(() => useAsync(fetcher, []))
    await waitFor(() => expect(result.current.data).toBe('value'))

    await act(async () => result.current.reload())
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('卸载时中断进行中的请求', async () => {
    let captured: AbortSignal | undefined
    const fetcher = vi.fn((signal: AbortSignal) => {
      captured = signal
      return new Promise<never>(() => {})
    })
    const { unmount } = renderHook(() => useAsync(fetcher, []))

    expect(captured?.aborted).toBe(false)
    unmount()
    expect(captured?.aborted).toBe(true)
  })
})

describe('usePagedList', () => {
  it('自动加载第一页，并推导 more', async () => {
    const fetchPage = vi.fn(async (offset: number) => ({
      items: [offset, offset + 1],
      total: 4,
    }))
    const { result } = renderHook(() => usePagedList({ fetchPage, pageSize: 2, deps: [] }))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([0, 1])
    expect(result.current.total).toBe(4)
    expect(result.current.more).toBe(true)
    expect(fetchPage).toHaveBeenCalledWith(0, 2, expect.any(AbortSignal))
  })

  it('loadMore 追加下一页，并去重合并（自定义 merge）', async () => {
    const fetchPage = vi.fn(async (offset: number) => ({
      items: offset === 0 ? [{ id: 1 }] : [{ id: 1 }, { id: 2 }],
      more: offset === 0,
    }))
    const merge = (prev: readonly { id: number }[], next: readonly { id: number }[]) => {
      const byId = new Map(prev.map((item) => [item.id, item]))
      for (const item of next) byId.set(item.id, item)
      return [...byId.values()]
    }
    const { result } = renderHook(() => usePagedList({ fetchPage, pageSize: 1, deps: [], merge }))
    await waitFor(() => expect(result.current.items).toEqual([{ id: 1 }]))

    await act(async () => result.current.loadMore())
    await waitFor(() => expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]))
    expect(result.current.loadingMore).toBe(false)
  })

  it('依赖变化时清空并重新加载第一页', async () => {
    const fetchPage = vi.fn(async (offset: number) => ({ items: [offset], more: false }))
    const { result, rerender } = renderHook(({ key }) => usePagedList({ fetchPage, pageSize: 1, deps: [key] }), {
      initialProps: { key: 'a' },
    })
    await waitFor(() => expect(result.current.items).toEqual([0]))

    rerender({ key: 'b' })
    await waitFor(() => expect(result.current.items).toEqual([0]))
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('首页失败置 failed=true；追加失败把 more 置 false', async () => {
    const failedFetch = vi.fn(async () => {
      throw new Error('down')
    })
    const first = renderHook(() => usePagedList({ fetchPage: failedFetch, pageSize: 2, deps: [] }))
    await waitFor(() => expect(first.result.current.failed).toBe(true))

    const appendFetch = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], more: true })
      .mockRejectedValueOnce(new Error('down'))
    const second = renderHook(() => usePagedList({ fetchPage: appendFetch, pageSize: 2, deps: [] }))
    await waitFor(() => expect(second.result.current.more).toBe(true))
    await act(async () => second.result.current.loadMore())
    await waitFor(() => expect(second.result.current.more).toBe(false))
    expect(second.result.current.failed).toBe(false)
  })

  it('auto=false 时不自动请求', () => {
    const fetchPage = vi.fn(async () => ({ items: [] }))
    const { result } = renderHook(() => usePagedList({ fetchPage, pageSize: 10, deps: [], auto: false }))
    expect(fetchPage).not.toHaveBeenCalled()
    expect(result.current.items).toEqual([])
  })
})

describe('usePopupZIndex', () => {
  it('每次挂载分配一个新的 z-index', () => {
    resetZIndex(500)
    const first = renderHook(() => usePopupZIndex())
    const second = renderHook(() => usePopupZIndex())
    expect(first.result.current).toBe(500)
    expect(second.result.current).toBe(501)
  })

  it('同一次渲染内 z-index 保持不变', () => {
    resetZIndex(700)
    const { result, rerender } = renderHook(() => usePopupZIndex())
    rerender()
    expect(result.current).toBe(700)
  })
})

describe('useRelationAction', () => {
  it('askConfirm / cancelConfirm 管理二次确认状态', () => {
    const { result } = renderHook(() => useRelationAction({}))
    expect(result.current.confirm).toBeNull()

    act(() => result.current.askConfirm('follow', user))
    expect(result.current.confirm).toEqual({ action: 'follow', user })

    act(() => result.current.cancelConfirm())
    expect(result.current.confirm).toBeNull()
  })

  it('run 成功后通知并回调 onChanged', async () => {
    relationActionMock.mockResolvedValue({ ok: true, message: '已关注' })
    const onNotice = vi.fn()
    const onChanged = vi.fn()
    const { result } = renderHook(() => useRelationAction({ onNotice, onChanged }))

    await act(async () => result.current.run('follow', user))

    expect(relationActionMock).toHaveBeenCalledWith('follow', 42)
    expect(onNotice).toHaveBeenCalledWith('已关注')
    expect(onChanged).toHaveBeenCalledWith('follow', user)
    expect(result.current.busy).toBe(false)
    expect(result.current.confirm).toBeNull()
  })

  it('result.ok=false 时不触发 onChanged', async () => {
    relationActionMock.mockResolvedValue({ ok: false, message: '已取消关注' })
    const onChanged = vi.fn()
    const { result } = renderHook(() => useRelationAction({ onChanged }))

    await act(async () => result.current.run('unfollow', user))

    expect(onChanged).not.toHaveBeenCalled()
  })

  it('失败时给出兜底提示并复位 busy / confirm', async () => {
    relationActionMock.mockRejectedValue(new Error('boom'))
    const onNotice = vi.fn()
    const { result } = renderHook(() => useRelationAction({ onNotice }))

    act(() => result.current.askConfirm('follow', user))
    await act(async () => result.current.run('follow', user))

    expect(onNotice).toHaveBeenCalledWith('操作失败，请稍后重试')
    expect(result.current.busy).toBe(false)
    expect(result.current.confirm).toBeNull()
  })
})
