/**
 * 歌手相关路由。
 *
 * 路由清单：
 *   GET  /api/ncm/artist/list     热门歌手榜（limit / offset）
 *   GET  /api/ncm/artist/search   搜索 / 首字母浏览歌手（keywords / limit / offset）
 *   GET  /api/ncm/artist/detail   歌手详情 + 热门歌曲（id）
 *   GET  /api/ncm/artist/songs    歌手歌曲分页（id / order / offset / limit）
 *   GET  /api/ncm/artist/albums   歌手专辑（id / limit / offset）
 *   GET  /api/ncm/album/songs     专辑详情（介绍 + 歌曲，id；路径沿用旧值以兼容运行中的宿主）
 *   GET  /api/ncm/artist/mvs      歌手 MV（id / limit / offset）
 *   GET  /api/ncm/mv/detail       MV 详情（介绍 + 各清晰度可播 URL，id）
 *   POST /api/ncm/artist/follow   关注 / 取关歌手（id / follow）
 *
 * 注：MV 下载路由已注释停用，代码保留在下方以便恢复。
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/artist
 */

import type { Logger } from '../../types/cordis.js'
import { HostApiPath } from './paths.js'
import {
  ERROR_CODE_BAD_REQUEST,
  ERROR_CODE_UPSTREAM,
} from '../../constants/error-code.js'
import {
  CONTENT_TYPE_OCTET_STREAM,
  HEADER_CACHE_CONTROL,
  HEADER_CONTENT_DISPOSITION,
  HEADER_CONTENT_TYPE,
  HTTP_STATUS_BAD_GATEWAY,
} from '../../constants/http.js'
import { PLUGIN_ID } from '../../constants/plugin.js'
import {
  followArtist,
  getAlbumDetail,
  getArtistAlbums,
  getArtistInfo,
  getArtistMvs,
  getArtistSongs,
  getMvDetail,
  getTopArtists,
  searchArtist,
} from '../services/artist.service.js'
import { fail, ok } from '../utils/response.js'
import {
  cappedBody,
  isAllowedMvUrl,
  MV_DOWNLOAD_MAX_BYTES,
  MV_DOWNLOAD_TIMEOUT_MS,
} from '../utils/mv-proxy.js'
import {
  badRequest,
  getRoute,
  intParam,
  postRoute,
  requireKeyword,
  requirePositiveId,
  route,
  run,
  type HostRoute,
} from './shared.js'

/** 组装歌手路由。 */
export function createArtistRouter(logger: Logger): HostRoute[] {
  return [
    getRoute(HostApiPath.ArtistList, (request) => {
      const url = new URL(request.url)
      const limit = intParam(url, 'limit', 30)
      const offset = intParam(url, 'offset', 0)
      return run(logger, 'artist-list', async () => ok(await getTopArtists(offset, limit)))
    }),
    getRoute(HostApiPath.ArtistSearch, (request) => {
      const missing = requireKeyword(request)
      if (missing !== null) return missing
      const url = new URL(request.url)
      const keywords = url.searchParams.get('keywords')?.trim() ?? ''
      const limit = intParam(url, 'limit', 30)
      const offset = intParam(url, 'offset', 0)
      return run(logger, 'artist-search', async () => ok(await searchArtist(keywords, offset, limit)))
    }),
    getRoute(HostApiPath.ArtistDetail, (request) => {
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const id = intParam(new URL(request.url), 'id', 0)
      return run(logger, 'artist-detail', async () => ok(await getArtistInfo(id)))
    }),
    getRoute(HostApiPath.ArtistSongs, (request) => {
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const url = new URL(request.url)
      const id = intParam(url, 'id', 0)
      const order = url.searchParams.get('order') === 'time' ? 'time' : 'hot'
      const offset = intParam(url, 'offset', 0)
      const limit = intParam(url, 'limit', 50)
      return run(logger, 'artist-songs', async () => ok(await getArtistSongs(id, order, offset, limit)))
    }),
    getRoute(HostApiPath.ArtistAlbums, (request) => {
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const url = new URL(request.url)
      const id = intParam(url, 'id', 0)
      const limit = intParam(url, 'limit', 30)
      const offset = intParam(url, 'offset', 0)
      return run(logger, 'artist-albums', async () => ok(await getArtistAlbums(id, limit, offset)))
    }),
    getRoute(HostApiPath.AlbumDetail, (request) => {
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const id = intParam(new URL(request.url), 'id', 0)
      return run(logger, 'album-detail', async () => ok(await getAlbumDetail(id)))
    }),
    getRoute(HostApiPath.ArtistMvs, (request) => {
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const url = new URL(request.url)
      const id = intParam(url, 'id', 0)
      const limit = intParam(url, 'limit', 30)
      const offset = intParam(url, 'offset', 0)
      return run(logger, 'artist-mvs', async () => ok(await getArtistMvs(id, limit, offset)))
    }),
    getRoute(HostApiPath.MvDetail, (request) => {
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const id = intParam(new URL(request.url), 'id', 0)
      return run(logger, 'mv-detail', async () => ok(await getMvDetail(id)))
    }),
    /*
    // MV 代理下载：已注释停用（流式返回 + 自定义响应头，不属于 Envelope 范畴）。
    route(HostApiPath.MvDownload, ['GET'], async (request) => {
      const url = new URL(request.url)
      const target = url.searchParams.get('url') ?? ''
      const name = url.searchParams.get('name') ?? 'mv.mp4'
      // 只允许代理网易云视频 CDN，防 SSRF（解析 URL 后校验 hostname）。
      if (!isAllowedMvUrl(target)) {
        return badRequest('非法的下载地址')
      }
      try {
        const upstream = await fetch(target, {
          // 不跟随跳转：即使白名单域存在可控跳转也不能被借道访问其它地址。
          redirect: 'error',
          // 总超时，避免上游挂起导致连接与内存长期占用。
          signal: AbortSignal.timeout(MV_DOWNLOAD_TIMEOUT_MS),
        })
        if (!upstream.ok || upstream.body === null) {
          return fail(ERROR_CODE_UPSTREAM, '下载失败', HTTP_STATUS_BAD_GATEWAY)
        }
        // 先按 content-length 快速拒绝；缺失/不可信时由 cappedBody 兜底。
        const declared = Number(upstream.headers.get('content-length') ?? 0)
        if (Number.isFinite(declared) && declared > MV_DOWNLOAD_MAX_BYTES) {
          await upstream.body.cancel().catch(() => {})
          return badRequest('文件过大')
        }
        const safeName = name.replace(/["\r\n]/g, '').slice(0, 120) || 'mv.mp4'
        return new Response(cappedBody(upstream.body, MV_DOWNLOAD_MAX_BYTES), {
          headers: {
            [HEADER_CONTENT_TYPE]: CONTENT_TYPE_OCTET_STREAM,
            [HEADER_CONTENT_DISPOSITION]: `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
            [HEADER_CACHE_CONTROL]: 'no-store',
          },
        })
      } catch (error) {
        logger.warn(`${PLUGIN_ID}/mv-download: ${String(error)}`)
        // 不把内部异常原文回传客户端。
        return fail(ERROR_CODE_UPSTREAM, '下载失败，请稍后重试', HTTP_STATUS_BAD_GATEWAY)
      }
    }),
    */
    postRoute(HostApiPath.ArtistFollow, async (request) => {
      const body = (await request.json().catch(() => ({}))) as { id?: unknown; follow?: unknown }
      const id = Number(body.id)
      const follow = body.follow
      if (!Number.isFinite(id) || id <= 0 || typeof follow !== 'boolean') {
        return badRequest('缺少 id / follow 参数')
      }
      return run(logger, 'artist-follow', async () => {
        await followArtist(id, follow)
        return ok({ id, followed: follow })
      })
    }),
  ]
}
