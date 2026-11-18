/**
 * 评论路由。
 *
 * 路由清单：
 *   GET  /api/ncm/comments        拉取一页评论（type / id / limit / offset）
 *   POST /api/ncm/comment/like    点赞 / 取消点赞（threadId / commentId / like）
 *   POST /api/ncm/comment/reply   回复（threadId / commentId / content）
 *   POST /api/ncm/comment/delete  删除自己的评论（threadId / commentId）
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/comment
 */

import type { Logger } from '../../types/cordis.js'
import { HostApiPath } from './paths.js'
import { ok } from '../utils/response.js'
import {
  badRequest,
  bodyNumber,
  bodyString,
  getRoute,
  intParam,
  postRoute,
  requirePositiveId,
  run,
  type HostRoute,
} from './shared.js'
import { getComments, removeComment, replyToComment, setCommentLike } from '../services/comment.service.js'
import { NcmCommentResourceType } from '../../types/index.js'

/** 组装评论路由。 */
export function createCommentRouter(logger: Logger): HostRoute[] {
  return [
    getRoute(HostApiPath.Comments, (request) => {
      const url = new URL(request.url)
      const type = url.searchParams.get('type') ?? 'song'
      if (type !== 'song' && type !== 'playlist') {
        return badRequest('type 只能是 song / playlist')
      }
      const missing = requirePositiveId(request)
      if (missing !== null) return missing
      const id = intParam(url, 'id', 0)
      const limit = Math.min(Math.max(intParam(url, 'limit', 20), 1), 100)
      const offset = intParam(url, 'offset', 0)
      return run(logger, 'comments', async () => ok(await getComments(type as NcmCommentResourceType, id, limit, offset)))
    }),
    postRoute(HostApiPath.CommentLike, async (request) => {
      const threadId = await bodyString(request, 'threadId')
      const commentId = await bodyNumber(request, 'commentId')
      const body = (await request.json().catch(() => ({}))) as { like?: unknown }
      const like = body.like
      if (threadId === '' || commentId <= 0 || typeof like !== 'boolean') {
        return badRequest('缺少 threadId / commentId / like 参数')
      }
      return run(logger, 'comment-like', async () => ok(await setCommentLike(threadId, commentId, like)))
    }),
    postRoute(HostApiPath.CommentReply, async (request) => {
      const threadId = await bodyString(request, 'threadId')
      const commentId = await bodyNumber(request, 'commentId')
      const content = (await bodyString(request, 'content')).trim()
      if (threadId === '' || commentId <= 0 || content === '') {
        return badRequest('缺少 threadId / commentId / content 参数')
      }
      return run(logger, 'comment-reply', async () => ok(await replyToComment(threadId, commentId, content)))
    }),
    postRoute(HostApiPath.CommentDelete, async (request) => {
      const threadId = await bodyString(request, 'threadId')
      const commentId = await bodyNumber(request, 'commentId')
      if (threadId === '' || commentId <= 0) {
        return badRequest('缺少 threadId / commentId 参数')
      }
      return run(logger, 'comment-delete', async () => ok(await removeComment(threadId, commentId)))
    }),
  ]
}
