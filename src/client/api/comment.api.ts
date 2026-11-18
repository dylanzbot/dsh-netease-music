/* 评论接口（浏览器侧）。 */

import type { NcmCommentPageDTO, NcmCommentResourceType } from '../../types/index.js'
import { request } from '../utils/request.js'

/** 评论接口路径。 */
export enum CommentApiPath {
  /** 拉取歌曲 / 歌单评论（分页）。 */
  Comments = '/api/ncm/comments',
  /** 点赞 / 取消点赞一条评论。 */
  Like = '/api/ncm/comment/like',
  /** 回复某条评论。 */
  Reply = '/api/ncm/comment/reply',
  /** 删除自己的评论。 */
  Delete = '/api/ncm/comment/delete',
}

/** 拉取一页评论。 */
export function getComments(
  type: NcmCommentResourceType,
  id: number,
  limit = 20,
  offset = 0,
  signal?: AbortSignal,
): Promise<NcmCommentPageDTO> {
  const query = new URLSearchParams({ type, id: String(id), limit: String(limit), offset: String(offset) })
  return request.get<NcmCommentPageDTO>(`${CommentApiPath.Comments}?${query.toString()}`, signal)
}

/** 点赞 / 取消点赞一条评论。 */
export function likeComment(threadId: string, commentId: number, like: boolean): Promise<{ liked: boolean }> {
  return request.post<{ liked: boolean }>(CommentApiPath.Like, { threadId, commentId, like })
}

/** 回复某条评论。 */
export function replyComment(threadId: string, commentId: number, content: string): Promise<{ ok: boolean }> {
  return request.post<{ ok: boolean }>(CommentApiPath.Reply, { threadId, commentId, content })
}

/** 删除自己的评论。 */
export function deleteComment(threadId: string, commentId: number): Promise<{ ok: boolean }> {
  return request.post<{ ok: boolean }>(CommentApiPath.Delete, { threadId, commentId })
}
