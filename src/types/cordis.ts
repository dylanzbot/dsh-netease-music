/**
 * dsh / Cordis 运行时类型的统一入口。
 *
 * 核心类型（`Logger` / `Disposable` / `Context`）直接复用 peer 依赖
 * `@deepseek-ai/cordis` 的官方声明，不再本地重写；两端各自独有的 dsh 服务
 * 仍放在 `cordis-host.ts` / `cordis-client.ts`，并由本文件统一导出。
 *
 * 本文件是**纯类型声明**（没有任何运行时值）。
 *
 * @module @dylanzbot/dsh-netease-music/src/types/cordis
 */

/** cordis 核心类型：直接复用官方声明。 */
export type {
  Context,
  Disposable,
  Logger,
} from '@deepseek-ai/cordis'

/** 宿主侧 dsh 特有服务。 */
export type { ConnectionService, RouteDefinition } from './cordis-host.js'

/** 浏览器侧 dsh 特有服务。 */
export type { ClientContext, RegisterOptions, SlotsService } from './cordis-client.js'
