/* 「我的」页面顶部 Hero（深色唱片封套风格）。 */

import type { NcmMeDTO } from '../../../types/index.js'
import { NcmImage } from '../base/image.js'
import {
  NcmBadgeIcon,
  NcmGenderIcon,
  NcmHeadphonesIcon,
  NcmLevelIcon,
  NcmVinylIcon,
} from '../base/icons.js'
import { NcmSvipTag, NcmVipTag } from '../base/tags.js'
import { formatCount, formatListenHoursValue, formatListenMinutesValue, genderLabel } from '../../utils/format.js'
import { cssUrl } from '../../utils/css.js'

/** Hero props。 */
export interface MineHeroProps {
  readonly me: NcmMeDTO
  /** 是否显示关注 / 粉丝数量（插件设置）。 */
  readonly showFollowStats: boolean
  /** 点击「关注」/「粉丝」打开关系弹窗。 */
  readonly onOpenRelation?: (kind: 'follows' | 'fans') => void
}

/** 我的页面 Hero。 */
export function MineHero({ me, showFollowStats, onOpenRelation }: MineHeroProps) {
  const { profile } = me
  const heroCover = profile.backgroundUrl !== '' ? profile.backgroundUrl : (me.liked?.coverUrl ?? '')
  const backgroundImage = cssUrl(heroCover)
  const isVip = profile.vipType > 0 || profile.vipLevel !== undefined
  // vipType: 11 = 黑胶 VIP，110 = 黑胶超级会员（SVIP）。位掩码 >= 110 视为超级会员。
  const isSvip = profile.vipType >= 110
  const vipLabel = isSvip ? '黑胶超级会员' : '黑胶会员'
  const signature = profile.signature.trim() !== '' ? profile.signature : '这个人很懒，还没有留下个性签名～'

  return (
    <header className="ncm-hero">
      <span
        className="ncm-hero__bg"
        aria-hidden="true"
        style={backgroundImage !== undefined ? { backgroundImage } : undefined}
      />
      <span className="ncm-hero__veil" aria-hidden="true" />

      <div className="ncm-hero__content">
        <div className="ncm-avatar__wrap">
          <span className="ncm-avatar__vinyl" aria-hidden="true" />
          <NcmImage
            className="ncm-avatar"
            src={profile.avatarUrl}
            alt={`${profile.nickname} 的头像`}
            variant="avatar"
            fallbackText={profile.nickname}
            loading="eager"
          />
        </div>

        <div className="ncm-mine__identity">
          <div className="ncm-mine__name-row">
            <h1 className="ncm-mine__name" title={profile.nickname}>
              {profile.nickname}
            </h1>
            {isVip ? (
              isSvip ? (
                <NcmSvipTag
                  size="lg"
                  title={profile.vipLevelName ?? vipLabel}
                  icon={<NcmVinylIcon size={14} />}
                  trailing={profile.vipLevel !== undefined ? `V${profile.vipLevel}` : undefined}
                />
              ) : (
                <NcmVipTag
                  size="lg"
                  title={profile.vipLevelName ?? vipLabel}
                  icon={<NcmVinylIcon size={14} />}
                  trailing={profile.vipLevel !== undefined ? `V${profile.vipLevel}` : undefined}
                />
              )
            ) : null}
            {profile.authText !== undefined ? (
              <span className="ncm-auth__pill" title={profile.authText}>
                {profile.authIconUrl !== undefined ? (
                  <img className="ncm-auth__icon" src={profile.authIconUrl} alt="" />
                ) : (
                  <NcmBadgeIcon size={14} />
                )}
              </span>
            ) : null}
          </div>

          <div className="ncm-mine__meta-row">
            <span className="ncm-mine__meta-item" title={`性别：${genderLabel(profile.gender)}`}>
              <NcmGenderIcon gender={profile.gender} size={13} />
              {genderLabel(profile.gender)}
            </span>
            <span className="ncm-mine__meta-dot" aria-hidden="true" />
            <span className="ncm-mine__meta-item" title={`等级 LV.${profile.level}`}>
              <NcmLevelIcon size={13} />
              LV.{profile.level}
            </span>
            {profile.badges !== undefined && profile.badges.count > 0 ? (
              <>
                <span className="ncm-mine__meta-dot" aria-hidden="true" />
                <span
                  className="ncm-mine__meta-item"
                  title={profile.badges.name !== undefined ? `徽章：${profile.badges.name}` : '徽章'}
                >
                  <NcmBadgeIcon size={13} />
                  {formatCount(profile.badges.count)} 徽章
                </span>
              </>
            ) : null}
            {showFollowStats ? (
              <>
                <span className="ncm-mine__meta-dot" aria-hidden="true" />
                <button
                  type="button"
                  className="ncm-mine__meta-item ncm-mine__meta-link"
                  title="查看关注列表"
                  onClick={() => onOpenRelation?.('follows')}
                >
                  <b>{formatCount(profile.follows)}</b> 关注
                </button>
                <button
                  type="button"
                  className="ncm-mine__meta-item ncm-mine__meta-link"
                  title="查看粉丝列表"
                  onClick={() => onOpenRelation?.('fans')}
                >
                  <b>{formatCount(profile.followeds)}</b> 粉丝
                </button>
              </>
            ) : null}
          </div>

          <p className="ncm-mine__signature" title={signature}>
            {signature}
          </p>
        </div>

        <div className="ncm-hero__stats">
          <div className="ncm-mine__stat">
            <b>{profile.listenSongs.toLocaleString('zh-CN')}</b>
            <span>
              <NcmHeadphonesIcon size={11} /> 累计听歌
            </span>
          </div>
          {me.listenStats?.weekPlayMinutes !== undefined ? (
            <div className="ncm-mine__stat">
              <b>{formatListenMinutesValue(me.listenStats.weekPlayMinutes)}</b>
              <span>最近一周（分钟）</span>
            </div>
          ) : null}
          {me.listenStats?.totalDurationSeconds !== undefined ? (
            <div className="ncm-mine__stat">
              <b>{formatListenHoursValue(me.listenStats.totalDurationSeconds)}</b>
              <span>所有时间（小时）</span>
            </div>
          ) : null}
          <div className="ncm-mine__stat">
            <b>{formatCount(me.playlists.length)}</b>
            <span>创建歌单</span>
          </div>
          <div className="ncm-mine__stat">
            <b>{formatCount(me.collections.length)}</b>
            <span>收藏歌单</span>
          </div>
        </div>
      </div>
    </header>
  )
}
