/**
 * 账号 / 鉴权业务逻辑。
 *
 * 只负责「是否登录」「我的页面数据」「Cookie 登录 / 退出」，并统一处理 Cookie
 * 失效：一旦上游明确返回 301/302，就清掉本地 Cookie，让浏览器回到登录页。
 *
 * 搜索 / 歌曲 / 评论 / 歌单等其它领域各自的 service，见同目录下的
 * search.service / song.service / comment.service / playlist.service。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/account
 */

// InvalidCookieError 仅用于已注释的 Cookie 登录，恢复时取消注释：
// import { InvalidCookieError, NotLoggedInError } from '../error/index.js'
import type {
  NcmAuthStatusDTO,
  NcmBadgeSummaryDTO,
  NcmMeDTO,
  NcmProfileDTO,
} from '../../types/index.js'
import { NotLoggedInError } from '../error/index.js'
import {
  NcmApiError,
  type RawProfile,
  fetchAccount,
  fetchBadgeSummary,
  fetchListenStats,
  fetchUserDetail,
  fetchUserPlaylists,
  fetchVipInfo,
} from '../api/index.js'
import { getCookie, setCookie } from '../config.js'
import { imageUrl, NCM_IMAGE_SIZE } from '../api/common.api.js'
// normalizeCookieString 仅用于已注释的 Cookie 登录，恢复时取消注释：
// import { normalizeCookieString } from '../utils/cookie.js'
import { meCacheStore, clearAllCaches } from './cache.js'

/** 「我的」数据缓存有效期（毫秒）。 */
const ME_CACHE_TTL_MS = 30_000

/** 判断上游错误是否代表登录失效。 */
function isAuthError(error: unknown): boolean {
  return error instanceof NcmApiError && (error.code === 301 || error.code === 302)
}

/** 清掉「我的」数据缓存（收藏 / 退出登录等变更后调用，保证数据一致）。 */
export function invalidateMe(): void {
  meCacheStore.current = null
}

/** 映射用户资料。 */
function mapProfile(
  raw: RawProfile | null,
  userId: number,
  level: number,
  listenSongs: number,
  vip?: { level: number; levelName?: string },
  badges?: NcmBadgeSummaryDTO,
): NcmProfileDTO {
  const profile: RawProfile = raw ?? {}
  const auth = (profile.allAuthTypes ?? []).find((item) => (item.desc ?? '') !== '')
  const authIconUrl = profile.avatarDetail?.identityIconUrl
  return {
    userId: profile.userId ?? userId,
    nickname: profile.nickname ?? '网易云用户',
    avatarUrl: imageUrl(profile.avatarUrl, NCM_IMAGE_SIZE.sm),
    backgroundUrl: imageUrl(profile.backgroundUrl, NCM_IMAGE_SIZE.hero),
    signature: profile.signature ?? '',
    gender: profile.gender ?? 0,
    level,
    listenSongs,
    follows: profile.follows ?? 0,
    followeds: profile.followeds ?? 0,
    playlistCount: profile.playlistCount ?? 0,
    createTime: profile.createTime ?? 0,
    vipType: profile.vipType ?? 0,
    ...(vip !== undefined ? { vipLevel: vip.level } : {}),
    ...(vip?.levelName !== undefined ? { vipLevelName: vip.levelName } : {}),
    ...(badges !== undefined ? { badges } : {}),
    ...(auth?.desc !== undefined && auth.desc !== '' ? { authText: auth.desc } : {}),
    ...(authIconUrl !== undefined && authIconUrl !== ''
      ? { authIconUrl: imageUrl(authIconUrl, NCM_IMAGE_SIZE.xs) }
      : {}),
  }
}

/*
 * Cookie 登录已停用，当前仅支持扫码。原实现保留在下方注释中，恢复时取消注释即可：
 *
 * export async function loginWithCookie(rawCookie: string): Promise<{ nickname: string }> {
 *   const cookie = normalizeCookieString(rawCookie)
 *   if (!cookie.includes('MUSIC_U=')) {
 *     throw new InvalidCookieError('Cookie 中缺少 MUSIC_U，请复制浏览器请求头里的完整 Cookie')
 *   }
 *
 *   let account: Awaited<ReturnType<typeof fetchAccount>>
 *   try {
 *     account = await fetchAccount(cookie)
 *   } catch (error) {
 *     if (isAuthError(error)) throw new InvalidCookieError('Cookie 无效或已过期，请重新获取')
 *     throw error
 *   }
 *   if (account === null) throw new InvalidCookieError('Cookie 无效或已过期，请重新获取')
 *
 *   setCookie(cookie)
 *   clearAllCaches() // 换号时一次性清掉「我的」/歌单/搜索缓存，避免跨账号残留
 *   return { nickname: account.profile?.nickname ?? '' }
 * }
 */

/** 读当前登录用户的完整资料 + 歌单 + 收藏。 */
export async function getMe(): Promise<NcmMeDTO> {
  const cookie = getCookie()
  if (cookie === '') throw new NotLoggedInError()

  const cached = meCacheStore.current
  if (cached !== null && cached.cookie === cookie && Date.now() - cached.at < ME_CACHE_TTL_MS) {
    return cached.data
  }

  try {
    const account = await fetchAccount(cookie)
    if (account === null) {
      setCookie('')
      invalidateMe()
      throw new NotLoggedInError()
    }

    const [detail, playlists, vip, badges, listenStats] = await Promise.all([
      fetchUserDetail(account.userId, cookie),
      fetchUserPlaylists(account.userId, cookie),
      fetchVipInfo(cookie),
      fetchBadgeSummary(account.userId, cookie),
      fetchListenStats(cookie).catch(() => undefined),
    ])

    const profileRaw = detail.profile ?? account.profile
    const profile = mapProfile(profileRaw, account.userId, detail.level, detail.listenSongs, vip, badges)

    const liked = playlists.find((item) => item.specialType === 5) ?? null
    const rest = playlists.filter((item) => item !== liked)
    const data: NcmMeDTO = {
      profile,
      liked,
      playlists: rest.filter((item) => item.creatorId === account.userId),
      collections: rest.filter((item) => item.creatorId !== account.userId),
      ...(listenStats !== undefined ? { listenStats } : {}),
    }

    meCacheStore.current = { cookie, at: Date.now(), data }
    return data
  } catch (error) {
    if (isAuthError(error)) {
      setCookie('')
      invalidateMe()
      throw new NotLoggedInError()
    }
    throw error
  }
}

/** 登录态探测。复用 getMe 的缓存，避免启动时连打两次上游。 */
export async function getAuthStatus(): Promise<NcmAuthStatusDTO> {
  if (getCookie() === '') return { loggedIn: false }
  try {
    await getMe()
    return { loggedIn: true }
  } catch (error) {
    if (error instanceof NotLoggedInError) return { loggedIn: false }
    throw error
  }
}

/** 退出登录：清 Cookie 和缓存。 */
export function logout(): void {
  setCookie('')
  clearAllCaches()
}
