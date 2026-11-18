import { describe, expect, it, vi } from 'vitest'
import { createEmitter, createStore } from '../../src/client/utils/pubsub.js'

describe('createStore', () => {
  it('get 返回初始状态的副本', () => {
    const initial = { count: 0, name: 'ncm' }
    const store = createStore(initial)
    expect(store.get()).toEqual(initial)
    expect(store.get()).not.toBe(initial)
  })

  it('set 合并 patch，不丢失其它字段，并通知订阅者', () => {
    const store = createStore({ count: 0, name: 'ncm' })
    const listener = vi.fn()
    store.subscribe(listener)

    store.set({ count: 1 })

    expect(store.get()).toEqual({ count: 1, name: 'ncm' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'ncm' })
  })

  it('通知多个订阅者；退订后不再收到通知', () => {
    const store = createStore({ value: 0 })
    const a = vi.fn()
    const b = vi.fn()
    const unsubscribeA = store.subscribe(a)
    store.subscribe(b)

    store.set({ value: 1 })
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)

    unsubscribeA()
    store.set({ value: 2 })
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(2)
  })

  it('重复退订是安全的', () => {
    const store = createStore({ value: 0 })
    const unsubscribe = store.subscribe(vi.fn())
    expect(() => {
      unsubscribe()
      unsubscribe()
    }).not.toThrow()
  })
})

describe('createEmitter', () => {
  it('publish 把值推给所有订阅者', () => {
    const emitter = createEmitter<string>()
    const a = vi.fn()
    const b = vi.fn()
    emitter.subscribe(a)
    emitter.subscribe(b)

    emitter.publish('toast')

    expect(a).toHaveBeenCalledTimes(1)
    expect(a).toHaveBeenCalledWith('toast')
    expect(b).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledWith('toast')
  })

  it('退订后不再收到事件', () => {
    const emitter = createEmitter<number>()
    const listener = vi.fn()
    const unsubscribe = emitter.subscribe(listener)

    emitter.publish(1)
    unsubscribe()
    emitter.publish(2)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(1)
  })

  it('没有订阅者时 publish 不抛错', () => {
    const emitter = createEmitter<void>()
    expect(() => emitter.publish()).not.toThrow()
  })
})
