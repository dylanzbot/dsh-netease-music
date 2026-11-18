/* 二次确认弹窗（基于通用 NcmModal）。 */

import { NcmModal } from './modal.js'
import './confirm-modal.css'

/** 二次确认弹窗 props。 */
export interface NcmConfirmModalProps {
  readonly open: boolean
  readonly title: string
  readonly message: string
  readonly confirmText?: string
  readonly cancelText?: string
  readonly danger?: boolean
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/** 二次确认弹窗。 */
export function NcmConfirmModal({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = true,
  onConfirm,
  onCancel,
}: NcmConfirmModalProps) {
  return (
    <NcmModal open={open} onClose={onCancel} className="ncm-confirm-modal" overlayClassName="ncm-confirm-modal__overlay">
      <div className="ncm-confirm-modal__body">
        <h3 className="ncm-confirm-modal__title">{title}</h3>
        <p className="ncm-confirm-modal__message">{message}</p>
      </div>
      <div className="ncm-confirm-modal__actions">
        <button type="button" className="ncm-confirm-modal__btn ncm-btn" onClick={onCancel}>
          {cancelText}
        </button>
        <button
          type="button"
          className={`ncm-confirm-modal__btn ncm-btn ${danger ? 'ncm-btn--danger' : 'ncm-btn--accent'}`}
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </div>
    </NcmModal>
  )
}
