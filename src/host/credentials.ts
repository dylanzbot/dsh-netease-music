/**
 * 网易云登录 Cookie 的存储层：走 dsh 官方凭据 seam（`ctx.credentials`）。
 *
 * @module @dylanzbot/dsh-netease-music/host/credentials
 */

import type { Context, CredentialKey, CredentialRecord, Logger } from '../types/cordis-host.js'
import { PLUGIN_ID } from '../constants/plugin.js'
import { readConfig, stripLegacyCookie, writeConfig } from './config.js'

/** 凭据记录键：scope 用插件短 id，id 是本插件自定的 Cookie 槽位。 */
export const COOKIE_KEY = `${PLUGIN_ID}/ncm-cookie` as CredentialKey

/** 当前生效的 credentials 服务；undefined 表示走旧文件降级。 */
let credentials: Context['credentials']

/** Cookie 内存缓存：getCookie() 同步返回它。 */
let cachedCookie = ''

/** 从凭据记录里取出 Cookie 字符串；记录格式不对时当作未登录。 */
function cookieFromRecord(record: CredentialRecord | undefined): string {
  if (record === undefined) return ''
  if (record.kind !== 'grant') return ''
  const payload = record.payload
  if (typeof payload !== 'object' || payload === null) return ''
  const cookie = (payload as { cookie?: unknown }).cookie
  return typeof cookie === 'string' ? cookie : ''
}

/**
 * 初始化 Cookie 存储，在 `apply` 里 await 一次。
 * 先读凭据记录；老用户旧文件里还有 Cookie 时迁移过来并清掉明文。
 */
export async function initCookieStore(ctx: Context, logger: Logger): Promise<void> {
  const service = ctx.get('credentials')
  credentials = service
  const legacyCookie = readConfig().cookie

  if (service === undefined) {
    cachedCookie = legacyCookie
    if (legacyCookie !== '') {
      logger.warn(`${PLUGIN_ID}: credentials 服务不可用，Cookie 暂时回退到本地文件`)
    }
    return
  }

  try {
    cachedCookie = cookieFromRecord(await service.readRecord(COOKIE_KEY))
  } catch (error) {
    cachedCookie = ''
    logger.warn(`${PLUGIN_ID}: 读取 Cookie 凭据失败：${String(error)}`)
  }

  if (cachedCookie === '' && legacyCookie !== '') {
    try {
      await saveCookie(legacyCookie)
    } catch (error) {
      // 写凭据失败时保留旧文件和内存值，不把用户踢下线。
      cachedCookie = legacyCookie
      logger.warn(`${PLUGIN_ID}: 迁移旧 Cookie 失败，保留原文件：${String(error)}`)
      return
    }
  }
  if (legacyCookie !== '') stripLegacyCookie()
}

/** 读当前 Cookie；未初始化或未登录时返回空串。 */
export function getCookie(): string {
  return cachedCookie
}

/**
 * 保存 / 清空 Cookie。先更新内存缓存，再异步落盘；写失败时回滚缓存并抛错。
 * 空串表示退出登录，对应删除凭据记录（记录本身不存空值）。
 */
export async function saveCookie(cookie: string): Promise<void> {
  const previous = cachedCookie
  cachedCookie = cookie

  if (credentials === undefined) {
    try {
      writeConfig({ ...readConfig(), cookie })
    } catch (error) {
      cachedCookie = previous
      throw error
    }
    return
  }

  try {
    if (cookie === '') {
      await credentials.deleteRecord(COOKIE_KEY)
    } else {
      await credentials.modifyRecord(COOKIE_KEY, async () => ({
        kind: 'grant',
        payload: { cookie },
      }))
    }
  } catch (error) {
    cachedCookie = previous
    throw error
  }
}
