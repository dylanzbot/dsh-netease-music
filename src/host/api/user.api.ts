/**
 * 用户资料 / 关系（关注 / 粉丝 / 徽章）相关上游接口。
 *
 * 和 account.api.ts 一样，这里只管「调哪个上游接口、怎么把原始字段映射成
 * DTO」，不写业务规则（缓存、登录态判断在 services/account.service.ts /
 * services/relation.service.ts）。
 *
 * 上游接口：
 *   - /api/v1/user/detail/{uid}          用户等级、听歌数、资料（明文）
 *   - /api/medal/user/page               徽章数量（明文，best-effort）
 *   - /eapi/user/follow/users/mixed/get/v2  我关注的用户（eapi 加密，含关注天数）
 *   - /weapi/user/getfolloweds/             粉丝列表（weapi 加密）
 *   - /api/user/follow/{uid}                关注（网页端明文）
 *   - /api/user/delfollow/{uid}             取关（网页端明文）
 *   - /api/user/delfan                      移除粉丝（网页端无此接口，best-effort）
 *
 * 网易云已下线明文 /api/user/following/{uid} 系列接口（返回 404），
 * 关注列表改走 eapi mixed 接口（含 followDay 文案），粉丝列表走 weapi。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-user
 */

import type { NcmRelationAction, NcmRelationUserDTO } from '../../types/index.js'
import { eapiPostWithCookie } from '../utils/eapi.js'
import { request } from '../utils/request.js'
import { weapiPost } from '../utils/weapi.js'
import { getNcm, NCM_BASE_URL, imageUrl, NCM_IMAGE_SIZE, numberOr, type RawProfile } from './common.api.js'
import { NcmApiError } from '../error/index.js'

/** 徽章汇总（数量 + 第一枚徽章名 / 图）。 */
export interface NcmBadgeSummaryDTO {
  readonly count: number
  readonly iconUrl?: string
  readonly name?: string
}

/** 用户详情接口返回。 */
export interface NcmUserDetail {
  readonly level: number
  readonly listenSongs: number
  readonly profile: RawProfile | null
}

/** 上游关系用户原始字段（历史类型别名，保留导出以兼容 barrel）。 */
export type RawRelationUser = Record<string, unknown>

/** /api/mixed/mixed/get/v2 里单条时长记录（历史接口，保留类型）。 */
export interface RawMixedDayRecord {
  readonly followTime?: number
  readonly mutualFollowTime?: number
  readonly followDay?: string
  readonly mutualFollowDay?: string
}

/** 关系操作结果。 */
export interface NcmRelationActionResult {
  readonly code: number
  readonly message?: string
}

/** 用户详情（等级 / 听歌数 / 资料）。 */
export async function fetchUserDetail(
  userId: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmUserDetail> {
  const { body } = await getNcm(`/api/v1/user/detail/${userId}`, cookie, signal)
  const data = body as {
    code?: number
    level?: number
    listenSongs?: number
    profile?: RawProfile | null
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '用户详情接口返回失败')
  }
  return {
    level: numberOr(data.level),
    listenSongs: numberOr(data.listenSongs),
    profile: data.profile ?? null,
  }
}

/** 徽章数量 + 第一枚徽章（best-effort，拿不到返回 undefined）。 */
export async function fetchBadgeSummary(
  userId: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmBadgeSummaryDTO | undefined> {
  try {
    const { body } = await getNcm(`/api/medal/user/page?uid=${userId}`, cookie, signal)
    const data = body as {
      code?: number
      data?: {
        medalNum?: number
        obtainMedals?: ReadonlyArray<{ medalPicUrl?: string; medalName?: string }>
      }
    }
    if (data.code !== undefined && data.code !== 200) return undefined
    const count = data.data?.medalNum
    if (typeof count !== 'number' || count < 0) return undefined
    const first = data.data?.obtainMedals?.[0]
    return {
      count,
      ...(first?.medalPicUrl !== undefined && first.medalPicUrl !== ''
        ? { iconUrl: imageUrl(first.medalPicUrl, NCM_IMAGE_SIZE.xs) }
        : {}),
      ...(first?.medalName !== undefined && first.medalName !== '' ? { name: first.medalName } : {}),
    }
  } catch {
    return undefined
  }
}

/** 原始用户字段映射成 NcmRelationUserDTO（缺省值兜底，保证前端组件可用）。 */
function mapRelationUser(raw: Record<string, unknown>, fallback: Partial<NcmRelationUserDTO>): NcmRelationUserDTO {
  const obj = raw
  const vipRights = (obj.vipRights ?? {}) as {
    redVipLevel?: number
    associator?: { vipCode?: number } | null
  }
  const vipType = numberOr(obj.vipType as number | undefined)
  const vipLevel = numberOr(vipRights.redVipLevel)
  const userId = Number(obj.userId ?? fallback.userId)
  const nickname = String(obj.nickname ?? '').trim()
  const gender = Number(obj.gender ?? 0)
  const signature = String(obj.signature ?? '').trim()
  const followed = obj.followed ?? fallback.followed ?? false
  const mutual = obj.mutual ?? fallback.mutual ?? false
  const relationTime = Number(obj.time ?? obj.followTime ?? fallback.relationTime ?? 0)
  const mutualTime = Number(obj.mutualFollowTime ?? fallback.mutualTime ?? 0)
  return {
    userId: Number.isFinite(userId) ? userId : 0,
    nickname: nickname !== '' ? nickname : '网易云用户',
    avatarUrl: imageUrl(String(obj.avatarUrl ?? ''), NCM_IMAGE_SIZE.xs),
    gender: Number.isFinite(gender) ? gender : 0,
    signature,
    level: numberOr(obj.level as number | undefined),
    vipType,
    ...(vipLevel > 0 ? { vipLevel } : {}),
    ...(vipRights.associator?.vipCode !== undefined && vipRights.associator.vipCode > 0
      ? { vipLevelName: `黑胶 VIP${vipLevel > 0 ? vipLevel : ''}`.trim() }
      : {}),
    badgeCount: numberOr(obj.badgeCount as number | undefined),
    followed: followed === true,
    mutual: mutual === true,
    relationTime: Number.isFinite(relationTime) ? relationTime : 0,
    mutualTime: Number.isFinite(mutualTime) ? mutualTime : 0,
  }
}

/**
 * 我关注的用户列表（eapi mixed 接口）。
 * 上游 /api/user/follow/users/mixed/get/v2 会直接返回 followDay（如「9年153天」）、
 * followTime、mutualFollowDay，是「关注 XX 天」最准确的来源。
 */
export async function fetchFollows(
  userId: number,
  cookie: string,
  limit = 30,
  offset = 0,
  signal?: AbortSignal,
): Promise<{ users: NcmRelationUserDTO[]; more: boolean }> {
  const size = Math.min(limit, 100)
  const { body } = await eapiPostWithCookie(
    '/api/user/follow/users/mixed/get/v2',
    {
      authority: 'false',
      page: JSON.stringify({ size, cursor: String(offset) }),
      scene: 2,
      size,
      sortType: '0',
    },
    cookie,
    signal,
  )
  const data = body as {
    code?: number
    data?: {
      records?: ReadonlyArray<Record<string, unknown>>
      page?: { cursor?: string; more?: boolean }
    }
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '关注列表接口返回失败')
  }
  const records = data.data?.records ?? []
  const users = records.map((record) => {
    const profile = (record.userProfile ?? {}) as Record<string, unknown>
    const user = mapRelationUser(profile, { followed: true, mutual: profile.mutual === true })
    return {
      ...user,
      relationTime: numberOr(record.followTime as number | undefined, user.relationTime),
      mutualTime: numberOr(record.mutualFollowTime as number | undefined, user.mutualTime),
      ...(typeof record.followDay === 'string' && record.followDay !== '' ? { followDayText: record.followDay } : {}),
      ...(typeof record.mutualFollowDay === 'string' && record.mutualFollowDay !== ''
        ? { mutualFollowDayText: record.mutualFollowDay }
        : {}),
    }
  })
  return { users, more: data.data?.page?.more === true }
}

/** 粉丝（关注我的用户）列表（weapi）。 */
export async function fetchFans(
  userId: number,
  cookie: string,
  limit = 30,
  offset = 0,
  signal?: AbortSignal,
): Promise<{ users: NcmRelationUserDTO[]; more: boolean }> {
  const { body } = await weapiPost(
    '/user/getfolloweds/',
    { userId, offset, limit, csrf_token: '' },
    cookie,
    signal,
  )
  const data = body as {
    code?: number
    followeds?: ReadonlyArray<Record<string, unknown>>
    more?: boolean
  }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '粉丝列表接口返回失败')
  }
  const users = (data.followeds ?? []).map((raw) => mapRelationUser(raw, { followed: false }))
  return { users, more: data.more === true }
}

/**
 * 关注 / 互关时长（历史接口，已下线）。
 * 保留函数签名供 services 层调用；实际天数由 relation.service 按 time 本地计算。
 */
export async function fetchFollowDays(
  _cookie: string,
  _signal?: AbortSignal,
): Promise<Map<number, RawMixedDayRecord>> {
  return new Map()
}

/** 执行关注 / 取关 / 移除粉丝（网页端明文接口，与官方网页行为一致）。 */
export async function performRelationAction(
  action: NcmRelationAction,
  userId: number,
  cookie: string,
  csrfToken: string,
  signal?: AbortSignal,
): Promise<NcmRelationActionResult> {
  const path =
    action === 'follow'
      ? `/api/user/follow/${userId}`
      : action === 'unfollow'
        ? `/api/user/delfollow/${userId}`
        : '/api/user/delfan'
  const { body } = await request.postForm(
    `${NCM_BASE_URL}${path}`,
    { csrf_token: csrfToken, userId: String(userId), followId: String(userId) },
    {
      cookie,
      signal,
      headers: { referer: `${NCM_BASE_URL}/` },
    },
  )
  const data = body as { code?: number; message?: string; msg?: string }
  const message = data.message ?? data.msg
  const code = data.code !== undefined ? data.code : -1
  const finalMessage =
    action === 'remove-fan' && code === 404
      ? '网易云暂未开放移除粉丝接口，操作未执行'
      : message
  return {
    code,
    ...(finalMessage !== undefined && finalMessage !== '' ? { message: String(finalMessage) } : {}),
  }
}
