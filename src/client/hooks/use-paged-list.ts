/* 分页列表加载 hook（「第一页 + 加载更多」）。 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** 一页请求的返回。 */
export interface PagedResult<T> {
  readonly items: readonly T[]
  /** 下一页是否还有；可选，缺省按「本页非空且长度达到 pageSize」推断。 */
  readonly more?: boolean
  /** 总数；可选。 */
  readonly total?: number
}

/** `usePagedList` 配置。 */
export interface UsePagedListOptions<T> {
  /** 拉取第 `offset` 起的一页。 */
  readonly fetchPage: (offset: number, pageSize: number, signal: AbortSignal) => Promise<PagedResult<T>>
  /** 每页数量。 */
  readonly pageSize: number
  /** 依赖；变化时重置并重新加载第一页。 */
  readonly deps: readonly unknown[]
  /** 追加时的去重合并（默认直接拼接）。 */
  readonly merge?: (prev: readonly T[], next: readonly T[]) => T[]
  /** 是否在依赖变化时自动加载第一页，默认 true。 */
  readonly auto?: boolean
}

/** `usePagedList` 返回形状。 */
export interface UsePagedListResult<T> {
  readonly items: readonly T[]
  readonly total: number
  /** 是否还有下一页。 */
  readonly more: boolean
  /** 首屏加载中（尚无 items）。 */
  readonly loading: boolean
  /** 追加加载中（已有 items）。 */
  readonly loadingMore: boolean
  readonly failed: boolean
  /** 加载下一页。 */
  readonly loadMore: () => void
  /** 强制重新加载第一页。 */
  readonly reload: () => void
}

/**
 * @template T 列表项类型
 */
export function usePagedList<T>(options: UsePagedListOptions<T>): UsePagedListResult<T> {
  const { pageSize, deps, merge, auto = true } = options

  const [items, setItems] = useState<readonly T[]>([])
  const [total, setTotal] = useState(0)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)

  const seqRef = useRef(0)
  const ctrlRef = useRef<AbortController | null>(null)
  const itemsRef = useRef<readonly T[]>([])
  itemsRef.current = items

  // 用 ref 保存最新的 fetchPage / merge，避免塞进 deps。
  const fetchPageRef = useRef(options.fetchPage)
  fetchPageRef.current = options.fetchPage
  const mergeRef = useRef(merge)
  mergeRef.current = merge

  const run = useCallback(
    async (offset: number, append: boolean) => {
      // 先中止上一批请求，再开启新请求：真正取消在途网络，而不是只丢弃响应。
      ctrlRef.current?.abort()
      const controller = new AbortController()
      ctrlRef.current = controller
      const seq = ++seqRef.current
      if (append) setLoadingMore(true)
      else {
        setLoading(true)
        setFailed(false)
        setItems([])
        setTotal(0)
        setMore(false)
      }
      try {
        const result = await fetchPageRef.current(offset, pageSize, controller.signal)
        if (seq !== seqRef.current) return
        const next = result.items
        if (append) {
          const prev = itemsRef.current
          setItems(mergeRef.current !== undefined ? mergeRef.current(prev, next) : [...prev, ...next])
        } else {
          setItems([...next])
        }
        if (result.total !== undefined) setTotal(result.total)
        setMore(result.more ?? (next.length > 0 && next.length >= pageSize))
      } catch {
        if (seq !== seqRef.current) return
        if (append) setMore(false)
        else setFailed(true)
      } finally {
        if (seq === seqRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [pageSize],
  )

  // 依赖变化 / 首次挂载：重置并加载第一页。
  useEffect(() => {
    if (!auto) return
    void run(0, false)
    return () => {
      ctrlRef.current?.abort()
      seqRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !more) return
    void run(itemsRef.current.length, true)
  }, [loading, loadingMore, more, run])

  const reload = useCallback(() => {
    void run(0, false)
  }, [run])

  return { items, total, more, loading, loadingMore, failed, loadMore, reload }
}
