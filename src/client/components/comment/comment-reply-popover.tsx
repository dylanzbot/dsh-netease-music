/* 评论回复输入浮层（基于通用 NcmPopover）。 */

import { useEffect, useRef, useState } from 'react'
import { NcmPopover } from '../base/popover.js'
import './comment-reply-popover.css'

/** 回复输入浮层 props。 */
export interface NcmCommentReplyPopoverProps {
  readonly open: boolean
  readonly onClose: () => void
  /** 回复对象昵称（用于占位提示）。 */
  readonly targetName: string
  /** 提交回复；返回 Promise，成功后由使用方关闭。 */
  readonly onSubmit: (content: string) => Promise<boolean>
  /** 触发按钮（点击它不算「点外部」，避免刚打开就被关）。 */
  readonly anchorRef?: React.RefObject<HTMLElement | null>
}

/** 回复输入浮层。 */
export function NcmCommentReplyPopover({ open, onClose, targetName, onSubmit, anchorRef }: NcmCommentReplyPopoverProps) {
  if (!open) return null
  return <NcmCommentReplyLayer onClose={onClose} targetName={targetName} onSubmit={onSubmit} anchorRef={anchorRef} />
}

/** 已打开的回复层（挂载时聚焦输入框、分配 z-index）。 */
function NcmCommentReplyLayer({
  onClose,
  targetName,
  onSubmit,
  anchorRef,
}: Omit<NcmCommentReplyPopoverProps, 'open'>) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    // 打开即聚焦输入框。
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const submit = async () => {
    const content = text.trim()
    if (content === '' || busy) return
    setBusy(true)
    const ok = await onSubmit(content)
    setBusy(false)
    if (ok) {
      setText('')
      onClose()
    }
  }

  return (
    <NcmPopover
      open
      onClose={onClose}
      anchorRef={anchorRef}
      className="ncm-comment-reply"
      ariaLabel="回复评论"
    >
      <textarea
        ref={inputRef}
        className="ncm-comment-reply__input"
        placeholder={`回复 @${targetName}`}
        value={text}
        rows={3}
        maxLength={140}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // Ctrl / Cmd + Enter 快捷提交
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            void submit()
          }
        }}
      />
      <div className="ncm-comment-reply__actions">
        <span className="ncm-comment-reply__count">{text.length}/140</span>
        <button type="button" className="ncm-comment-reply__btn ncm-btn" disabled={busy} onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          className="ncm-comment-reply__btn ncm-btn ncm-btn--accent"
          disabled={busy || text.trim() === ''}
          onClick={() => void submit()}
        >
          {busy ? '发送中…' : '确认'}
        </button>
      </div>
    </NcmPopover>
  )
}
