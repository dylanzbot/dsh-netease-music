/**
 * 账号 / 鉴权路由。
 *
 * 路由清单：
 *   POST /api/ncm/auth/cookie  手动 Cookie 登录（已注释禁用）
 *   GET  /api/ncm/auth/status  登录态探测
 *   POST /api/ncm/auth/logout  退出登录
 *   GET  /api/ncm/me          我的页面数据
 *
 * 搜索 / 歌曲 / 评论 / 歌单 / 设置等各领域路由见同目录下的
 * search / song / comment / playlist / settings 路由文件。
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/account
 */

import type { Logger } from '../../types/cordis-host.js'
import { HostApiPath } from './paths.js'
import { ok } from '../utils/response.js'
import {
  // bodyString, // Cookie 登录已禁用
  getRoute,
  postRoute,
  run,
  type HostRoute,
} from './shared.js'
import {
  getAuthStatus,
  getMe,
  // loginWithCookie, // Cookie 登录已禁用
  logout,
} from '../services/account.service.js'

/** 组装账号 / 鉴权路由。 */
export function createAccountRouter(logger: Logger): HostRoute[] {
  return [
    /* Cookie 登录路由已注释（暂只保留扫码），保留以便恢复：
    postRoute(HostApiPath.CookieLogin, async (request) => {
      const cookie = (await bodyString(request, 'cookie')).trim()
      if (cookie === '') return badRequest('缺少 cookie 参数')
      return run(logger, 'cookie-login', async () => ok(await loginWithCookie(cookie)))
    }),
    */
    getRoute(HostApiPath.AuthStatus, () =>
      run(logger, 'auth-status', async () => ok(await getAuthStatus())),
    ),
    postRoute(HostApiPath.Logout, async () => {
      await logout()
      return ok({ loggedIn: false })
    }),
    getRoute(HostApiPath.Me, () => run(logger, 'me', async () => ok(await getMe()))),
  ]
}
