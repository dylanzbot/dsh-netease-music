/**
 * 网易云 eapi 请求加密（宿主侧，Node）。
 *
 * 扫码登录使用 `/eapi/login/qrcode/*` 协议：
 *   - 请求体用 eapi（AES-128-ECB）加密；
 *   - 请求头携带客户端环境参数（os / appver / deviceId / requestId 等）。
 *
 * 密钥与环境参数均为协议公开常量，不是用户凭证。
 *
 * 算法参考 NeteaseCloudMusicApiEnhanced/api-enhanced 的 `eapi()`：
 *   digest = md5("nobody" + path + "use" + json + "md5forencrypt")
 *   payload = path + "-36cd479b6b5-" + json + "-36cd479b6b5-" + digest
 *   params  = AES-128-ECB(payload, eapiKey, no iv)
 *
 * @module @dylanzbot/dsh-netease-music/host/utils/eapi
 */

import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { HEADER_USER_AGENT } from '../../constants/http.js'
import { request, type RequestResult } from './request.js'
import { NCM_BASE_URL } from '../../constants/ncm.js'

/** 网易云公开的 eapi AES 密钥（客户端协议常量，不是用户凭证）。 */
const EAPI_KEY = 'e82ckenh8dichen8'

/** eapi 请求要求的客户端 UA（扫码登录用移动端）。 */
const EAPI_UA = 'NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)'

/**
 * PC 端 eapi UA。
 *
 * `eapiCookieHeader` 用 `os=pc` / Windows 环境参数，与这里保持一致；
 * 两边不一致会导致高清臻音 / 环绕声等音源请求返回 -460 失败。
 */
const EAPI_UA_PC =
  'NeteaseMusic/3.1.17.204416 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36'

/** 复用同一个设备号，保持会话环境参数一致。 */
const SHARED_DEVICE = createEapiDevice()


/** 一次扫码登录使用的设备标识。 */
export interface EapiDevice {
  readonly deviceId: string
}

/** 生成 52 位十六进制设备号（对齐网易云客户端 deviceId 格式）。 */
export function createEapiDevice(): EapiDevice {
  return { deviceId: randomBytes(26).toString('hex').toUpperCase() }
}

/** eapi 参数加密，返回 params 字段的十六进制字符串。 */
export function eapiEncrypt(path: string, data: unknown): string {
  const text = JSON.stringify(data)
  const digest = createHash('md5').update(`nobody${path}use${text}md5forencrypt`).digest('hex')
  const payload = `${path}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  const cipher = createCipheriv('aes-128-ecb', Buffer.from(EAPI_KEY, 'utf8'), null)
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  return encrypted.toString('hex').toUpperCase()
}

/** 客户端环境参数 Cookie 头（每次请求都带同一 deviceId）。 */
export function eapiCookieHeader(device: EapiDevice): string {
  const header: Record<string, string> = {
    osver: 'Microsoft-Windows-10-Professional-build-19045-64bit',
    deviceId: device.deviceId,
    os: 'pc',
    appver: '3.1.17.204416',
    versioncode: '140',
    mobilename: '',
    buildver: String(Date.now()).slice(0, 10),
    resolution: '1920x1080',
    __csrf: '',
    channel: 'netease',
    requestId: `${Date.now()}_${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
  }
  return Object.entries(header)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('; ')
}

/** POST 一个带用户登录 Cookie 的 eapi 接口（关系 / 听歌数据等需要登录态的上游）。 */
export async function eapiPostWithCookie(
  path: string,
  data: Record<string, unknown>,
  cookie: string,
  signal?: AbortSignal,
): Promise<RequestResult> {
  return request.postForm(
    `${NCM_BASE_URL}/eapi${path}`,
    { params: eapiEncrypt(path, data) },
    {
      cookie: [cookie, eapiCookieHeader(SHARED_DEVICE)].filter(Boolean).join('; '),
      signal,
      headers: {
        [HEADER_USER_AGENT]: EAPI_UA_PC,
        referer: `${NCM_BASE_URL}/`,
      },
    },
  )
}

/** POST 一个 eapi 接口，返回 JSON body 和 Set-Cookie。 */
export async function eapiPost(
  path: string,
  data: Record<string, unknown>,
  device: EapiDevice,
  signal?: AbortSignal,
): Promise<RequestResult> {
  return request.postForm(
    `${NCM_BASE_URL}/eapi${path}`,
    { params: eapiEncrypt(path, data) },
    {
      cookie: eapiCookieHeader(device),
      signal,
      headers: {
        [HEADER_USER_AGENT]: EAPI_UA,
      },
    },
  )
}
