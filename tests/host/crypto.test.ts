import { createDecipheriv, createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 固定随机源：让 weapi 的双层 AES 与 eapi 设备号可预测、可断言。
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return {
    ...actual,
    randomBytes: vi.fn((size: number) => Buffer.alloc(size, 1)),
  }
})

import { createEapiDevice, eapiCookieHeader, eapiEncrypt } from '../../src/host/utils/eapi.js'
import { weapiEncrypt } from '../../src/host/utils/weapi.js'

const EAPI_KEY = 'e82ckenh8dichen8'
const PRESET_KEY = '0CoJUm6Qyw8W8jud'
const IV = '0102030405060708'
const FIXED_SECRET_KEY = 'b'.repeat(16) // randomBytes(16) 全是 1 → BASE62[1] = 'b'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('eapiEncrypt', () => {
  it('输出确定性的大写十六进制串', () => {
    const a = eapiEncrypt('/api/test', { a: 1 })
    const b = eapiEncrypt('/api/test', { a: 1 })
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9A-F]+$/)
  })

  it('解密后的 payload 含 path / json / md5 digest，且 digest 正确', () => {
    const path = '/eapi/login/qrcode/unikey'
    const data = { type: 1 }
    const encrypted = eapiEncrypt(path, data)

    const decipher = createDecipheriv('aes-128-ecb', Buffer.from(EAPI_KEY, 'utf8'), null)
    const payload = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'hex')),
      decipher.final(),
    ]).toString('utf8')

    const json = JSON.stringify(data)
    const digest = createHash('md5').update(`nobody${path}use${json}md5forencrypt`).digest('hex')
    expect(payload).toBe(`${path}-36cd479b6b5-${json}-36cd479b6b5-${digest}`)
  })
})

describe('createEapiDevice / eapiCookieHeader', () => {
  it('设备号是 52 位大写十六进制', () => {
    expect(createEapiDevice().deviceId).toMatch(/^[0-9A-F]{52}$/)
  })

  it('环境参数头包含 os=pc、deviceId、requestId 等字段且做了编码', () => {
    const device = createEapiDevice()
    const header = eapiCookieHeader(device)
    expect(header).toContain('os=pc')
    expect(header).toContain(`deviceId=${device.deviceId}`)
    expect(header).toContain('appver=3.1.17.204416')
    expect(header).toMatch(/requestId=\d+_\d{4}/)
    // 值本身都经过 encodeURIComponent，不含空格；只有 "; " 分隔符里有空格。
    expect(header.split('; ').every((part) => !part.includes(' '))).toBe(true)
  })
})

describe('weapiEncrypt', () => {
  it('encSecKey 是 512 位十六进制串，params 非空', () => {
    const result = weapiEncrypt({ a: 1 })
    expect(result.params.length).toBeGreaterThan(0)
    expect(result.encSecKey).toMatch(/^[0-9a-f]{256}$/)
  })

  it('params 用固定 secretKey 解密两层后得到原始 JSON', () => {
    const data = { username: 'test', password: '123456' }
    const { params } = weapiEncrypt(data)

    const outer = createDecipheriv('aes-128-cbc', Buffer.from(FIXED_SECRET_KEY, 'utf8'), Buffer.from(IV, 'utf8'))
    const innerBase64 = Buffer.concat([
      outer.update(Buffer.from(params, 'base64')),
      outer.final(),
    ]).toString('utf8')

    const inner = createDecipheriv('aes-128-cbc', Buffer.from(PRESET_KEY, 'utf8'), Buffer.from(IV, 'utf8'))
    const plaintext = Buffer.concat([
      inner.update(Buffer.from(innerBase64, 'base64')),
      inner.final(),
    ]).toString('utf8')

    expect(JSON.parse(plaintext)).toEqual(data)
  })

  it('固定随机源下两次加密结果一致', () => {
    expect(weapiEncrypt({ a: 1 })).toEqual(weapiEncrypt({ a: 1 }))
  })
})
