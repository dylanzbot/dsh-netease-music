/**
 * 网易云扫码登录接口（上游接口定义）。
 *
 * 使用 eapi 协议：
 *   POST /eapi/login/qrcode/unikey        { type: 3 }
 *   POST /eapi/login/qrcode/client/login  { key, type: 3 }
 *
 * 请求体加密与客户端环境参数见 utils/eapi.ts。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-auth
 */

import { cookiePairs, joinCookie, mergeCookieStrings, normalizeCookieString } from '../utils/cookie.js'
import { imageUrl, NCM_IMAGE_SIZE } from './common.api.js'
import { createEapiDevice, eapiPost, type EapiDevice } from '../utils/eapi.js'
import { NCM_BASE_URL } from '../../constants/ncm.js'

/** 网易云网页端 base URL（统一从 constants/ncm.ts 取）。 */
export { NCM_BASE_URL }

/** 网易云扫码登录接口路径（eapi 路径，不含 /eapi 前缀）。 */
export enum NcmAuthApiPath {
  /** 拿 unikey。 */
  QrKey = '/api/login/qrcode/unikey',
  /** 轮询扫码结果。 */
  QrCheck = '/api/login/qrcode/client/login',
}

/** 网易云扫码接口状态码。 */
export enum NcmQrCode {
  /** 二维码不存在或已过期。 */
  Expired = 800,
  /** 等待扫码。 */
  Waiting = 801,
  /** 已扫码，等待确认。 */
  Scanned = 802,
  /** 授权成功。 */
  Confirmed = 803,
}

/** 扫码登录接口的 type 参数（3 = 新版客户端协议）。 */
const QR_FORM_TYPE = '3'

/** 创建二维码 key 的结果。 */
export interface NcmQrKey {
  readonly unikey: string
  /** 本次扫码会话使用的设备标识（轮询时要复用同一个）。 */
  readonly deviceId: string
}

/** 轮询扫码结果。 */
export interface NcmQrCheck {
  /** 网易云返回的 code，见 NcmQrCode。 */
  readonly code: number
  readonly message?: string
  readonly nickname?: string
  readonly avatarUrl?: string
  /** 登录成功时响应带回的 Cookie（MUSIC_U 等）。 */
  readonly cookie: string
}

/** 第一步：拿 unikey（eapi + 新设备标识）。 */
export async function createQrKey(signal?: AbortSignal): Promise<NcmQrKey> {
  const device = createEapiDevice()
  const { body } = await eapiPost(NcmAuthApiPath.QrKey, { type: QR_FORM_TYPE }, device, signal)

  const data = body as { unikey?: string; code?: number; message?: string }
  if (typeof data?.unikey !== 'string' || data.unikey === '') {
    throw new Error(data?.message ?? '网易云未返回 unikey')
  }
  return { unikey: data.unikey, deviceId: device.deviceId }
}

/** 第二步：轮询扫码结果（复用同一个设备标识）。 */
export async function checkQrKey(key: string, deviceId: string, signal?: AbortSignal): Promise<NcmQrCheck> {
  const device: EapiDevice = { deviceId }
  const { body, setCookies } = await eapiPost(
    NcmAuthApiPath.QrCheck,
    { key, type: QR_FORM_TYPE },
    device,
    signal,
  )

  const data = body as { code?: number; message?: string; nickname?: string; avatarUrl?: string; cookie?: string }
  const headerCookie = joinCookie(cookiePairs(setCookies))
  const bodyCookie = typeof data?.cookie === 'string' ? normalizeCookieString(data.cookie) : ''
  return {
    code: data?.code ?? -1,
    message: data?.message,
    nickname: data?.nickname,
    avatarUrl: imageUrl(data?.avatarUrl, NCM_IMAGE_SIZE.xs),
    cookie: mergeCookieStrings(headerCookie, bodyCookie),
  }
}
