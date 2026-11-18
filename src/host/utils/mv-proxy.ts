/**
 * MV 下载代理的安全约束（宿主侧）。
 *
 * 代理接口把网易云 CDN 的视频流转发给浏览器，必须自己把住三件事：
 *   1. 目标域名只能是网易云视频 CDN（防 SSRF / 开放代理）；
 *   2. 不能跟着上游跳转走（防重定向 SSRF）；
 *   3. 体积要有上限，且 content-length 缺失/造假时也要兜底。
 *
 * @module @dylanzbot/dsh-netease-music/host/utils/mv-proxy
 */

/** 代理下载的总超时（毫秒）。比普通 API 长，兼顾几百 MB 的大文件。 */
export const MV_DOWNLOAD_TIMEOUT_MS = 120_000

/** 代理下载的体积上限（200 MB）。 */
export const MV_DOWNLOAD_MAX_BYTES = 200 * 1024 * 1024

/** 允许的 CDN 域名（apex 及其子域）。 */
const ALLOWED_HOSTS = ['music.126.net', 'vod.126.net'] as const

/**
 * 校验下载地址是否指向网易云视频 CDN。
 *
 * 用 `new URL()` 解析后按 hostname 判断，而不是用正则匹配原始字符串：
 * 正则既会误拒 apex / 带端口的合法地址，也可能被 userinfo（`a@b`）绕过。
 */
export function isAllowedMvUrl(target: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  if (parsed.username !== '' || parsed.password !== '') return false
  const host = parsed.hostname.toLowerCase()
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}

/**
 * 给响应流加累计字节上限。
 *
 * `content-length` 可能在传输中被分块（chunked）而不存在，也可能不可信，
 * 所以对流实际送出的字节数再做一次硬限制，超限直接报错中断。
 */
export function cappedBody(body: ReadableStream<Uint8Array>, maxBytes: number): ReadableStream<Uint8Array> {
  const reader = body.getReader()
  let total = 0
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        reader.releaseLock()
        return
      }
      total += value.byteLength
      if (total > maxBytes) {
        controller.error(new Error('文件过大'))
        await reader.cancel().catch(() => {})
        reader.releaseLock()
        return
      }
      controller.enqueue(value)
    },
    cancel(reason) {
      void reader.cancel(reason)
      reader.releaseLock()
    },
  })
}
