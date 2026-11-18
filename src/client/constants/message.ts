/**
 * 客户端统一错误文案。
 *
 * 只收拢「跨模块重复出现」的文案；各页面特有的前缀（如「歌单加载失败」）
 * 用 `retryMessage()` 拼统一的「请稍后重试」后缀，避免散落的字面量。
 *
 * @module @dylanzbot/dsh-netease-music/client/constants/message
 */

/** 请稍后重试（统一后缀）。 */
export const MSG_RETRY_LATER = '请稍后重试'

/** 操作失败。 */
export const MSG_OPERATION_FAILED = `操作失败，${MSG_RETRY_LATER}`

/** 加载失败。 */
export const MSG_LOAD_FAILED = `加载失败，${MSG_RETRY_LATER}`

/** 播放失败。 */
export const MSG_PLAY_FAILED = `播放失败，${MSG_RETRY_LATER}`

/** 给具体动作名拼统一的重试后缀，如 `retryMessage('评论加载失败')`。 */
export function retryMessage(prefix: string): string {
  return `${prefix}，${MSG_RETRY_LATER}`
}
