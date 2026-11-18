/* 账号接口（浏览器侧）。 */

import type { NcmAuthStatusDTO, NcmMeDTO } from '../../types/index.js'
import { request } from '../utils/request.js'

/** 账号接口路径。 */
export enum AccountApiPath {
  /** 登录态探测。 */
  AuthStatus = '/api/ncm/auth/status',
  // 手动 Cookie 登录已禁用（暂只保留扫码）：
  // CookieLogin = '/api/ncm/auth/cookie',
  /** 退出登录。 */
  Logout = '/api/ncm/auth/logout',
  /** 当前登录用户的完整资料 + 歌单/收藏。 */
  Me = '/api/ncm/me',
}

/** 登录态探测。 */
export function getAuthStatus(signal?: AbortSignal): Promise<NcmAuthStatusDTO> {
  return request.get<NcmAuthStatusDTO>(AccountApiPath.AuthStatus, signal)
}

/** 当前用户完整资料 + 歌单。 */
export function getMe(signal?: AbortSignal): Promise<NcmMeDTO> {
  return request.get<NcmMeDTO>(AccountApiPath.Me, signal)
}

/*
 * Cookie 登录已停用，当前仅支持扫码。原实现保留在下方注释中，恢复时取消注释即可：
 *
 * export function loginWithCookie(cookie: string): Promise<{ nickname: string }> {
 *   return request.post<{ nickname: string }>(AccountApiPath.CookieLogin, { cookie })
 * }
 */

/** 退出登录。 */
export function logout(): Promise<{ loggedIn: boolean }> {
  return request.post<{ loggedIn: boolean }>(AccountApiPath.Logout)
}
