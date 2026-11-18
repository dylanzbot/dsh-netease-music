/**
 * 网易云协议相关的共享纯函数（宿主 / 浏览器通用，不依赖 Node 或 DOM）。
 * base URL 常量见 constants/ncm.ts。
 *
 * @module @dylanzbot/dsh-netease-music/utils/ncm
 */

/**
 * 从 Cookie 串里取 `__csrf` 值（网易云写操作接口的 csrf_token）。
 * 取不到时返回空串。
 */
export function csrfFromCookie(cookie: string): string {
  return cookie.match(/__csrf=([^;]+)/)?.[1] ?? ''
}
