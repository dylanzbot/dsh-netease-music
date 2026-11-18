/**
 * 评论上游接口。
 *
 * 上游（明文 /api/v1/resource/comments）：
 *   - 歌曲评论：R_SO_4_{songId}
 *   - 歌单评论：A_PL_0_{playlistId}
 *
 * 注：weapi 版本这两个接口已 404，只有明文与 eapi 可用；这里走明文。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-comment
 */

import type { NcmCommentDTO, NcmCommentPageDTO, NcmCommentResourceType } from '../../types/index.js'
import { weapiPost } from '../utils/weapi.js'
import { csrfFromCookie } from '../../utils/ncm.js'
import { getNcm, numberOr, imageUrl, NCM_IMAGE_SIZE } from './common.api.js'
import { NcmApiError } from '../error/index.js'

/** 资源类型 + id → 上游评论对象串。 */
function resourceKey(type: NcmCommentResourceType, id: number): string {
  return type === 'song' ? `R_SO_4_${id}` : `A_PL_0_${id}`
}

interface RawCommentUser {
  readonly userId?: number
  readonly nickname?: string
  readonly avatarUrl?: string
  readonly vipType?: number
}

interface RawComment {
  readonly commentId?: number
  readonly content?: string
  readonly likedCount?: number
  readonly liked?: boolean
  readonly time?: number
  readonly timeStr?: string
  readonly ipLocation?: { readonly location?: string } | null
  readonly user?: RawCommentUser | null
  readonly beReplied?: ReadonlyArray<{
    readonly user?: RawCommentUser | null
    readonly content?: string
  }> | null
  readonly showFloorComment?: { readonly replyCount?: number; readonly totalCount?: number } | null
}

interface RawCommentBody {
  readonly code?: number
  readonly total?: number
  readonly more?: boolean
  readonly comments?: readonly RawComment[] | null
  readonly message?: string
}

/** 单条评论映射。 */
function mapComment(raw: RawComment, threadId: string): NcmCommentDTO {
  const user = raw.user ?? {}
  const quotedRaw = raw.beReplied?.find((item) => (item.content ?? '') !== '')
  return {
    commentId: numberOr(raw.commentId),
    threadId,
    content: raw.content ?? '',
    likedCount: numberOr(raw.likedCount),
    liked: raw.liked === true,
    time: numberOr(raw.time),
    timeText: raw.timeStr ?? '',
    ...(raw.ipLocation?.location !== undefined && raw.ipLocation.location !== ''
      ? { location: raw.ipLocation.location }
      : {}),
    user: {
      userId: numberOr(user.userId),
      nickname: user.nickname ?? '匿名用户',
      avatarUrl: imageUrl(user.avatarUrl, NCM_IMAGE_SIZE.xs),
      vipType: numberOr(user.vipType),
      followed: (user as { followed?: boolean }).followed === true,
    },
    ...(quotedRaw !== undefined
      ? {
          quoted: {
            userId: numberOr(quotedRaw.user?.userId),
            nickname: quotedRaw.user?.nickname ?? '',
            content: quotedRaw.content ?? '',
          },
        }
      : {}),
    replyCount: numberOr(raw.showFloorComment?.replyCount ?? raw.showFloorComment?.totalCount),
  }
}

/** 拉取一页评论（limit 默认 20，offset 从 0 开始）。 */
export async function fetchComments(
  type: NcmCommentResourceType,
  id: number,
  limit: number,
  offset: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmCommentPageDTO> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const key = resourceKey(type, id)
  const { body } = await getNcm(`/api/v1/resource/comments/${key}?${params.toString()}`, cookie, signal)
  const data = body as RawCommentBody
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, data.message ?? '评论接口返回失败')
  }
  return {
    total: numberOr(data.total),
    more: data.more === true,
    comments: (data.comments ?? []).map((item) => mapComment(item, key)),
  }
}

/**
 * 点赞 / 取消点赞一条评论（threadId 形如 R_SO_4_{songId}）。
 *
 * 注意：取消点赞必须走独立的 `/api/v1/comment/unlike` 端点；
 * 用 `like=false` 传参上游虽然返回 200，但状态不变（无效）。
 */
export async function likeComment(
  threadId: string,
  commentId: number,
  like: boolean,
  cookie: string,
  signal?: AbortSignal,
): Promise<void> {
  const params = new URLSearchParams({
    threadId,
    commentId: String(commentId),
  })
  const action = like ? 'like' : 'unlike'
  const { body } = await getNcm(`/api/v1/comment/${action}?${params.toString()}`, cookie, signal)
  const data = body as { code?: number; message?: string }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, data.message ?? '评论点赞失败')
  }
}

/** 从 Cookie 里取 csrf_token（发评论 / 回复 / 删除需要）。 */

/**
 * 发评论 / 回复 / 删除评论（weapi）。
 *
 * - 发顶层评论：path=/resource/comments/add，传 threadId + content
 * - 回复某条评论：path=/resource/comments/reply，额外传 commentId
 * - 删除自己的评论：path=/resource/comments/delete，传 threadId + commentId
 */
async function postCommentAction(
  path: string,
  threadId: string,
  content: string | null,
  commentId: number | null,
  cookie: string,
  signal?: AbortSignal,
): Promise<void> {
  const data: Record<string, string> = { threadId, csrf_token: csrfFromCookie(cookie) }
  if (content !== null) data.content = content
  if (commentId !== null) data.commentId = String(commentId)
  const { body } = await weapiPost(path, data, cookie, signal)
  const data2 = body as { code?: number; msg?: string; message?: string }
  if (data2.code !== undefined && data2.code !== 200) {
    throw new NcmApiError(data2.code, data2.msg ?? data2.message ?? '评论操作失败')
  }
}

/** 回复某条评论。 */
export async function replyComment(
  threadId: string,
  commentId: number,
  content: string,
  cookie: string,
  signal?: AbortSignal,
): Promise<void> {
  await postCommentAction('/resource/comments/reply', threadId, content, commentId, cookie, signal)
}

/** 删除自己的评论。 */
export async function deleteComment(
  threadId: string,
  commentId: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<void> {
  await postCommentAction('/resource/comments/delete', threadId, null, commentId, cookie, signal)
}
