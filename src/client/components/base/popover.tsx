/* 通用浮层组件（Popover）。 */

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { usePopupZIndex } from '../../hooks/use-popup-z-index.js'
import './popover.css'

/** 浮层语义角色。 */
export type NcmPopoverRole = 'dialog' | 'menu' | 'listbox' | 'tooltip'

/** 通用浮层 props。 */
export interface NcmPopoverProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly children: ReactNode
  /* 触发元素（按钮 / 输入框）。 */
  readonly anchorRef?: RefObject<HTMLElement | null>
  /** 浮层自定义 class。 */
  readonly className?: string
  /** 语义角色。 */
  readonly role?: NcmPopoverRole
  /** 无障碍名称。 */
  readonly ariaLabel?: string
  /** 额外样式（主要用来做定位）。 */
  readonly style?: CSSProperties
  /** 点击外部是否关闭，默认 true。 */
  readonly closeOnOutsideClick?: boolean
  /** 按 Esc 是否关闭，默认 true。 */
  readonly closeOnEscape?: boolean
}

/** 通用浮层。 */
export function NcmPopover(props: NcmPopoverProps) {
  if (!props.open) return null
  return <NcmPopoverLayer {...props} />
}

/** 已打开的浮层（仅在 open 时挂载，负责分配 z-index 与关闭事件）。 */
function NcmPopoverLayer({
  onClose,
  children,
  anchorRef,
  className,
  role,
  ariaLabel,
  style,
  closeOnOutsideClick = true,
  closeOnEscape = true,
}: NcmPopoverProps) {
  const zIndex = usePopupZIndex()
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!closeOnOutsideClick) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) === true) return
      if (anchorRef?.current?.contains(target) === true) return
      onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [anchorRef, closeOnOutsideClick, onClose])

  useEffect(() => {
    if (!closeOnEscape) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeOnEscape, onClose])

  return (
    <div
      ref={rootRef}
      className={`ncm-popover${className !== undefined ? ` ${className}` : ''}`}
      style={{ zIndex, ...style }}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}
