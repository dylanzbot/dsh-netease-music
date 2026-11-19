/**
 * 用户关系业务逻辑（关注 / 粉丝 / 关注操作）。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/relation
 */

import type { NcmRelationAction, NcmRelationListDTO, NcmRelationUserDTO } from '../../types/index.js'
import {
  fetchBadgeSummary,
  fetchFans,
  fetchFollows,
  fetchUserDetail,
  performRelationAction,
} from '../api/index.js'
import { getCookie } from '../credentials.js'
import { getMe } from './account.service.js'
import { csrfFromCookie } from '../../utils/ncm.js'
import { daysSince } from '../../utils/time.js'

/** 读取当前登录用户 ID。 */
async function currentUserId(): Promise<number> {
  const me = await getMe()
  return me.profile.userId > 0 ? me.profile.userId : 0
}

/** 批量补全用户等级 / 徽章数（best-effort，小并发避免打爆上游）。 */
async function enrichUsers(
  users: readonly NcmRelationUserDTO[],
  cookie: string,
): Promise<NcmRelationUserDTO[]> {
  const result: NcmRelationUserDTO[] = []
  const batchSize = 5
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    const enriched = await Promise.all(
      batch.map(async (user) => {
        const [detail, badges] = await Promise.all([
          fetchUserDetail(user.userId, cookie).catch(() => null),
          fetchBadgeSummary(user.userId, cookie).catch(() => undefined),
        ])
        return {
          ...user,
          level: detail !== null && detail.level > 0 ? detail.level : user.level,
          badgeCount: badges !== undefined ? badges.count : user.badgeCount,
        }
      }),
    )
    result.push(...enriched)
  }
  return result
}

/** 我关注的用户列表（带关注天数）。 */
export async function getFollows(limit = 30, offset = 0): Promise<NcmRelationListDTO> {
  const cookie = getCookie()
  const uid = await currentUserId()
  if (uid <= 0) return { users: [], more: false }
  const { users, more } = await fetchFollows(cookie, limit, offset)
  return { users: await enrichUsers(users, cookie), more }
}

/** 粉丝列表（带互关天数）。 */
export async function getFans(limit = 30, offset = 0): Promise<NcmRelationListDTO> {
  const cookie = getCookie()
  const uid = await currentUserId()
  if (uid <= 0) return { users: [], more: false }
  const { users, more } = await fetchFans(uid, cookie, limit, offset)
  return { users: await enrichUsers(users, cookie), more }
}

/** 执行关注 / 取关 / 移除粉丝。 */
export async function doRelationAction(
  action: NcmRelationAction,
  targetId: number,
): Promise<{ ok: boolean; message: string }> {
  const cookie = getCookie()
  if (!Number.isFinite(targetId) || targetId <= 0) return { ok: false, message: '参数错误' }
  const result = await performRelationAction(action, targetId, cookie, csrfFromCookie(cookie))
  const ok = result.code === 200
  let message = result.message
  if (!message) {
    if (ok) message = action === 'follow' ? '已关注' : action === 'unfollow' ? '已取关' : '已移除粉丝'
    else if (action === 'follow') message = '关注失败，可能已关注或操作过于频繁'
    else if (action === 'unfollow') message = '取关失败，请稍后重试'
    else message = '移除失败：上游暂不支持该操作或操作过于频繁'
  }
  return { ok, message }
}

/** 关注天数文案（本地兜底计算）。 */
export function relationDaysText(user: NcmRelationUserDTO, mutual = false): string {
  const text = mutual ? user.mutualFollowDayText : user.followDayText
  if (text !== undefined && text !== '') return text
  const days = daysSince(mutual ? user.mutualTime || user.relationTime : user.relationTime)
  return days > 0 ? `${days}天` : ''
}
