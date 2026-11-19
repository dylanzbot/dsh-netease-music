/**
 * 宿主半侧（src/host/）用到的 dsh 运行时类型子集。
 *
 * cordis 核心类型（`Logger` / `Disposable` / `Context`）复用官方
 * `@deepseek-ai/cordis` 声明；本文件只保留官方没有的 connection 服务，
 * 并通过 declaration merging 把 `connection` 服务键补进官方 `Context`，
 * 让 `scope.get<ConnectionService>('connection')` 拿到正确类型。
 *
 * 统一入口见 `cordis.ts`。
 *
 * @module @dylanzbot/dsh-netease-music/src/types/cordis-host
 */

/** 核心类型直接来自 cordis 官方声明。 */
export type {
  Context,
  Disposable,
  Logger,
} from '@deepseek-ai/cordis'

// ---------------------------------------------------------------------------
// 宿主侧用到的 dsh 服务（`connection` —— HTTP 通道路由层）
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

/** 宿主侧用到的 connection 服务。 */
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

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** dsh 的 HTTP 通道路由层。 */
    connection: ConnectionService
  }
}
