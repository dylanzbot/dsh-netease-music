/**
 * JSON 解析工具（宿主侧使用；浏览器侧继续用 Response.json()）。
 *
 * @module @dylanzbot/dsh-netease-music/utils/json
 */

/**
 * 安全解析 JSON 文本。
 * 解析成功返回解析结果；失败时不抛异常，而是返回 `{ raw: text }`，
 * 让调用方自行决定如何处理非 JSON 响应。
 */
export function parseJsonOrRaw(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}
