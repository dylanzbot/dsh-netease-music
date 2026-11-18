/**
 * 把接口返回的 URL 安全地嵌入 CSS `url("...")`。
 *
 * 直接拼接带双引号的字符串时，URL 里若含 `"` / `'` / 换行会破坏 CSS 声明，
 * 导致背景图不显示。这里先剔除这些字符（React 通过 style 属性赋值，
 * 不涉及 HTML 拼接，因此是健壮性处理而非安全过滤）。
 */
export function cssUrl(url: string): string | undefined {
  const safe = url.replace(/["'\r\n]/g, '')
  return safe === '' ? undefined : `url("${safe}")`
}
