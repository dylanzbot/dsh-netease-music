/**
 * 插件设置路由。
 *
 * 路由清单：
 *   GET  /api/ncm/settings  读取设置
 *   POST /api/ncm/settings  保存设置（showFollowStats）
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/settings
 */

import type { Logger } from '../../types/cordis-host.js'
import { HostApiPath } from './paths.js'
import { ok } from '../utils/response.js'
import { badRequest, route, type HostRoute } from './shared.js'
import { getSettings, setShowFollowStats } from '../preferences.js'

/** 组装设置路由。 */
export function createSettingsRouter(_logger: Logger): HostRoute[] {
  return [
    route(HostApiPath.Settings, ['GET', 'POST'], async (request) => {
      if (request.method === 'GET') return ok(getSettings())
      const body = (await request.json().catch(() => ({}))) as { showFollowStats?: unknown }
      if (typeof body.showFollowStats !== 'boolean') {
        return badRequest('缺少 showFollowStats 参数')
      }
      return ok(await setShowFollowStats(body.showFollowStats))
    }),
  ]
}
