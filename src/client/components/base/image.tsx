/* 通用图片展示组件。 */

import { useEffect, useState, type ReactNode } from 'react'
import { NcmMusicIcon, NcmUserIcon } from './icons.js'
import './image.css'

/** 图片场景类型。 */
export type NcmImageVariant = 'avatar' | 'playlist' | 'song' | 'player'

/** 通用图片 props。 */
export interface NcmImageProps {
  /** 图片地址；空字符串 / undefined 时直接显示兜底图。 */
  readonly src?: string
  readonly alt?: string
  /** 场景决定兜底图样式，默认 song。 */
  readonly variant?: NcmImageVariant
  /** 额外 class（保留调用方原有的尺寸、圆角等布局样式）。 */
  readonly className?: string
  /** 懒加载策略，默认 lazy；首屏关键图可传 eager。 */
  readonly loading?: 'lazy' | 'eager'
  /** 头像场景的无图首字（昵称首字），不传则显示通用用户图标。 */
  readonly fallbackText?: string
}

/** 不同场景的兜底图形。 */
function fallbackFor(variant: NcmImageVariant, fallbackText?: string): ReactNode {
  if (variant === 'avatar') {
    if (fallbackText !== undefined && fallbackText !== '') {
      return <span className="ncm-image__fallback-text">{fallbackText.slice(0, 1)}</span>
    }
    return <NcmUserIcon size={20} />
  }
  if (variant === 'playlist') return <NcmMusicIcon size={30} />
  if (variant === 'player') return <NcmMusicIcon size={22} />
  return <NcmMusicIcon size={18} />
}

/** 通用图片组件。 */
export function NcmImage({
  src,
  alt = '',
  variant = 'song',
  className,
  loading = 'lazy',
  fallbackText,
}: NcmImageProps) {
  const [failed, setFailed] = useState(false)

  // src 变化时重置错误状态，避免换歌后一直显示上一张图的兜底。
  useEffect(() => {
    setFailed(false)
  }, [src])

  const hasSource = typeof src === 'string' && src.trim() !== '' && !failed

  return (
    <span className={`ncm-image ncm-image--${variant}${className !== undefined ? ` ${className}` : ''}`}>
      {hasSource ? (
        <img
          className="ncm-image__img"
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="ncm-image__fallback" aria-hidden="true">
          {fallbackFor(variant, fallbackText)}
        </span>
      )}
    </span>
  )
}
