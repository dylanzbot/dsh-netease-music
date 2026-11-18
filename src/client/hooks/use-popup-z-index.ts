/* 浮层 z-index Hook。 */

import { useState } from 'react'
import { nextZIndex } from '../utils/z-index.js'

/** 返回本次挂载分配到的 z-index。 */
export function usePopupZIndex(): number {
  const [zIndex] = useState(() => nextZIndex())
  return zIndex
}
