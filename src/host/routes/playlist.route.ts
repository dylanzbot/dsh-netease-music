/**
 * 歌单路由。
 *
 * 路由清单：
 *   GET  /api/ncm/playlist/detail     歌单详情（歌曲列表，id）
 *   POST /api/ncm/playlist/subscribe  收藏 / 取消收藏（id / subscribed）
 *   GET  /api/ncm/playlists           「我的」歌单（liked / 创建 / 收藏）
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/playlist
 */

import type { Logger } from '../../types/cordis-host.js'
import { HostApiPath } from './paths.js'
import { ok } from '../utils/response.js'
import {
  badRequest,
  bodyNumber,
  getRoute,
  postRoute,
  requirePositiveId,
  run,
  type HostRoute,
} from './shared.js'
import { getMyPlaylists, getPlaylistSongs, subscribePlaylist } from '../services/playlist.service.js'

/** 组装歌单路由。 */
export function createPlaylistRouter(logger: Logger): HostRoute[] {
  return [
    getRoute(HostApiPath.PlaylistDetail, (request) => {
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const id = new URL(request.url).searchParams.get('id') ?? '0'
      const parsed = Number.parseInt(id, 10)
      if (!Number.isFinite(parsed) || parsed <= 0) return badRequest('缺少 id 参数')
      return run(logger, 'playlist-detail', async () => ok(await getPlaylistSongs(parsed)))
    }),
    postRoute(HostApiPath.PlaylistSubscribe, async (request) => {
      const id = await bodyNumber(request, 'id')
      const body = (await request.json().catch(() => ({}))) as { subscribed?: unknown }
      const subscribed = body.subscribed
      if (!Number.isFinite(id) || id <= 0 || typeof subscribed !== 'boolean') {
        return badRequest('缺少 id / subscribed 参数')
      }
      return run(logger, 'playlist-subscribe', async () => ok(await subscribePlaylist(id, subscribed)))
    }),
    getRoute(HostApiPath.MyPlaylists, () => run(logger, 'my-playlists', async () => ok(await getMyPlaylists()))),
  ]
}
