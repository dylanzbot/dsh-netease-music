/**
 * 网易云 weapi 请求加密（宿主侧，Node）。
 *
 * 关系列表（关注 / 粉丝）和关注操作在当前网页端走 weapi：
 *   - 请求体先 AES-128-CBC（presetKey / iv）加密，再按随机 16 位 secretKey
 *     做第二次 AES 加密得到 params；
 *   - secretKey 反过来用 RSA(no padding) 加密得到 encSecKey。
 *
 * 算法是网易云网页端公开的客户端协议，密钥是协议常量，不是用户凭证。
 *
 * @module @dylanzbot/dsh-netease-music/host/utils/weapi
 */

import { createCipheriv, randomBytes } from 'node:crypto'
import { request, type RequestResult } from './request.js'
import { NCM_BASE_URL } from '../../constants/ncm.js'

/** 协议常量：AES 预设密钥。 */
const PRESET_KEY = '0CoJUm6Qyw8W8jud'
/** 协议常量：AES IV。 */
const IV = '0102030405060708'
/** 协议常量：RSA 公钥指数。 */
const PUBKEY = '010001'
/** 协议常量：RSA 模数。 */
const MODULUS =
  '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
/** 协议常量：随机密钥字符集。 */
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** AES-128-CBC + Base64。 */
function aesEncrypt(text: string, key: Buffer | string): string {
  const cipher = createCipheriv('aes-128-cbc', typeof key === 'string' ? Buffer.from(key, 'utf8') : key, Buffer.from(IV, 'utf8'))
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64')
}

/** 大数模幂（RSA 无填充加密用）。 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let b = base % mod
  let e = exp
  while (e > 0n) {
    if ((e & 1n) === 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

/** RSA 无填充加密：文本先按字节反转再转大端整数。 */
function rsaEncrypt(text: string): string {
  const reversed = Buffer.from(text, 'utf8').reverse().toString('hex')
  const message = BigInt(`0x${reversed}`)
  return modPow(message, BigInt(`0x${PUBKEY}`), BigInt(`0x${MODULUS}`))
    .toString(16)
    .padStart(256, '0')
}

/** 生成 weapi 的 params + encSecKey。 */
export function weapiEncrypt(data: Record<string, unknown>): { params: string; encSecKey: string } {
  const text = JSON.stringify(data)
  const secretKey = Array.from(randomBytes(16))
    .map((byte) => BASE62[byte % BASE62.length])
    .join('')
  return {
    params: aesEncrypt(aesEncrypt(text, PRESET_KEY), secretKey),
    encSecKey: rsaEncrypt(secretKey),
  }
}

/** POST 一个 weapi 接口（带 Cookie + Referer）。 */
export async function weapiPost(
  path: string,
  data: Record<string, unknown>,
  cookie: string,
  signal?: AbortSignal,
): Promise<RequestResult> {
  return request.postForm(`${NCM_BASE_URL}/weapi${path}`, weapiEncrypt(data), {
    cookie,
    signal,
    headers: { referer: `${NCM_BASE_URL}/` },
  })
}
