/* 通用弹窗组件。 */

import { useEffect, type ReactNode } from 'react'
import { usePopupZIndex } from '../../hooks/use-popup-z-index.js'
import './modal.css'

/** 弹窗 props。 */
export interface NcmModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly children: ReactNode
  /** 弹窗面板自定义 class。 */
  readonly className?: string
  /** 遮罩层自定义 class（用于改成透明浮层等）。 */
  readonly overlayClassName?: string
  /** 是否允许点击遮罩关闭，默认 true。 */
  readonly closeOnOverlayClick?: boolean
  /** dialog 的可读名称：传标题元素的 id（对应 aria-labelledby）。 */
  readonly ariaLabelledBy?: string
}

/* 弹窗外壳。 */
export function NcmModal(props: NcmModalProps) {
  if (!props.open) return null
  return <NcmModalLayer {...props} />
}

/** 已打开的弹窗层（仅在 open 时挂载）。 */
function NcmModalLayer({
  onClose,
  children,
  className,
  overlayClassName,
  closeOnOverlayClick = true,
  ariaLabelledBy,
}: NcmModalProps) {
  const zIndex = usePopupZIndex()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className={`ncm-modal__overlay${overlayClassName !== undefined ? ` ${overlayClassName}` : ''}`}
      style={{ zIndex }}
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`ncm-modal ncm-scroll${className !== undefined ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
      >
        {children}
      </div>
    </div>
  )
}
