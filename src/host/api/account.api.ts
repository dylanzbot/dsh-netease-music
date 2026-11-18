/**
 * 账号相关上游接口（登录态 / 会员等级）。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-account
 */

import { getNcm, type RawProfile } from './common.api.js'
import { NcmApiError } from '../error/index.js'

/** 账号接口返回。 */
interface RawAccountBody {
  readonly code?: number
  readonly message?: string
  readonly account?: { readonly id?: number } | null
  readonly profile?: RawProfile | null
}

/** VIP 成长等级接口返回。 */
interface RawVipGrowthBody {
  readonly code?: number
  readonly data?: {
    readonly userLevel?: { readonly level?: number; readonly levelName?: string; readonly vipType?: number }
  }
}

/** 读账号信息（同时验证 Cookie 是否有效）。 */
export async function fetchAccount(
  cookie: string,
  signal?: AbortSignal,
): Promise<{ userId: number; profile: RawProfile | null } | null> {
  const { body } = await getNcm('/api/nuser/account/get', cookie, signal)
  const data = body as RawAccountBody
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, data.message ?? '账号接口返回失败')
  }
  const userId = data.account?.id ?? data.profile?.userId
  if (data.account == null && data.profile == null) return null
  if (userId === undefined) return null
  return { userId, profile: data.profile ?? null }
}

/**
 * 黑胶 VIP 等级（best-effort）。
 * 上游是 /api/vipnewcenter/app/level/growhpoint/basic，部分账号会 301 或结构变化。
 */
export async function fetchVipInfo(
  cookie: string,
  signal?: AbortSignal,
): Promise<{ level: number; levelName?: string } | undefined> {
  try {
    const { body } = await getNcm('/api/vipnewcenter/app/level/growhpoint/basic', cookie, signal)
    const data = body as RawVipGrowthBody
    if (data.code !== undefined && data.code !== 200) return undefined
    const userLevel = data.data?.userLevel
    const level = userLevel?.level
    if (typeof level !== 'number' || level <= 0) return undefined
    if (typeof userLevel?.vipType === 'number' && userLevel.vipType <= 0) return undefined
    return {
      level,
      ...(userLevel?.levelName !== undefined && userLevel.levelName !== '' ? { levelName: userLevel.levelName } : {}),
    }
  } catch {
    return undefined
  }
}
