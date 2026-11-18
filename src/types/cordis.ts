/**
 * 两端共享的 dsh 运行时类型子集（放在 src/ 下统一管理）。
 *
 * 为什么要有这个文件：
 *   dsh 插件的宿主半侧跑在 Node、浏览器半侧跑在 dsh Web 壳里，两边各自通过
 *   `@deepseek-ai/cordis` 拿到运行时服务。但 cordis 是 dsh 的 peer 依赖，
 *   装在 profile 的 node_modules 里、不在本仓库 —— 所以本仓库单独 build 时
 *   拿不到真实 cordis 类型。这个文件**只声明用到的几个成员**，让 tsc 在
 *   没有 cordis 包的情况下也能通过类型检查。
 *
 * 本文件是**纯类型声明**（没有任何运行时值），理论上可以叫 `.d.ts`。
 * 命名为 `cordis.ts` 是因为它声明的是 cordis / dsh 运行时契约的本地子集；
 * 放在 `src/types/` 下也便于将来在同一个文件里加运行时工具（如 `createCache()`）。
 *
 * 用法：
 *   - 宿主半侧（src/host/）：`import type { Disposer, Logger, PluginContext } from '../types/cordis.js'`
 *   - 宿主路由（src/host/routes/）：`import type { Logger } from '../../types/cordis.js'`
 *   - 浏览器半侧（src/client/）：`import type { SlotsService, RegisterOptions } from '../types/cordis.js'`
 *
 * @module @dylanzbot/dsh-netease-music/src/types/cordis
 */

/** 资源释放回调：插件卸载时被调用来撤销贡献。 */
export type Disposer = () => void

/** 命名 logger，宿主侧通过 `ctx.logger('dsh-netease-music')` 拿到。 */
export interface Logger {
  info(message: string, ...rest: unknown[]): void
  warn(message: string, ...rest: unknown[]): void
  error(message: string, ...rest: unknown[]): void
  debug(message: string, ...rest: unknown[]): void
}

/**
 * 一条 LLM 消息内容块（用于 `ctx.llm.stream`）。
 * 本地保留是为了宿主 build 不需要依赖 llm 包的类型。
 */
export interface LlmMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: ReadonlyArray<{ readonly type: 'text'; readonly text: string }>
}

/** `LlmService.stream` 产出的一个 chunk，只保留用到的字段。 */
export interface LlmChunk {
  readonly type: string
  readonly delta?: string
  readonly text?: string
  readonly [key: string]: unknown
}

/** provider 中立的 LLM 调用服务（`@deepseek-ai/dsh-llm` 挂载的）。 */
export interface LlmService {
  stream(request: {
    readonly provider: string
    readonly model: string
    readonly messages: ReadonlyArray<LlmMessage>
    readonly [key: string]: unknown
  }): AsyncIterable<LlmChunk>
  listProviders?(): ReadonlyArray<string | { readonly name: string }>
}

/** 宿主插件真正需要的 Cordis Context 切片。 */
export interface PluginContext {
  /** 取一个命名 logger。 */
  readonly logger: (name?: string) => Logger

  /**
   * 当所有命名服务都就位时执行 callback，传一个带作用域的 child context；
   * 返回的 effect 会在插件卸载时被撤销。
   */
  inject(names: readonly string[], callback: (scope: PluginContext) => void): Disposer

  /** 注册一个生命周期 effect；label 用于诊断日志。 */
  effect(callback: () => Disposer | Promise<Disposer>, label?: string): Disposer

  /** 从当前 context 取一个服务（不存在返回 undefined）。 */
  get<T = unknown>(name: string): T | undefined
}

// ---------------------------------------------------------------------------
// 宿主侧用到的 dsh 服务切片（`connection` —— HTTP 通道路由层）
// ---------------------------------------------------------------------------

/** 一条宿主路由的定义，直接交给 `connection.fetch.register`。 */
export interface RouteDefinition {
  /** 路由路径，如 `/api/ncm/auth/qr/start`。 */
  readonly path: string
  /** 允许的 HTTP 方法。 */
  readonly methods: readonly string[]
  /** 请求体读取方式；POST 路由统一用 `buffered`。 */
  readonly requestBody?: 'buffered'
  /** 路由处理函数，返回标准 Response。 */
  readonly fetch: (request: Request) => Response | Promise<Response>
}

/** 宿主侧用到的 connection 服务切片。 */
export interface ConnectionService {
  /** dsh 的 HTTP 通道路由注册表。 */
  readonly fetch?: {
    /**
     * 注册一条精确 Fetch 路由。
     * 返回**异步** disposer（`() => Promise<void>`）：插件卸载 / HMR 重算时
     * 必须调用，否则会留下失效或重复的注册。
     */
    register(def: RouteDefinition): () => Promise<void>
  }
}

// ---------------------------------------------------------------------------
// 浏览器半侧用到的 dsh 服务切片（`slots` —— 壳子的 UI 插槽系统）
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

/** 本插件用到的 slots 服务切片（壳子的 UI 插槽系统）。 */
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
