/* 统一标签组件（黑胶会员 / 黑胶超级会员 / 无版权）。 */

import type { ReactNode } from 'react'
import type { NcmSongDTO } from '../../../types/index.js'
import type { PlaybackUnavailableReason } from '../../../types/player.js'
import './tags.css'

/* 标签尺寸档位。 */
export type NcmTagSize = 'sm' | 'md' | 'lg' | 'xl'

/** 标签公共 props。 */
interface NcmTagBaseProps {
  /** 文案，默认按标签类型取。 */
  readonly label?: string
  /** 尺寸，默认 md。 */
  readonly size?: NcmTagSize
  /** 左侧图标（如 Hero 的黑胶唱片图标）。 */
  readonly icon?: ReactNode
  /** 右侧补充内容（如 Hero 的会员等级「V6」）。 */
  readonly trailing?: ReactNode
  /** 原生 title 提示。 */
  readonly title?: string
}

/** 拼装标签 class。 */
function tagClass(modifier: string, size: NcmTagSize, extra?: string): string {
  // md 是默认尺寸，沿用基础 .ncm-tag 样式，不再叠加尺寸类
  const sizeClass = size === 'md' ? 'ncm-tag--md' : `${modifier}-${size}`
  return ['ncm-tag', modifier, sizeClass, extra].filter((part) => part !== '').join(' ')
}

/** 渲染标签内容（图标 + 文案 + 尾部）。 */
function TagContent({ icon, label, trailing }: NcmTagBaseProps & { label: string }) {
  return (
    <>
      {icon !== undefined ? <span className="ncm-tag__icon">{icon}</span> : null}
      <span className="ncm-tag__label">{label}</span>
      {trailing !== undefined ? <span className="ncm-tag__trailing">{trailing}</span> : null}
    </>
  )
}

/** 会员标签 props。 */
export interface NcmVipTagProps extends NcmTagBaseProps {
  /** 保留的旧样式变体，默认不使用。 */
  readonly variant?: 'default' | 'legacy'
}

/** 黑胶会员标签。 */
export function NcmVipTag({
  label = '黑胶会员',
  variant = 'default',
  size = 'md',
  icon,
  trailing,
  title,
}: NcmVipTagProps) {
  if (variant === 'legacy') {
    return <em className="ncm-tag ncm-tag--legacy ncm-search-vip">{label}</em>
  }
  return (
    <span className={tagClass('ncm-tag--vip', size)} title={title}>
      <TagContent label={label} icon={icon} trailing={trailing} size={size} />
    </span>
  )
}

/** 黑胶超级会员标签 props。 */
export interface NcmSvipTagProps extends NcmTagBaseProps {}

/** 黑胶超级会员标签（金色，区别于普通黑胶会员的红色）。 */
export function NcmSvipTag({ label = '黑胶超级会员', size = 'md', icon, trailing, title }: NcmSvipTagProps) {
  return (
    <span className={tagClass('ncm-tag--svip', size)} title={title}>
      <TagContent label={label} icon={icon} trailing={trailing} size={size} />
    </span>
  )
}

/** 无版权标签 props。 */
export interface NcmNoCopyrightTagProps {
  readonly label?: string
}

/** 无版权标签。 */
export function NcmNoCopyrightTag({ label = '无版权' }: NcmNoCopyrightTagProps) {
  return <span className="ncm-tag ncm-tag--no-copyright">{label}</span>
}

/** 根据歌曲状态自动选择合适的标签。 */
export interface NcmSongTagProps {
  readonly song: NcmSongDTO
  /**
   * 已废弃：黑胶标签表示「歌曲需要会员」，与当前账号是否会员无关。
   * 保留仅为兼容已有调用方，组件不再读取；新代码不要传。
   */
  readonly hasVip?: boolean
  /** 引擎记录的不可播放原因。 */
  readonly reason?: PlaybackUnavailableReason
}

/* 歌曲可用性标签：会员歌始终展示黑胶标签（表示「这首歌需要会员」）。 */
export function NcmSongTag({ song, reason }: NcmSongTagProps) {
  if (song.noCopyright === true || reason === 'copyright') return <NcmNoCopyrightTag />
  if (reason === 'vip' || song.fee === 1 || song.fee === 4) return <NcmVipTag />
  return null
}
