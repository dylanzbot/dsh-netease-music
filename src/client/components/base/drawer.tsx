/* 通用抽屉组件（Drawer）。 */

import { useEffect, type ReactNode } from 'react'
import { usePopupZIndex } from '../../hooks/use-popup-z-index.js'
import './drawer.css'

/** 抽屉弹出方向。 */
export type NcmDrawerSide = 'right' | 'left'

/** 抽屉 props。 */
export interface NcmDrawerProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly children: ReactNode
  /** 弹出方向，默认从右侧。 */
  readonly side?: NcmDrawerSide
  /** 面板宽度（px 或 CSS 值），默认 420。 */
  readonly width?: number | string
  /** 面板自定义 class。 */
  readonly className?: string
  /** 点击遮罩是否关闭，默认 true。 */
  readonly closeOnOverlayClick?: boolean
  /** 无障碍名称。 */
  readonly ariaLabel?: string
}

/** 通用抽屉。 */
export function NcmDrawer(props: NcmDrawerProps) {
  if (!props.open) return null
  return <NcmDrawerLayer {...props} />
}

/** 已打开的抽屉（仅 open 时挂载，负责分配 z-index 与关闭事件）。 */
function NcmDrawerLayer({
  onClose,
  children,
  side = 'right',
  width = 420,
  className,
  closeOnOverlayClick = true,
  ariaLabel,
}: NcmDrawerProps) {
  const zIndex = usePopupZIndex()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const widthValue = typeof width === 'number' ? `${width}px` : width

  return (
    <div
      className={`ncm-drawer__overlay ncm-drawer__overlay--${side}`}
      style={{ zIndex }}
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`ncm-drawer ncm-drawer--${side} ncm-scroll${className !== undefined ? ` ${className}` : ''}`}
        style={{ width: widthValue }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  )
}
