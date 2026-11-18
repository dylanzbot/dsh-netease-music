/**
 * @dylanzbot/dsh-netease-music 的宿主半侧。
 *
 * 职责：在 dsh 宿主进程（Node）里跑，把网易云扫码登录、账号资料、歌单、
 * 搜索封装成同源 /api/ncm/* 路由，供浏览器半侧调用。浏览器永远不直连 music.163.com。
 *
 * 关键约定：
 *   - `name` / `inject` / `apply` 三件套是 Cordis 插件的硬契约，名字不能改。
 *   - `inject: ['connection']` 声明「我需要 dsh 的 connection 服务」。
 *   - 路由注册方式：`ctx.inject(['connection'])` 拿到 connection.fetch.register，再用 `ctx.effect` 绑定生命周期。
 *
 * @module @dylanzbot/dsh-netease-music
 */

import type { ConnectionService, Disposer, Logger, PluginContext } from '../types/cordis.js'
import { SERVICE_CONNECTION } from '../constants/dsh-service.js'
import { PLUGIN_ID } from '../constants/plugin.js'
import { createHostRouters } from './routes/index.js'

/** 插件在 dsh 里注册的稳定包名。 */
export const name = PLUGIN_ID

/**
 * 宿主侧依赖的 dsh 服务名列表。
 * `connection` 是 dsh 的 HTTP 通道路由层，浏览器半侧通过它访问 /api/ncm/*。
 */
export const inject = [SERVICE_CONNECTION] as const

/**
 * 宿主半侧的入口函数，dsh 会在启动时调用它。
 * @param ctx - dsh 给的宿主插件 context。
 */
export function apply(ctx: PluginContext): void {
  const logger = ctx.logger(PLUGIN_ID)

  // 等 connection 服务就位后注册路由；scope 是带作用域的 child context。
  ctx.inject([SERVICE_CONNECTION], (scope) => {
    const connection = scope.get<ConnectionService>(SERVICE_CONNECTION)
    const register = connection?.fetch?.register

    // 旧版 dsh 没有 fetch registry 时静默降级：面板还能渲染，只是拿不到数据。
    if (register === undefined || typeof register !== 'function') {
      logger.warn(`${PLUGIN_ID}: host connection exposes no fetch registry; routes not registered`)
      return
    }

    const routes = createHostRouters(logger)
    for (const route of routes) {
      ctx.effect(
        () => {
          // `register()` 返回异步 disposer（() => Promise<void>）。插件卸载 /
          // HMR 重算时必须调用它撤销注册，否则会留下失效或重复的路由。
          const dispose = register(route.def)
          return () => {
            void dispose()
          }
        },
        `${PLUGIN_ID}: ${route.def.path}`,
      )
    }

    logger.debug(`${PLUGIN_ID}: 宿主半侧已激活，${routes.length} 条路由已注册`)
  })
}

/** 重导出宿主类型，方便单测和诊断。 */
export type { Disposer, Logger } from '../types/cordis.js'
