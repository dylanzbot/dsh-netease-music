/**
 * 宿主半侧（src/host/）用到的 dsh 运行时类型子集。
 *
 * cordis 核心类型（`Logger` / `Disposable` / `Context`）复用官方
 * `@deepseek-ai/cordis` 声明；本文件保留官方没有的 dsh 服务，
 * 并通过 declaration merging 把 `connection` / `credentials` /
 * `configEditor` 服务键补进官方 `Context`，让 `ctx.get('credentials')`
 * 这样的调用拿到正确类型。
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

// ---------------------------------------------------------------------------
// 宿主侧用到的 dsh 服务（`credentials` —— 官方凭据 seam）
// ---------------------------------------------------------------------------

/** 凭据记录地址：`<owner>/<id>`，运行时就是字符串，类型上打品牌防误用。 */
export interface CredentialKeyBrand {
  readonly __credentialKey: unique symbol
}
export type CredentialKey = string & CredentialKeyBrand

/** 一条持久化凭据记录；payload 由拥有它的插件自己解释。 */
export interface CredentialRecord {
  readonly kind: 'grant' | 'api-key'
  readonly payload?: unknown
  readonly key?: string
  readonly env?: Readonly<Record<string, string>>
}

/** `@deepseek-ai/dsh-credentials` 挂载的 `ctx.credentials` 切片。 */
export interface CredentialsService {
  readRecord(key: CredentialKey): Promise<CredentialRecord | undefined>
  modifyRecord(
    key: CredentialKey,
    mutate: (current: CredentialRecord | undefined) => Promise<CredentialRecord | undefined>,
  ): Promise<CredentialRecord | undefined>
  deleteRecord(key: CredentialKey): Promise<void>
}

// ---------------------------------------------------------------------------
// 宿主侧用到的 dsh 服务（`configEditor` —— 偏好写回 profile 配置）
// ---------------------------------------------------------------------------

/** profile 里的插件条目（配置编辑器按 id 定位）。 */
export interface PluginEntry {
  readonly id?: string
  readonly options?: {
    readonly config?: Record<string, unknown>
  }
}

/** `@deepseek-ai/dsh-config-editor` 挂载的 `ctx.configEditor` 切片。 */
export interface ConfigEditor {
  edit(
    entry: PluginEntry,
    change: (current: Record<string, unknown>, inherited: Record<string, unknown>) => Record<string, unknown>,
  ): Promise<void>
}

/** Cordis `Config` 需要的 Standard Schema 最小面（不新增依赖）。 */
export interface StandardSchema<T> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    validate(value: unknown):
      | { readonly value: T }
      | { readonly issues: readonly { readonly message: string }[] }
  }
}

/** 本插件的 Config 形状：只有非敏感偏好。 */
export interface PluginConfig {
  readonly showFollowStats: boolean
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** dsh 的 HTTP 通道路由层。 */
    connection: ConnectionService
    /** 官方凭据 seam；极简 profile 可能没有。 */
    credentials?: CredentialsService
    /** 把插件配置写回当前 profile；极简 profile 可能没有。 */
    configEditor?: ConfigEditor
  }

  interface Fiber {
    /** Loader 挂在 fiber 上的条目，configEditor 用它定位 profile 配置行。 */
    entry?: PluginEntry
  }
}
