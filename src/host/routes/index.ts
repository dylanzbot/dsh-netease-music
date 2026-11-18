/**
 * 宿主路由清单。
 *
 * 把各领域的 router 集中在这里聚合，`src/host/index.ts` 只需调用一次
 * `createHostRouters()` 即可拿到全部路由；新增路由只改本文件一处。
 *
 * @module @dylanzbot/dsh-netease-music/host/routes
 */

import type { Logger } from '../../types/cordis.js'
import { createAccountRouter } from './account.js'
import { createArtistRouter } from './artist.js'
import { createAuthRouter } from './auth.js'
import { createCommentRouter } from './comment.route.js'
import { createPlaylistRouter } from './playlist.route.js'
import { createRelationRouter } from './relation.js'
import { createSearchRouter } from './search.route.js'
import { createSettingsRouter } from './settings.route.js'
import { createSongRouter } from './song.route.js'
import type { HostRoute } from './shared.js'

/**
 * 组装全部宿主路由。
 *
 * @param logger - dsh 的命名 logger，透传给各领域 router。
 */
export function createHostRouters(logger: Logger): HostRoute[] {
  return [
    ...createAuthRouter(logger),
    ...createAccountRouter(logger),
    ...createSettingsRouter(logger),
    ...createRelationRouter(logger),
    ...createSearchRouter(logger),
    ...createSongRouter(logger),
    ...createCommentRouter(logger),
    ...createPlaylistRouter(logger),
    ...createArtistRouter(logger),
  ]
}

export type { HostRoute } from './shared.js'
