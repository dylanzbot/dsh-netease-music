/* 二次确认浮层（基于通用 NcmPopover）。 */

import type { RefObject } from 'react'
import { NcmPopover } from './popover.js'
import './confirm-popover.css'

/** 二次确认浮层 props。 */
export interface NcmConfirmPopoverProps {
  readonly open: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
  /** 提示文案，默认「确定删除吗？」。 */
  readonly message?: string
  readonly confirmText?: string
  readonly cancelText?: string
  /** 危险操作（确认按钮红色），默认 true。 */
  readonly danger?: boolean
  /** 确认按钮 loading（提交中）。 */
  readonly busy?: boolean
  /** 触发按钮：点击它不算「点外部」。 */
  readonly anchorRef?: RefObject<HTMLElement | null>
}

/** 二次确认浮层。 */
export function NcmConfirmPopover({
  open,
  onCancel,
  onConfirm,
  message = '确定删除吗？',
  confirmText = '删除',
  cancelText = '取消',
  danger = true,
  busy = false,
  anchorRef,
}: NcmConfirmPopoverProps) {
  return (
    <NcmPopover
      open={open}
      onClose={onCancel}
      anchorRef={anchorRef}
      className="ncm-confirm-popover"
      ariaLabel="确认操作"
      style={{ right: 0, top: 'calc(100% + 6px)' }}
    >
      <span className="ncm-confirm-popover__message">{message}</span>
      <button type="button" className="ncm-confirm-popover__btn ncm-btn" disabled={busy} onClick={onCancel}>
        {cancelText}
      </button>
      <button
        type="button"
        className={`ncm-confirm-popover__btn ncm-btn ${danger ? 'ncm-btn--danger' : 'ncm-btn--accent'}`}
        disabled={busy}
        onClick={onConfirm}
      >
        {busy ? '处理中…' : confirmText}
      </button>
    </NcmPopover>
  )
}
