/**
 * Cookie 相关工具（宿主侧）。
 *
 * 只做纯字符串处理：解析 Set-Cookie、拼 Cookie 请求头。
 *
 * @module @dylanzbot/dsh-netease-music/host/utils/cookie
 */

/** Headers 的 getSetCookie 在部分类型定义里缺失，这里做个窄接口读取。 */
interface CookieHeaders {
  getSetCookie?: () => string[]
  get(name: string): string | null
}

/** 读取响应里的所有 Set-Cookie（优先 getSetCookie，回退到 get('set-cookie')）。 */
export function readSetCookies(headers: Headers): string[] {
  const maybe = (headers as unknown as CookieHeaders).getSetCookie
  if (typeof maybe === 'function') return maybe.call(headers)
  const single = headers.get('set-cookie')
  return single !== null && single !== '' ? [single] : []
}

/** 把 Set-Cookie 里的 `name=value` 提取出来，丢掉 Path/Domain/HttpOnly 等属性。 */
export function cookiePairs(setCookies: readonly string[]): string[] {
  const pairs: string[] = []
  for (const raw of setCookies) {
    const first = raw.split(';')[0]?.trim()
    if (first !== undefined && first !== '' && first.includes('=')) pairs.push(first)
  }
  return pairs
}

/** 把 `name=value` 数组拼成 Cookie 请求头字符串。 */
export function joinCookie(pairs: readonly string[]): string {
  return pairs.join('; ')
}

/** Cookie 属性名（不是真正的键值对，清洗时丢掉）。 */
const COOKIE_ATTRIBUTES = new Set(['path', 'domain', 'max-age', 'expires', 'httponly', 'secure', 'samesite'])

/**
 * 把可能带 Path/Expires 等属性的 Cookie 字符串清洗成纯 `name=value; ...`。
 *
 * 网易云登录成功时，有时完整 Cookie 在 `data.cookie` 里，有时在 Set-Cookie
 * 头里；前者经常附带 `Max-Age` / `Path` / `Domain` 等属性，不能直接原样保存，
 * 否则下次拼 Cookie 请求头时会把属性当成 Cookie 发给服务端。
 */
export function normalizeCookieString(raw: string): string {
  const pairs: string[] = []
  for (const segment of raw.split(';')) {
    const item = segment.trim()
    if (item === '') continue
    const equals = item.indexOf('=')
    if (equals <= 0) continue
    const name = item.slice(0, equals).trim().toLowerCase()
    if (name === '' || COOKIE_ATTRIBUTES.has(name)) continue
    pairs.push(item)
  }
  return pairs.join('; ')
}

/** 合并多段 Cookie（同名键以后出现的为准），返回可保存的 Cookie 字符串。 */
export function mergeCookieStrings(...chunks: ReadonlyArray<string | undefined>): string {
  const merged = new Map<string, string>()
  for (const chunk of chunks) {
    if (chunk === undefined || chunk === '') continue
    for (const item of normalizeCookieString(chunk).split('; ')) {
      if (item === '') continue
      const equals = item.indexOf('=')
      if (equals <= 0) continue
      merged.set(item.slice(0, equals).trim(), item.slice(equals + 1))
    }
  }
  return [...merged.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}
