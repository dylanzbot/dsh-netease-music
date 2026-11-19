/* 歌曲评论抽屉（基于通用 NcmDrawer）。 */

import type { NcmCommentDTO, NcmSongDTO } from '../../../types/index.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteComment, getComments, likeComment, replyComment } from '../../api/comment.api.js'
import { relationAction } from '../../api/user.api.js'
import { renderCommentContent } from '../../utils/emoji.js'
import { formatCount, formatDate } from '../../utils/format.js'
import { retryMessage } from '../../constants/message.js'
import { NcmCommentReplyPopover } from './comment-reply-popover.js'
import { NcmConfirmPopover } from '../base/confirm-popover.js'
import { NcmHeartFilledIcon, NcmHeartOutlineIcon } from '../base/icons.js'
import { NcmDrawer } from '../base/drawer.js'
import { NcmImage } from '../base/image.js'
import { NcmSvipTag, NcmVipTag } from '../base/tags.js'
import './comment-drawer.css'

/** 每页条数。 */
const PAGE_SIZE = 20

/** 评论抽屉 props。 */
export interface NcmCommentDrawerProps {
  readonly open: boolean
  readonly onClose: () => void
  /** 当前歌曲（含歌手 / 专辑，用于副标题）。 */
  readonly song: NcmSongDTO | null
  /** 当前登录用户 ID（判断评论是否本人发的，可删除）。 */
  readonly currentUserId?: number
  /** 操作提示（回复 / 删除成功或失败）。 */
  readonly onNotice?: (message: string) => void
}

/** 歌曲评论抽屉。 */
export function NcmCommentDrawer({ open, onClose, song, currentUserId = 0, onNotice }: NcmCommentDrawerProps) {
  const songId = song?.id ?? null
  const [comments, setComments] = useState<readonly NcmCommentDTO[]>([])
  const [total, setTotal] = useState(0)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  /** 回复成功后的静默刷新定时器（卸载 / 切歌时必须清掉）。 */
  const replyTimerRef = useRef<number | null>(null)

  /** 重新拉取第一页评论（打开抽屉 / 回复成功后调用）。 */
  const reload = useCallback(
    (id: number, options?: { silent?: boolean }) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      if (options?.silent !== true) {
        setComments([])
        setTotal(0)
        setMore(false)
        setFailed(false)
        setLoading(true)
      }
      getComments('song', id, PAGE_SIZE, 0, controller.signal)
        .then((page) => {
          if (controller.signal.aborted) return
          setComments(page.comments)
          setTotal(page.total)
          setMore(page.more)
          setLoading(false)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          // 静默刷新失败时保留已有列表
          if (options?.silent !== true) setFailed(true)
          setLoading(false)
        })
    },
    [],
  )

  useEffect(() => {
    if (!open || songId === null) return
    reload(songId)
    return () => {
      abortRef.current?.abort()
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current)
        replyTimerRef.current = null
      }
    }
  }, [open, songId, reload])

  useEffect(() => () => abortRef.current?.abort(), [])

  // 卸载 / 切歌时清掉尚未触发的静默刷新，避免对已关闭抽屉发请求并更新状态。
  useEffect(
    () => () => {
      if (replyTimerRef.current !== null) window.clearTimeout(replyTimerRef.current)
    },
    [],
  )

  const loadMore = async () => {
    if (songId === null || loadingMore || !more) return
    setLoadingMore(true)
    try {
      const page = await getComments('song', songId, PAGE_SIZE, comments.length)
      setComments((prev) => [...prev, ...page.comments])
      setTotal(page.total)
      setMore(page.more)
    } catch {
      // 加载更多失败保留已有内容
    } finally {
      setLoadingMore(false)
    }
  }

  /** 就地更新某条评论（点赞 / 关注后）。 */
  const patchComment = (commentId: number, patch: Partial<NcmCommentDTO>) => {
    setComments((prev) => prev.map((item) => (item.commentId === commentId ? { ...item, ...patch } : item)))
  }

  /** 删除成功后从列表移除。 */
  const removeComment = (commentId: number) => {
    setComments((prev) => prev.filter((item) => item.commentId !== commentId))
    setTotal((prev) => Math.max(0, prev - 1))
  }

  return (
    <NcmDrawer open={open} onClose={onClose} side="right" width={420} ariaLabel="歌曲评论">
      <header className="ncm-comment-drawer__head">
        <div className="ncm-comment-drawer__title">
          <h2>评论</h2>
          <span className="ncm-comment-drawer__count">{total > 0 ? formatCount(total) : '—'} 条</span>
        </div>
        <button type="button" className="ncm-comment-drawer__close ncm-icon-btn" aria-label="关闭评论" onClick={onClose}>
          ×
        </button>
      </header>
      {song !== null ? (
        <div className="ncm-comment-drawer__subtitle" title={song.name}>
          <span className="ncm-comment-drawer__song">{song.name}</span>
          {song.artists.length > 0 ? <span className="ncm-comment-drawer__meta"> · {song.artists.join(' / ')}</span> : null}
          {song.album !== '' ? <span className="ncm-comment-drawer__meta"> · {song.album}</span> : null}
        </div>
      ) : null}

      <div className="ncm-comment-drawer__body ncm-scroll">
        {loading ? (
          <div className="ncm-comment-drawer__hint">评论加载中…</div>
        ) : failed ? (
          <div className="ncm-comment-drawer__hint">评论加载失败，请稍后重试</div>
        ) : comments.length === 0 ? (
          <div className="ncm-comment-drawer__hint">还没有评论，快来抢沙发吧</div>
        ) : (
          <ul className="ncm-comment-drawer__list">
            {comments.map((comment) => (
              <CommentItem
                key={comment.commentId}
                comment={comment}
                isOwn={currentUserId > 0 && comment.user.userId === currentUserId}
                onPatch={(patch) => patchComment(comment.commentId, patch)}
                onReplied={() => {
                  onNotice?.('回复成功')
                  // 上游写入有延迟，立即拉会拿不到刚发的回复；稍等再静默刷新。
                  if (songId !== null) {
                    const id = songId
                    if (replyTimerRef.current !== null) window.clearTimeout(replyTimerRef.current)
                    replyTimerRef.current = window.setTimeout(() => {
                      replyTimerRef.current = null
                      reload(id, { silent: true })
                    }, 1200)
                  }
                }}
                onDeleted={() => {
                  removeComment(comment.commentId)
                  onNotice?.('已删除评论')
                }}
                onNotice={onNotice}
              />
            ))}
          </ul>
        )}
        {!loading && !failed && more ? (
          <button
            type="button"
            className="ncm-comment-drawer__more"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? '加载中…' : '加载更多'}
          </button>
        ) : null}
      </div>
    </NcmDrawer>
  )
}

/** 单条评论。 */
function CommentItem({
  comment,
  isOwn,
  onPatch,
  onReplied,
  onDeleted,
  onNotice,
}: {
  comment: NcmCommentDTO
  isOwn: boolean
  onPatch: (patch: Partial<NcmCommentDTO>) => void
  onReplied: () => void
  onDeleted: () => void
  onNotice?: (message: string) => void
}) {
  const [likeBusy, setLikeBusy] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [followed, setFollowed] = useState(comment.user.followed === true)
  const [replyOpen, setReplyOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const replyBtnRef = useRef<HTMLButtonElement | null>(null)
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null)

  const submitReply = async (content: string): Promise<boolean> => {
    try {
      await replyComment(comment.threadId, comment.commentId, content)
      onReplied()
      return true
    } catch {
      onNotice?.(retryMessage('回复失败'))
      return false
    }
  }

  const doDelete = async () => {
    if (deleteBusy) return
    setDeleteBusy(true)
    try {
      await deleteComment(comment.threadId, comment.commentId)
      setDeleteOpen(false)
      onDeleted()
    } catch {
      onNotice?.(retryMessage('删除失败'))
    } finally {
      setDeleteBusy(false)
    }
  }

  const doLike = async () => {
    if (likeBusy) return
    const next = !comment.liked
    setLikeBusy(true)
    onPatch({ liked: next, likedCount: Math.max(0, comment.likedCount + (next ? 1 : -1)) })
    try {
      await likeComment(comment.threadId, comment.commentId, next)
    } catch {
      // 失败回滚
      onPatch({ liked: comment.liked, likedCount: comment.likedCount })
    } finally {
      setLikeBusy(false)
    }
  }

  const toggleFollow = async () => {
    if (followBusy) return
    const next = !followed
    setFollowBusy(true)
    setFollowed(next)
    try {
      const result = await relationAction(next ? 'follow' : 'unfollow', comment.user.userId)
      if (!result.ok) {
        setFollowed(!next) // 失败回滚
      }
    } catch {
      setFollowed(!next)
    } finally {
      setFollowBusy(false)
    }
  }

  const isSvip = comment.user.vipType >= 110
  const isVip = comment.user.vipType > 0 && !isSvip

  return (
    <li className="ncm-comment-item">
      <NcmImage className="ncm-comment-item__avatar" src={comment.user.avatarUrl} variant="avatar" fallbackText={comment.user.nickname} />
      <div className="ncm-comment-item__main">
        <div className="ncm-comment-item__head">
          <span className="ncm-comment-item__name">{comment.user.nickname}</span>
          {isSvip ? <NcmSvipTag size="sm" /> : null}
          {isVip ? <NcmVipTag size="sm" /> : null}

          <span className="ncm-comment-item__tools">
            {/* 关注 / 取关（样式对齐「我的关注」） */}
            <button
              type="button"
              className={`ncm-comment-item__follow${followed ? ' ncm-comment-item__follow--on' : ''}`}
              disabled={followBusy}
              aria-pressed={followed}
              onClick={() => void toggleFollow()}
            >
              {followed ? '已关注' : '关注'}
            </button>
            {/* 点赞：手绘 SVG 爱心 + 赞数 */}
            <button
              type="button"
              className={`ncm-comment-item__like${comment.liked ? ' ncm-comment-item__like--on' : ''}`}
              disabled={likeBusy}
              aria-pressed={comment.liked}
              aria-label={comment.liked ? '取消点赞' : '点赞'}
              title={comment.liked ? '取消点赞' : '点赞'}
              onClick={() => void doLike()}
            >
              {comment.liked ? (
                <NcmHeartFilledIcon size={14} className="ncm-comment-item__heart" />
              ) : (
                <NcmHeartOutlineIcon size={14} className="ncm-comment-item__heart" />
              )}
              <span className="ncm-comment-item__like-count">{formatCount(comment.likedCount)}</span>
            </button>
          </span>
        </div>
        <p className="ncm-comment-item__content">{renderCommentContent(comment.content)}</p>
        {comment.quoted !== undefined ? (
          <p className="ncm-comment-item__quoted">
            <span className="ncm-comment-item__quoted-name">@{comment.quoted.nickname}</span>：
            {renderCommentContent(comment.quoted.content)}
          </p>
        ) : null}
        <div className="ncm-comment-item__foot">
          <span>{comment.timeText !== '' ? comment.timeText : formatDate(comment.time)}</span>
          {comment.location !== undefined ? <span>{comment.location}</span> : null}
          {comment.replyCount > 0 ? <span>{comment.replyCount} 回复</span> : null}

          <span className="ncm-comment-item__foot-actions">
            <span className="ncm-comment-item__reply-wrap">
              <button
                ref={replyBtnRef}
                type="button"
                className="ncm-comment-item__reply-btn"
                onClick={() => setReplyOpen((value) => !value)}
              >
                回复
              </button>
              <NcmCommentReplyPopover
                open={replyOpen}
                onClose={() => setReplyOpen(false)}
                targetName={comment.user.nickname}
                onSubmit={submitReply}
                anchorRef={replyBtnRef}
              />
            </span>
            {isOwn ? (
              <span className="ncm-comment-item__delete-wrap">
                <button
                  ref={deleteBtnRef}
                  type="button"
                  className="ncm-comment-item__delete-btn"
                  onClick={() => setDeleteOpen((value) => !value)}
                >
                  删除
                </button>
                <NcmConfirmPopover
                  open={deleteOpen}
                  anchorRef={deleteBtnRef}
                  onCancel={() => setDeleteOpen(false)}
                  onConfirm={() => void doDelete()}
                  message="确定删除这条评论吗？"
                  busy={deleteBusy}
                />
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </li>
  )
}
