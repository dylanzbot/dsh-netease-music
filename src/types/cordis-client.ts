/**
 * 浏览器半侧（src/client/）用到的 dsh 运行时类型子集。
 *
 * `Logger` 复用官方 `@deepseek-ai/cordis` 声明；官方没有的 slots 服务仍在
 * 本文件声明，并通过 declaration merging 把 `slots` 服务键补进官方 `Context`。
 * 统一入口见 `cordis.ts`。
 *
 * @module @dylanzbot/dsh-netease-music/src/types/cordis-client
 */
import type { Logger } from '@deepseek-ai/cordis'
/** Logger 直接来自 cordis 官方声明，保持两端同一份类型。 */
export type { Logger } from '@deepseek-ai/cordis'

// ---------------------------------------------------------------------------
// 浏览器半侧用到的 dsh 服务（`slots` —— 壳子的 UI 插槽系统）
// ---------------------------------------------------------------------------

/** `slots.register` 选项里本插件用到的字段。 */
export interface RegisterOptions {
  /** 插槽名（壳子预留位置的名字），如 `'sidebar.panellist'`。 */
  readonly name: string
  /** 在该插槽内的唯一 id；侧栏项用它和主面板的 `key` 配对。 */
  readonly id?: string
  /** 该插槽内的 key（与 `id` 二选一，用于 keyed 插槽，如 `main`）。 */
  readonly key?: string
  /** 展示给用户的短标签（如侧栏 icon 的 tooltip）。 */
  readonly label?: string
  /** 排序权重，越小越靠前（如侧栏菜单顺序）。 */
  readonly order?: number
  /** 其他插件自定义字段。 */
  readonly [extra: string]: unknown
}

/** 本插件用到的 slots 服务（壳子的 UI 插槽系统）。 */
export interface SlotsService {
  /**
   * 把一个 UI 组件注册进指定插槽。
   * `options` 决定「注册到哪个插槽、叫什么名」，`component` 是组件 factory。
   * 返回一个 disposer，调用它撤销注册。
   */
  register(options: RegisterOptions, component: unknown): () => void

  /**
   * 向指定插槽注入一段代码逻辑（不是 UI 组件，而是「什么时候注册/清理」的
   * 逻辑）。壳子在该插槽被激活时执行 callback；callback 的返回值可以是
   * disposer，用来在插槽关闭时做清理。
   */
  inject(slotName: string, callback: () => unknown): unknown
}

/** 浏览器半侧的 plugin context（loader factory 传进来的）。 */
export interface ClientContext {
  /** 由 loader factory 注入的服务集合。 */
  readonly slots?: SlotsService
  readonly logger?: (name?: string) => Logger
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** dsh Web 壳子的 UI 插槽系统。 */
    slots: SlotsService
  }
}
