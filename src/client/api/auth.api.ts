/* 登录相关接口（相当于前端项目里的 login.api.ts / auth.api.ts）。 */

import type { QrCheckValueDTO, QrStartValueDTO } from '../../types/auth.js'
import { request } from '../utils/request.js'

/** 登录接口路径。 */
export enum AuthApiPath {
  /** 扫码登录：发起接口。 */
  QrStart = '/api/ncm/auth/qr/start',
  /** 扫码登录：轮询接口。 */
  QrCheck = '/api/ncm/auth/qr/check',
}

/** 发起扫码登录：拿 unikey + 二维码图片。 */
export function startQrLogin(signal?: AbortSignal): Promise<QrStartValueDTO> {
  return request.post<QrStartValueDTO>(AuthApiPath.QrStart, undefined, signal)
}

/** 轮询扫码结果。 */
export function checkQrLogin(key: string, signal?: AbortSignal): Promise<QrCheckValueDTO> {
  return request.get<QrCheckValueDTO>(`${AuthApiPath.QrCheck}?key=${encodeURIComponent(key)}`, signal)
}
