/**
 * 搜索 / 推荐路由。
 *
 * 路由清单：
 *   GET /api/ncm/search        搜索歌曲（keywords）
 *   GET /api/ncm/search/library  在我的歌单 / 收藏里搜（keywords）
 *   GET /api/ncm/search/multi    多类型聚合搜索（keywords / limit）
 *   GET /api/ncm/discover        首页推荐
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/search
 */

import type { Logger } from '../../types/cordis.js'
import { HostApiPath } from './paths.js'
import { ok } from '../utils/response.js'
import { getRoute, intParam, requireKeyword, run, type HostRoute } from './shared.js'
import { getDiscover, search, searchLibrary, searchMulti } from '../services/search.service.js'

/** 组装搜索 / 推荐路由。 */
export function createSearchRouter(logger: Logger): HostRoute[] {
  return [
    getRoute(HostApiPath.Search, (request) => {
      const missing = requireKeyword(request)
      if (missing !== null) return missing
      const keywords = new URL(request.url).searchParams.get('keywords')?.trim() ?? ''
      return run(logger, 'search', async () => ok(await search(keywords)))
    }),
    getRoute(HostApiPath.SearchLibrary, (request) => {
      const missing = requireKeyword(request)
      if (missing !== null) return missing
      const keywords = new URL(request.url).searchParams.get('keywords')?.trim() ?? ''
      return run(logger, 'search-library', async () => ok(await searchLibrary(keywords)))
    }),
    getRoute(HostApiPath.SearchMulti, (request) => {
      const missing = requireKeyword(request)
      if (missing !== null) return missing
      const url = new URL(request.url)
      const keywords = url.searchParams.get('keywords')?.trim() ?? ''
      const limit = intParam(url, 'limit', 5)
      return run(logger, 'search-multi', async () => ok(await searchMulti(keywords, limit)))
    }),
    getRoute(HostApiPath.Discover, () => run(logger, 'discover', async () => ok(await getDiscover()))),
  ]
}
