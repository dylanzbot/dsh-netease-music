/* 订阅播放器状态的 React Hook。 */

import type { NcmPlayerStateVO } from '../../types/player.js'
import { useEffect, useState } from 'react'
import { getPlayerState, subscribePlayer } from '../player/engine.js'

/** 读取播放器状态，并在引擎变化时自动重渲染。 */
export function useNcmPlayer(): NcmPlayerStateVO {
  const [state, setState] = useState<NcmPlayerStateVO>(() => getPlayerState())
  useEffect(() => {
    const unsubscribe = subscribePlayer(setState)
    // 补齐 render → effect 之间可能发生的 emit，避免漏更新窗口。
    setState(getPlayerState())
    return unsubscribe
  }, [])
  return state
}
