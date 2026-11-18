/* 通用用户列表项组件。 */

import type { ReactNode } from 'react'
import type { NcmRelationUserDTO } from '../../../types/index.js'
import { NcmBadgeIcon, NcmGenderIcon, NcmLevelIcon } from '../base/icons.js'
import { NcmImage } from '../base/image.js'
import { NcmVipTag } from '../base/tags.js'
import './user-list-item.css'

/** 用户列表项 props。 */
export interface NcmUserListItemProps {
  readonly user: NcmRelationUserDTO
  /** 「互相关注XX天」文案（互相关注时显示在黑胶会员后面）。 */
  readonly mutualDaysText?: string
  /** 右侧操作区。 */
  readonly action?: ReactNode
}

/** 通用用户列表项。 */
export function NcmUserListItem({ user, mutualDaysText, action }: NcmUserListItemProps) {
  return (
    <article className="ncm-user-list-item">
      <NcmImage
        className="ncm-user-list-item__avatar"
        src={user.avatarUrl}
        alt={`${user.nickname} 的头像`}
        variant="avatar"
        fallbackText={user.nickname}
      />
      <div className="ncm-user-list-item__main">
        <div className="ncm-user-list-item__head">
          <span className="ncm-user-list-item__name" title={user.nickname}>
            {user.nickname}
          </span>
          <NcmGenderIcon gender={user.gender} size={12} />
          {user.level > 0 ? (
            <span className="ncm-user-list-item__level" title={`等级 LV.${user.level}`}>
              <NcmLevelIcon size={11} /> LV.{user.level}
            </span>
          ) : null}
          {user.badgeCount > 0 ? (
            <span className="ncm-user-list-item__badge" title={`${user.badgeCount} 枚徽章`}>
              <NcmBadgeIcon size={11} /> 徽章 {user.badgeCount}
            </span>
          ) : null}
          {user.vipType > 0 ? (
            <NcmVipTag label={user.vipLevel !== undefined ? `黑胶会员 V${user.vipLevel}` : '黑胶会员'} />
          ) : null}
          {user.mutual ? (
            <span className="ncm-user-list-item__mutual">
              互相关注{mutualDaysText !== undefined && mutualDaysText !== '' ? mutualDaysText : ''}
            </span>
          ) : null}
        </div>
        <p className="ncm-user-list-item__signature" title={user.signature}>
          {user.signature.trim() !== '' ? user.signature : '这个人很懒，还没有留下个性签名～'}
        </p>
      </div>
      {action !== undefined ? <div className="ncm-user-list-item__action">{action}</div> : null}
    </article>
  )
}
