/**
 * 评论业务逻辑：拉取 / 点赞 / 回复 / 删除。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/comment
 */

import type { NcmCommentPageDTO, NcmCommentResourceType } from '../../types/index.js'
import { deleteComment, fetchComments, likeComment, replyComment } from '../api/index.js'
import { getCookie } from '../credentials.js'
import { NotLoggedInError } from '../error/index.js'

function requireCookie(): string {
  const cookie = getCookie()
  if (cookie === '') throw new NotLoggedInError()
  return cookie
}

/** 拉取一页评论。 */
export async function getComments(
  type: NcmCommentResourceType,
  id: number,
  limit: number,
  offset: number,
): Promise<NcmCommentPageDTO> {
  return fetchComments(type, id, limit, offset, requireCookie())
}

/** 点赞 / 取消点赞一条评论。 */
export async function setCommentLike(
  threadId: string,
  commentId: number,
  like: boolean,
): Promise<{ liked: boolean }> {
  await likeComment(threadId, commentId, like, requireCookie())
  return { liked: like }
}

/** 回复某条评论。 */
export async function replyToComment(threadId: string, commentId: number, content: string): Promise<{ ok: boolean }> {
  await replyComment(threadId, commentId, content, requireCookie())
  return { ok: true }
}

/** 删除自己的评论。 */
export async function removeComment(threadId: string, commentId: number): Promise<{ ok: boolean }> {
  await deleteComment(threadId, commentId, requireCookie())
  return { ok: true }
}
