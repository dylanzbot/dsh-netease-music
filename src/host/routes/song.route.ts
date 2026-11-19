/**
 * 歌曲路由。
 *
 * 路由清单：
 *   GET  /api/ncm/song/url     歌曲播放地址（可带 level 指定音质）
 *   GET  /api/ncm/song/liked   我喜欢的音乐 ID 列表
 *   POST /api/ncm/song/like    喜欢 / 取消喜欢
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/song
 */

import type { Logger } from '../../types/cordis-host.js'
import { HostApiPath } from './paths.js'
import { ok } from '../utils/response.js'
import { badRequest, getRoute, intParam, postRoute, requirePositiveId, run, type HostRoute } from './shared.js'
import { getLikedSongIds, getSongUrl, setSongLikeById } from '../services/song.service.js'

/** 组装歌曲路由。 */
export function createSongRouter(logger: Logger): HostRoute[] {
  return [
    getRoute(HostApiPath.SongUrl, (request) => {
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const url = new URL(request.url)
      const id = intParam(url, 'id', 0)
      // level 优先；service 层会校验是否属于允许的音质档位。
      const level = url.searchParams.get('level') ?? undefined
      return run(logger, 'song-url', async () => ok(await getSongUrl(id, level)))
    }),
    getRoute(HostApiPath.SongLiked, () => run(logger, 'song-liked', async () => ok(await getLikedSongIds()))),
    postRoute(HostApiPath.SongLike, async (request) => {
      const body = (await request.json().catch(() => ({}))) as { id?: unknown; like?: unknown }
      const id = Number(body.id)
      const like = body.like
      if (!Number.isFinite(id) || id <= 0 || typeof like !== 'boolean') {
        return badRequest('缺少 id / like 参数')
      }
      return run(logger, 'song-like', async () => ok(await setSongLikeById(id, like)))
    }),
  ]
}
