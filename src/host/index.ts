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

import type { Context, PluginConfig, StandardSchema } from '../types/cordis-host.js'
import { PLUGIN_ID } from '../constants/plugin.js'
import { initCookieStore } from './credentials.js'
import { initPreferences } from './preferences.js'
import { createHostRouters } from './routes/index.js'

/** 插件在 dsh 里注册的稳定包名。 */
export const name = PLUGIN_ID

/**
 * 插件配置（非敏感偏好）；Cookie 等机密走 ctx.credentials，不在这里。
 * 手写 Standard Schema 对象即可满足 Cordis 的 Config 校验契约，不新增依赖。
 */
export const Config: StandardSchema<PluginConfig> = {
  '~standard': {
    version: 1,
    vendor: PLUGIN_ID,
    validate(value: unknown) {
      const raw = typeof value === 'object' && value !== null
        ? value as Record<string, unknown>
        : {}
      const showFollowStats = typeof raw.showFollowStats === 'boolean' ? raw.showFollowStats : true
      return { value: { showFollowStats } }
    },
  },
}

/**
 * 宿主侧依赖的 dsh 服务名列表。
 * `connection` 是 dsh 的 HTTP 通道路由层，浏览器半侧通过它访问 /api/ncm/*。
 */
export const inject = ['connection'] as const

/**
 * 宿主半侧的入口函数，dsh 会在启动时调用它。
 * @param ctx - dsh 给的宿主插件 context。
 * @param config
 */
export async function apply(
  ctx: Context,
  config: PluginConfig = { showFollowStats: true },
): Promise<void> {
  const logger = ctx.logger(PLUGIN_ID)

  // 偏好走插件 Config / configEditor；Cookie 走官方凭据 seam，二者都不再
  // 写进同一份本地 JSON。先等 Cookie 预读完再注册路由，避免启动瞬间的
  // 「未登录」误判；初始化失败只记日志，不影响路由注册。
  initPreferences(ctx, config, logger)
  await initCookieStore(ctx, logger).catch((error: unknown) => {
    logger.warn(`${PLUGIN_ID}: Cookie 凭据初始化失败：${String(error)}`)
  })

  // 等 connection 服务就位后注册路由；scope 是带作用域的 child context。
  ctx.inject(['connection'], (scope) => {
    const connection = scope.get('connection')
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

/** 重导出官方类型，方便单测和诊断。 */
export type { Disposable, Logger, PluginConfig } from '../types/cordis-host.js'
