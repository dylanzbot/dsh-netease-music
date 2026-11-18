/**
 * 扫码登录业务逻辑。
 *
 * 职责：
 *   - 管理内存中的扫码会话（unikey → 临时 Cookie）；
 *   - 把网易云的状态码（800/801/802/803）映射成客户端可读状态；
 *   - 登录成功后把 Cookie 写进 host/config.ts。
 *
 * 不碰 HTTP 路由（那是 routes/auth.ts 的事），也不直接发上游请求
 * （那是 api/auth.api.ts 的事）。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/auth
 */

import { toDataURL } from 'qrcode'
import { QR_STATE, type QrState } from '../../constants/qr.js'
import { checkQrKey, createQrKey, NCM_BASE_URL, NcmQrCode } from '../api/auth.api.js'
import { setCookie } from '../config.js'
import { QrSessionExpiredError } from '../error/index.js'
import { clearAllCaches } from './cache.js'

/** 客户端可读的扫码状态（与浏览器侧共用 QrState）。 */
export type QrAuthState = QrState

/** 发起扫码登录的返回。 */
export interface QrStartResult {
  readonly key: string
  readonly qrUrl: string
  /** 二维码图片 data URL。 */
  readonly qrImage: string
}

/** 轮询扫码的返回。 */
export interface QrCheckResult {
  readonly state: QrAuthState
  readonly nickname?: string
  readonly avatarUrl?: string
  readonly message?: string
}

/** 一次扫码会话：设备标识 + 创建时间。 */
interface QrSession {
  readonly deviceId: string
  readonly createdAt: number
}

/** 内存中的扫码会话表；key 是 unikey。 */
const sessions = new Map<string, QrSession>()

/** 扫码会话有效期：5 分钟。 */
const SESSION_TTL_MS = 5 * 60 * 1000

/** 取扫码会话，顺带清掉过期会话。 */
function takeSession(key: string): QrSession | undefined {
  const session = sessions.get(key)
  if (session === undefined) return undefined
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(key)
    return undefined
  }
  return session
}

/** 发起扫码登录：拿 unikey → 生成二维码。 */
export async function startQrLogin(): Promise<QrStartResult> {
  const { unikey, deviceId } = await createQrKey()
  sessions.set(unikey, { deviceId, createdAt: Date.now() })

  const qrUrl = `${NCM_BASE_URL}/login?codekey=${unikey}`
  const qrImage = await toDataURL(qrUrl, { width: 168, margin: 0 })

  return { key: unikey, qrUrl, qrImage }
}

/** 轮询扫码结果。会话不存在时抛 QrSessionExpiredError。 */
export async function checkQrLogin(key: string): Promise<QrCheckResult> {
  const session = takeSession(key)
  if (session === undefined) throw new QrSessionExpiredError()

  const result = await checkQrKey(key, session.deviceId)

  // 只要响应里出现 MUSIC_U，无论 code 是否已经到 803，都按登录成功处理。
  // （个别情况下上游会在 802 响应里提前带回 MUSIC_U，可避免多轮询一次。）
  const hasMusicU = /(?:^|;\s*)MUSIC_U=/.test(result.cookie)
  if (result.code === NcmQrCode.Confirmed || hasMusicU) {
    sessions.delete(key)
    if (result.cookie === '') {
      return { state: QR_STATE.ERROR, message: '登录成功但未拿到登录凭证，请刷新二维码重试' }
    }
    setCookie(result.cookie)
    clearAllCaches() // 扫码换号后不清缓存会让「我的」页短暂显示上一账号数据
    return { state: QR_STATE.CONFIRMED }
  }
  if (result.code === NcmQrCode.Waiting) return { state: QR_STATE.WAITING }
  if (result.code === NcmQrCode.Scanned) {
    return { state: QR_STATE.SCANNED, nickname: result.nickname, avatarUrl: result.avatarUrl }
  }
  if (result.code === NcmQrCode.Expired) {
    sessions.delete(key)
    return { state: QR_STATE.EXPIRED }
  }

  // 8821 是上游返回的状态码，提示用户稍后重试。
  if (result.code === 8821) {
    return { state: QR_STATE.ERROR, message: '登录暂不可用（8821），请稍后重试' }
  }

  return { state: QR_STATE.ERROR, message: result.message ?? `未知状态码 ${result.code}` }
}
