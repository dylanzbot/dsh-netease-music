/**
 * 用户关系路由。
 *
 * 路由清单：
 *   GET  /api/ncm/user/follows      关注列表
 *   GET  /api/ncm/user/fans         粉丝列表
 *   POST /api/ncm/user/follow       关注
 *   POST /api/ncm/user/unfollow     取关
 *   POST /api/ncm/user/remove-fan   移除粉丝
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/relation
 */

import type { Logger } from '../../types/cordis-host.js'
import { HostApiPath } from './paths.js'
import { doRelationAction, getFans, getFollows } from '../services/relation.service.js'
import { ok } from '../utils/response.js'
import { badRequest, intParam, postRoute, route, run, type HostRoute } from './shared.js'

/** 组装关系路由。 */
export function createRelationRouter(logger: Logger): HostRoute[] {
  /** 列表路由：读 limit / offset，统一走 run() 翻译异常（未登录 401）。 */
  const list = (path: HostApiPath, label: string, load: (limit: number, offset: number) => Promise<unknown>) =>
    route(path, ['GET'], (request: Request) => {
      const url = new URL(request.url)
      const limit = Math.max(1, Math.min(100, intParam(url, 'limit', 30)))
      const offset = Math.max(0, intParam(url, 'offset', 0))
      return run(logger, label, async () => ok(await load(limit, offset)))
    })

  /** 操作路由：读 userId，调 doRelationAction。 */
  const action = (path: HostApiPath, label: string, kind: 'follow' | 'unfollow' | 'remove-fan') =>
    postRoute(path, async (request: Request) => {
      const body = (await request.json().catch(() => ({}))) as { userId?: unknown }
      const userId = Number(body.userId)
      if (!Number.isFinite(userId) || userId <= 0) {
        return badRequest('缺少 userId 参数')
      }
      return run(logger, label, async () => ok(await doRelationAction(kind, userId)))
    })

  return [
    list(HostApiPath.Follows, 'follows', (limit, offset) => getFollows(limit, offset)),
    list(HostApiPath.Fans, 'fans', (limit, offset) => getFans(limit, offset)),
    action(HostApiPath.Follow, 'follow', 'follow'),
    action(HostApiPath.Unfollow, 'unfollow', 'unfollow'),
    action(HostApiPath.RemoveFan, 'remove-fan', 'remove-fan'),
  ]
}
