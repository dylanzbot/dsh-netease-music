/* 一次性异步请求的「data / loading / error」三态 hook。 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** `useAsync` 的返回形状。 */
export interface UseAsyncResult<T> {
  /** 成功拿到的数据；未完成 / 失败时为 null。 */
  readonly data: T | null
  /** 首屏加载中（尚无 data）。 */
  readonly loading: boolean
  /** 请求失败。 */
  readonly error: boolean
  /** 重新拉取一次（会重新置为 loading）。 */
  readonly reload: () => void
}

/**
 * @param fetcher 接收 AbortSignal 的异步函数；依赖变化或卸载时会被中断。
 * @param deps    依赖数组；任一变化都会重新请求。
 */
export function useAsync<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // 用 ref 保存最新 fetcher，避免把它塞进 deps 导致每次渲染都重发。
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // 手动 reload 的触发器。
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    setData(null) // 重新请求时清掉上一份数据，避免 loading 期间展示旧内容
    fetcherRef.current(controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return
        setData(value)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setError(true)
        setLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, reload }
}
