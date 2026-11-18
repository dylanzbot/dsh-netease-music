/* 用户关系接口（浏览器侧）：关注 / 粉丝 / 关注操作。 */

import type { NcmRelationAction, NcmRelationListDTO } from '../../types/index.js'
import { request } from '../utils/request.js'

/** 用户关系接口路径。 */
export enum UserApiPath {
  /** 我关注的用户列表。 */
  Follows = '/api/ncm/user/follows',
  /** 粉丝列表。 */
  Fans = '/api/ncm/user/fans',
  /** 关注用户。 */
  Follow = '/api/ncm/user/follow',
  /** 取消关注。 */
  Unfollow = '/api/ncm/user/unfollow',
  /** 移除粉丝。 */
  RemoveFan = '/api/ncm/user/remove-fan',
}

/** 我关注的用户列表。 */
export function getFollows(limit = 30, offset = 0, signal?: AbortSignal): Promise<NcmRelationListDTO> {
  return request.get<NcmRelationListDTO>(`${UserApiPath.Follows}?limit=${limit}&offset=${offset}`, signal)
}

/** 粉丝列表。 */
export function getFans(limit = 30, offset = 0, signal?: AbortSignal): Promise<NcmRelationListDTO> {
  return request.get<NcmRelationListDTO>(`${UserApiPath.Fans}?limit=${limit}&offset=${offset}`, signal)
}

/** 关注 / 取关 / 移除粉丝。 */
export function relationAction(
  action: NcmRelationAction,
  userId: number,
): Promise<{ ok: boolean; message: string }> {
  const path =
    action === 'follow'
      ? UserApiPath.Follow
      : action === 'unfollow'
        ? UserApiPath.Unfollow
        : UserApiPath.RemoveFan
  return request.post<{ ok: boolean; message: string }>(path, { userId })
}
