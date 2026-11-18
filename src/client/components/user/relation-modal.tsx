/* 关注 / 粉丝弹窗（基于通用 NcmModal + NcmUserListItem + NcmConfirmModal）。 */

import { useCallback, useEffect, useState } from 'react'
import type { NcmRelationAction, NcmRelationKindVO, NcmRelationUserDTO } from '../../../types/index.js'
import { getFans, getFollows } from '../../api/user.api.js'
import { NcmConfirmModal } from '../base/confirm-modal.js'
import { NcmModal } from '../base/modal.js'
import { NcmUserListItem } from './user-list-item.js'
import { useRelationAction } from '../../hooks/use-relation-action.js'
import { daysSince } from '../../../utils/time.js'
import './relation-modal.css'

/** 关系弹窗 props。 */
export interface NcmRelationModalProps {
  readonly kind: NcmRelationKindVO | null
  readonly onClose: () => void
  /** 操作后的轻提示。 */
  readonly onNotice?: (message: string) => void
}

/** 计算「N 天」，上游可读文案优先。 */
function daysText(user: NcmRelationUserDTO, mutual: boolean): string {
  const upstream = mutual ? user.mutualFollowDayText : user.followDayText
  if (upstream !== undefined && upstream !== '') return upstream
  const days = daysSince(mutual ? user.mutualTime || user.relationTime : user.relationTime)
  return days > 0 ? `${days}天` : ''
}

/** 关注 / 粉丝弹窗。 */
export function NcmRelationModal({ kind, onClose, onNotice }: NcmRelationModalProps) {
  const [users, setUsers] = useState<readonly NcmRelationUserDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (kind === null) return
    const controller = new AbortController()
    setUsers([])
    setLoading(true)
    setFailed(false)
    const load = kind === 'follows' ? getFollows(30, 0, controller.signal) : getFans(30, 0, controller.signal)
    load
      .then((list) => {
        if (controller.signal.aborted) return
        setUsers(list.users)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setFailed(true)
        setLoading(false)
      })
    return () => controller.abort()
  }, [kind])

  /** 操作成功后的本地列表更新。 */
  const handleChanged = useCallback(
    (action: NcmRelationAction, user: NcmRelationUserDTO) => {
      if (action === 'follow') {
        // 在粉丝弹窗里关注对方，会立即变成互相关注。
        setUsers((list) =>
          list.map((item) =>
            item.userId === user.userId
              ? { ...item, followed: true, mutual: kind === 'fans' ? true : item.mutual }
              : item,
          ),
        )
      } else if (action === 'unfollow') {
        if (kind === 'follows') {
          // 取消关注后从「我的关注」列表移除。
          setUsers((list) => list.filter((item) => item.userId !== user.userId))
        } else {
          setUsers((list) =>
            list.map((item) => (item.userId === user.userId ? { ...item, followed: false, mutual: false } : item)),
          )
        }
      } else {
        setUsers((list) => list.filter((item) => item.userId !== user.userId))
      }
    },
    [kind],
  )

  const { confirm, busy, askConfirm, cancelConfirm, run } = useRelationAction({
    onNotice,
    onChanged: handleChanged,
  })

  const title = kind === 'follows' ? '我的关注' : '我的粉丝'

  return (
    <>
      <NcmModal
        open={kind !== null}
        onClose={onClose}
        className="ncm-relation-modal"
        overlayClassName="ncm-relation-overlay"
      >
        <header className="ncm-relation-modal__head">
          <h2>{title}</h2>
          <span>{loading ? '加载中…' : failed ? '' : `${users.length} 位用户`}</span>
          <button type="button" className="ncm-relation-modal__close ncm-icon-btn" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="ncm-relation-modal__body ncm-scroll">
          {loading ? (
            <div className="ncm-relation-modal__state">正在加载…</div>
          ) : failed ? (
            <div className="ncm-relation-modal__state">加载失败，请关闭后重试</div>
          ) : users.length === 0 ? (
            <div className="ncm-relation-modal__state">这里还没有用户</div>
          ) : (
            users.map((user) => (
              <NcmUserListItem
                key={user.userId}
                user={user}
                mutualDaysText={user.mutual ? daysText(user, true) : undefined}
                action={
                  <RelationAction
                    kind={kind === 'fans' ? 'fans' : 'follows'}
                    user={user}
                    disabled={busy}
                    onFollow={() => void run('follow', user)}
                    onAskConfirm={(action) => askConfirm(action, user)}
                  />
                }
              />
            ))
          )}
        </div>
      </NcmModal>

      <NcmConfirmModal
        open={confirm !== null}
        title={confirm?.action === 'remove-fan' ? '移除粉丝' : '取消关注'}
        message={
          confirm?.action === 'remove-fan'
            ? `确定将「${confirm?.user.nickname ?? ''}」从粉丝中移除吗？`
            : `确定不再关注「${confirm?.user.nickname ?? ''}」吗？`
        }
        confirmText={confirm?.action === 'remove-fan' ? '移除' : '取关'}
        onCancel={cancelConfirm}
        onConfirm={() => {
          if (confirm !== null) void run(confirm.action, confirm.user)
        }}
      />
    </>
  )
}

/** 单个用户的右侧操作区。 */
function RelationAction({
  kind,
  user,
  disabled,
  onFollow,
  onAskConfirm,
}: {
  kind: NcmRelationKindVO
  user: NcmRelationUserDTO
  disabled: boolean
  onFollow: () => void
  onAskConfirm: (action: NcmRelationAction) => void
}) {
  if (kind === 'follows') {
    const days = daysText(user, false)
    return (
      <div className="ncm-relation-modal__action ncm-relation-modal__action--swap" title="悬停可取消关注">
        <span className="ncm-relation-modal__days">{days !== '' ? `关注${days}` : '已关注'}</span>
        <button
          type="button"
          className="ncm-relation-modal__swap-btn"
          disabled={disabled}
          onClick={() => onAskConfirm('unfollow')}
        >
          取关
        </button>
      </div>
    )
  }

  // 粉丝弹窗：右侧固定两个操作按钮；未关注时第一个按钮为「关注」。
  return (
    <div className="ncm-relation-modal__action ncm-relation-modal__action--fan">
      {user.followed ? (
        <button
          type="button"
          className="ncm-relation-modal__unfollow-btn"
          disabled={disabled}
          onClick={() => onAskConfirm('unfollow')}
        >
          取关
        </button>
      ) : (
        <button type="button" className="ncm-relation-modal__follow-btn ncm-btn ncm-btn--accent" disabled={disabled} onClick={onFollow}>
          关注
        </button>
      )}
      <button
        type="button"
        className="ncm-relation-modal__remove-btn ncm-btn"
        disabled={disabled}
        onClick={() => onAskConfirm('remove-fan')}
      >
        移除
      </button>
    </div>
  )
}
