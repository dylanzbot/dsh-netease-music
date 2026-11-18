/* 轻量提示浮层（Hover Popover，基于通用 NcmPopover）。 */

import { useState, type ReactNode } from 'react'
import { NcmInfoIcon } from './icons.js'
import { NcmPopover } from './popover.js'
import './hint-popover.css'

/** 提示浮层 props。 */
export interface NcmHintPopoverProps {
  /** 触发按钮的无障碍名称。 */
  readonly label: string
  /** 气泡内容。 */
  readonly children: ReactNode
  /** 气泡位置，默认在图标上方。 */
  readonly placement?: 'top' | 'bottom'
  /** 水平对齐：center 居中 / right 右对齐（靠右边缘时避免溢出）。 */
  readonly align?: 'center' | 'right'
}

/** 信息图标 + hover 气泡。 */
export function NcmHintPopover({ label, children, placement = 'top', align = 'center' }: NcmHintPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className="ncm-hint" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`ncm-hint__trigger${open ? ' ncm-hint__trigger--open' : ''}`}
        aria-label={label}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
      >
        <NcmInfoIcon size={13} />
      </button>
      <NcmPopover
        open={open}
        onClose={() => setOpen(false)}
        className={`ncm-hint__bubble ncm-hint__bubble--${placement}${align === 'right' ? ' ncm-hint__bubble--right' : ''}`}
        role="tooltip"
        closeOnOutsideClick={false}
        closeOnEscape={false}
      >
        {children}
      </NcmPopover>
    </span>
  )
}
