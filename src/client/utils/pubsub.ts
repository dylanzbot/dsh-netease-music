/* 客户端通用发布订阅工具。 */

/** 可读写、可订阅的状态容器。 */
export interface Store<T extends object> {
  /** 读取当前状态快照。 */
  get(): T
  /** 合并更新并通知订阅者。 */
  set(patch: Partial<T>): void
  /** 订阅状态变化，返回取消订阅函数。 */
  subscribe(listener: (state: T) => void): () => void
}

/** 创建一个轻量状态 store。 */
export function createStore<T extends object>(initial: T): Store<T> {
  let state: T = { ...initial }
  const listeners = new Set<(state: T) => void>()

  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch }
      for (const listener of listeners) listener(state)
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** 单向事件发布器。 */
export interface Emitter<T> {
  /** 订阅事件。 */
  subscribe(listener: (value: T) => void): () => void
  /** 发布事件。 */
  publish(value: T): void
}

/** 创建一个事件发布器（toast、播放失败提示等跨组件事件用）。 */
export function createEmitter<T>(): Emitter<T> {
  const listeners = new Set<(value: T) => void>()
  return {
    publish: (value) => {
      for (const listener of listeners) listener(value)
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
