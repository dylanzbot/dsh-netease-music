/* 关注 / 取关 / 移除粉丝的统一操作逻辑。 */

import { useCallback, useState } from 'react'
import type { NcmRelationAction, NcmRelationUserDTO } from '../../types/index.js'
import { relationAction } from '../api/user.api.js'
import { MSG_OPERATION_FAILED } from '../constants/message.js'

/** 待二次确认的关系操作。 */
export interface PendingRelationAction {
  readonly action: NcmRelationAction
  readonly user: NcmRelationUserDTO
}

/** hook 配置。 */
export interface UseRelationActionOptions {
  /** 操作完成后的轻提示。 */
  readonly onNotice?: (message: string) => void
  /** 操作成功后的列表更新回调（由调用方决定如何更新 UI）。 */
  readonly onChanged?: (action: NcmRelationAction, user: NcmRelationUserDTO) => void
}

/** 通用关系操作 hook。 */
export function useRelationAction({ onNotice, onChanged }: UseRelationActionOptions) {
  const [confirm, setConfirm] = useState<PendingRelationAction | null>(null)
  const [busy, setBusy] = useState(false)

  /** 打开二次确认。 */
  const askConfirm = useCallback((action: NcmRelationAction, user: NcmRelationUserDTO) => {
    setConfirm({ action, user })
  }, [])

  /** 关闭二次确认。 */
  const cancelConfirm = useCallback(() => setConfirm(null), [])

  /** 执行操作；成功后通知调用方更新列表。 */
  const run = useCallback(
    async (action: NcmRelationAction, user: NcmRelationUserDTO) => {
      setBusy(true)
      try {
        const result = await relationAction(action, user.userId)
        onNotice?.(result.message)
        if (result.ok) onChanged?.(action, user)
      } catch {
        onNotice?.(MSG_OPERATION_FAILED)
      } finally {
        setBusy(false)
        setConfirm(null)
      }
    },
    [onNotice, onChanged],
  )

  return { confirm, busy, askConfirm, cancelConfirm, run }
}
