/* 「我的」页面 / 首页 / 右侧导航用到的线条图标。 */

import type { ReactNode } from 'react'
import './icons.css'

/** 图标公共 props。 */
export interface NcmIconProps {
  /** 方形边长（像素）。 */
  readonly size?: number
  /** 额外 class。 */
  readonly className?: string
}

/** 通用 svg 外壳。 */
function Icon({ size = 16, className, children }: NcmIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** 搜索（放大镜）。 */
export function NcmSearchIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-4.2-4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>
  )
}

/** 首页（房子）。 */
export function NcmHomeIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M3.5 10.5 12 3l8.5 7.5M5.5 9.5V21h13V9.5M9.5 21v-6h5v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  )
}

/** 我的（人像）。 */
export function NcmUserIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="7.5" r="3.8" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.5 20.5c0-4 3.4-6.2 7.5-6.2s7.5 2.2 7.5 6.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Icon>
  )
}

/** 歌手（麦克风）。 */
export function NcmMicIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  )
}

/** 退出。 */
export function NcmLogoutIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M14 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8M13 12h9M19 8.5l3.5 3.5L19 15.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  )
}

/** 性别图标（男 / 女共用组件）。 */
export function NcmGenderIcon({ gender, ...props }: NcmIconProps & { readonly gender: number }) {
  if (gender !== 1 && gender !== 2) return null
  const modifier = gender === 1 ? 'ncm-gender--male' : 'ncm-gender--female'
  const className = `ncm-gender ${modifier}${props.className !== undefined ? ` ${props.className}` : ''}`
  return (
    <Icon {...props} className={className}>
      {gender === 1 ? (
        <>
          <circle cx="10" cy="14" r="4.3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M14.5 9.5 20 4M14.5 4H20v5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8.5" r="4.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 13v8M8.5 17.5h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </Icon>
  )
}

/** 黑胶唱片（会员标识）。 */
export function NcmVinylIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      <path d="M12 3.4v2.1M12 18.5v2.1M3.4 12h2.1M18.5 12h2.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
    </Icon>
  )
}

/** 等级（钻石）。 */
export function NcmLevelIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 3.2 20 8l-8 12.8L4 8l8-4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="1.3" opacity=".6" />
    </Icon>
  )
}

/** 徽章（奖章）。 */
export function NcmBadgeIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="9" r="5.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.8 13.5-1.7 7 4.9-2.8 4.9 2.8-1.7-7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m12 6.2.8 1.7 1.9.2-1.4 1.3.4 1.9-1.7-1-1.7 1 .4-1.9-1.4-1.3 1.9-.2.8-1.7Z" fill="currentColor" opacity=".75" />
    </Icon>
  )
}

/** 耳机（听歌统计）。 */
export function NcmHeadphonesIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M4 13.5v-1.3a8 8 0 0 1 16 0v1.3M4 14h2.4a1 1 0 0 1 1 1v4.2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V14ZM20 14h-2.4a1 1 0 0 0-1 1v4.2a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1V14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  )
}

/** 播放（实心三角）。 */
export function NcmPlayIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5.2 19 12 8 18.8V5.2Z" fill="currentColor" />
    </Icon>
  )
}

/** 爱心。 */
export function NcmHeartIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 20.2S3.6 15.1 3.6 9.6a4.6 4.6 0 0 1 8.4-2.6 4.6 4.6 0 0 1 8.4 2.6c0 5.5-8.4 10.6-8.4 10.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </Icon>
  )
}

/** 音符（空状态）。 */
export function NcmMusicIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M9 18.5V5.6l10-2v12.9M9 18.5a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm10-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  )
}

/** 右箭头。 */
export function NcmChevronRightIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

/** 星光（首页标题装饰）。 */
export function NcmSparkIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 3.5c.7 4.3 2.7 6.3 7 7-4.3.7-6.3 2.7-7 7-.7-4.3-2.7-6.3-7-7 4.3-.7 6.3-2.7 7-7Z"
        fill="currentColor"
      />
      <path d="M18.8 16c.3 1.9 1.2 2.8 3.2 3.2-2 .3-2.9 1.2-3.2 3.2-.3-2-1.2-2.9-3.2-3.2 2-.4 2.9-1.3 3.2-3.2Z" fill="currentColor" opacity=".55" />
    </Icon>
  )
}

/** 随机播放。 */
export function NcmShuffleIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M3 6h2.2c1.7 0 2.9.8 4 2.2l5.6 7.6c1.1 1.4 2.3 2.2 4 2.2H21"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 18h2.2c1.7 0 2.9-.8 4-2.2l1.4-1.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 6h6M18 3l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 18h6M18 15l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

/** 上一首。 */
export function NcmPrevIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M18 5.5v13L8.5 12 18 5.5Z" fill="currentColor" />
      <path d="M6 5.5v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>
  )
}

/** 下一首。 */
export function NcmNextIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M6 5.5v13L15.5 12 6 5.5Z" fill="currentColor" />
      <path d="M18 5.5v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>
  )
}

/** 暂停。 */
export function NcmPauseIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor" />
    </Icon>
  )
}

/** 音量。 */
export function NcmVolumeIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.5v5h3.2l4.3 3.6V5.9L7.2 9.5H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.2 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Icon>
  )
}

/** 静音。 */
export function NcmVolumeMutedIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.5v5h3.2l4.3 3.6V5.9L7.2 9.5H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m16 9 5 5M21 9l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Icon>
  )
}

/** 播放列表（工具按钮）。 */
export function NcmQueueIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h11M4 11h11M4 16h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m16 13 6 3-6 3v-6Z" fill="currentColor" />
    </Icon>
  )
}

/** 信息（圆圈 i），用于音质说明等 hint 入口。 */
export function NcmInfoIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.05" fill="currentColor" />
    </Icon>
  )
}

/** 加号（收藏歌单）。 */
export function NcmPlusIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </Icon>
  )
}

/** 对勾（已收藏）。 */
export function NcmCheckIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.5l4.5 4.5L19.5 6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

/** 评论气泡。 */
export function NcmCommentIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9.2l-3.9 3.1a.6.6 0 0 1-.98-.47V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Icon>
  )
}

/** 爱心（描边空心，用于「未点赞」）。 */
export function NcmHeartOutlineIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 20.2S3.6 15.1 3.6 9.6a4.6 4.6 0 0 1 8.4-2.6 4.6 4.6 0 0 1 8.4 2.6c0 5.5-8.4 10.6-8.4 10.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
      />
    </Icon>
  )
}

/** 爱心（实心填充，用于「已点赞」）。 */
export function NcmHeartFilledIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 20.2S3.6 15.1 3.6 9.6a4.6 4.6 0 0 1 8.4-2.6 4.6 4.6 0 0 1 8.4 2.6c0 5.5-8.4 10.6-8.4 10.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="currentColor"
      />
    </Icon>
  )
}

/** 进入全屏（四角箭头）。 */
export function NcmFullscreenIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

/** 退出全屏（四角向内）。 */
export function NcmExitFullscreenIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

/** 更多（三个点）。 */
export function NcmMoreIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </Icon>
  )
}

/** 播放速度（表盘）。 */
export function NcmSpeedIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M12 12 15.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </Icon>
  )
}

/** 画中画（小窗嵌大窗）。 */
export function NcmPipIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" />
    </Icon>
  )
}

/** 下载（向下的箭头 + 托盘）。 */
export function NcmDownloadIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Icon>
  )
}

/** 刷新（环形箭头，用于「刷新二维码」等）。 */
export function NcmRefreshIcon(props: NcmIconProps) {
  return (
    <Icon {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}
