/**
 * 浏览器侧诊断日志。
 *
 * 与 dsh 的 `ctx.logger` 的关系：**复用而不重复实现**。
 *   - `ctx.logger` 负责真正的输出（dsh 控制台 / 诊断通道），有分级和格式化；
 *     但它是一次性的 fire-and-forget，插件拿不到历史记录，也没有导出能力。
 *   - 这里只在它的外面加一层「内存环形缓冲 + 脱敏 + 导出」，用于用户报障时
 *     把最近发生的事导出成 JSON 文件；没有 ctx.logger 时静默只走缓冲。
 *
 * 不记录 Cookie / MUSIC_U / __csrf，也不记录请求 body 和 header。
 *
 * @module @dylanzbot/dsh-netease-music/client/utils/logger
 */

import { PLUGIN_ID } from '../../constants/plugin.js'

/** 日志级别。 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 一条可导出的日志记录。 */
export interface LogRecord {
  readonly ts: number
  readonly level: LogLevel
  readonly scope: string
  readonly message: string
}

/** ctx.logger 的最小接口（dsh 的 Logger 有这些同签名方法）。 */
export interface LoggerSink {
  error(format: unknown, ...args: unknown[]): void
  warn(format: unknown, ...args: unknown[]): void
  info(format: unknown, ...args: unknown[]): void
  debug(format: unknown, ...args: unknown[]): void
}

/** 环形缓冲上限。 */
const MAX_RECORDS = 300

let sink: LoggerSink | undefined
const records: LogRecord[] = []

/** 敏感值脱敏：只保留键名，值替换为 ***；超长文本截断。 */
function redact(text: string): string {
  return text
    .replace(/\b(MUSIC_U|__csrf|__secure-[a-z_-]+|access[_-]?token|refresh[_-]?token|token)=([^;\s&"',}]+)/gi, '$1=***')
    .replace(/(cookie\s*[:=]\s*)[^;\r\n]+/gi, '$1***')
    .slice(0, 800)
}

/** 把任意附加信息序列化为可导出的短字符串。 */
function stringifyExtra(extra: unknown): string | undefined {
  if (extra === undefined) return undefined
  try {
    return redact(JSON.stringify(extra))
  } catch {
    return redact(String(extra))
  }
}

/**
 * 用 dsh 传入的 ctx 初始化日志输出。在 `apply(ctx)` 里调用一次即可。
 * 老版本 dsh 可能没有 logger，此时只保留内存缓冲。
 */
export function initLogger(ctx?: { readonly logger?: (name?: string) => LoggerSink }): void {
  sink = ctx?.logger?.(PLUGIN_ID)
}

/** 写一条日志：内存缓冲 + 转发给 ctx.logger（若可用）。 */
function write(level: LogLevel, scope: string, message: string, extra?: unknown): void {
  const safeMessage = redact(message)
  const safeExtra = stringifyExtra(extra)
  records.push({ ts: Date.now(), level, scope, message: safeExtra === undefined ? safeMessage : `${safeMessage} ${safeExtra}` })
  if (records.length > MAX_RECORDS) records.shift()

  if (sink === undefined) return
  try {
    sink[level](`[${PLUGIN_ID}/${scope}] ${safeMessage}`, ...(safeExtra === undefined ? [] : [safeExtra]))
  } catch {
    // ctx.logger 不可用时不能影响业务。
  }
}

export const logDebug = (scope: string, message: string, extra?: unknown) => write('debug', scope, message, extra)
export const logInfo = (scope: string, message: string, extra?: unknown) => write('info', scope, message, extra)
export const logWarn = (scope: string, message: string, extra?: unknown) => write('warn', scope, message, extra)
export const logError = (scope: string, message: string, extra?: unknown) => write('error', scope, message, extra)

/** 导出用的完整快照。 */
export function buildLogExport(): string {
  return JSON.stringify(
    {
      plugin: PLUGIN_ID,
      exportedAt: new Date().toISOString(),
      userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      records: [...records],
    },
    null,
    2,
  )
}

/** 触发浏览器下载诊断日志。 */
export function downloadLogs(): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return
  const blob = new Blob([buildLogExport()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  link.download = `${PLUGIN_ID}-log-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/** 仅供测试：清空缓冲。 */
export function clearLogs(): void {
  records.length = 0
}
