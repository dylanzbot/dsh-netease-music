/* 全局 z-index 管理 */

/** 弹层 z-index 基准值。 */
export const Z_INDEX_BASE = 2000

/** 当前序号（私有，外部只能通过 nextZIndex / currentZIndex 访问）。 */
let seed = Z_INDEX_BASE

/** 分配并返回下一个 z-index（2000、2001、2002 …）。 */
export function nextZIndex(): number {
  return seed++
}

/** 查看当前已分配到的最大序号（诊断 / 测试用）。 */
export function currentZIndex(): number {
  return seed - 1
}

/** 重置序号（仅测试用）。 */
export function resetZIndex(value: number = Z_INDEX_BASE): void {
  seed = value
}
