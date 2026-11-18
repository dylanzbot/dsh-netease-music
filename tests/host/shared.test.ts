import { describe, expect, it, vi } from 'vitest'
import { PLUGIN_ID } from '../../src/constants/plugin.js'
import { InvalidCookieError, NotLoggedInError } from '../../src/host/error/index.js'
import type { Logger } from '../../src/types/cordis.js'
import {
  badRequest,
  bodyNumber,
  bodyString,
  getRoute,
  intParam,
  postRoute,
  requireKeyword,
  requirePositiveId,
  route,
  run,
  toFailure,
} from '../../src/host/routes/shared.js'
import { ok } from '../../src/host/utils/response.js'

function makeLogger(): Logger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}

describe('toFailure / badRequest', () => {
  it('NotLoggedInError → 401', async () => {
    const response = toFailure(new NotLoggedInError())
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'ncm/not-logged-in' },
    })
  })

  it('InvalidCookieError → 400', async () => {
    const response = toFailure(new InvalidCookieError('bad'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'ncm/bad-request' } })
  })

  it('其它异常 → 502，message 为通用文案（不回传异常原文）', async () => {
    const response = toFailure(new Error('boom'))
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'ncm/upstream', message: '上游服务暂时不可用，请稍后重试' },
    })

    expect((await toFailure('oops').json()) as { error: { message: string } }).toMatchObject({
      error: { message: '上游服务暂时不可用，请稍后重试' },
    })
  })

  it('badRequest → 400 + bad-request', async () => {
    const response = badRequest('缺少 keywords 参数')
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'ncm/bad-request', message: '缺少 keywords 参数' },
    })
  })
})

describe('路由定义工厂', () => {
  it('route 统一 requestBody: buffered，并保留 path / methods / fetch', () => {
    const fetchFn = async () => ok('x')
    const hostRoute = route('/api/ncm/x', ['GET'], fetchFn)
    expect(hostRoute.def).toEqual({
      path: '/api/ncm/x',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: fetchFn,
    })
  })

  it('getRoute / postRoute 设置正确的方法', () => {
    expect(getRoute('/p', async () => ok(1)).def.methods).toEqual(['GET'])
    expect(postRoute('/p', async () => ok(1)).def.methods).toEqual(['POST'])
  })
})

describe('intParam', () => {
  it.each([
    ['?id=42', 42],
    ['?id=-5', -5],
    ['?id=3.9', 3],
    ['?id=abc', 7],
    ['?id=', 7],
    ['', 7],
  ])('intParam(%s, fallback=7) === %s', (search, expected) => {
    expect(intParam(new URL(`https://x.test/${search}`), 'id', 7)).toBe(expected)
  })
})

describe('请求参数校验', () => {
  it('requireKeyword：缺失 / 空白返回 400，正常返回 null', async () => {
    expect(await requireKeyword(new Request('https://x.test/api'))).toBeInstanceOf(Response)
    const blank = requireKeyword(new Request('https://x.test/api?keywords=%20%20'))
    expect((await blank)?.status).toBe(400)

    expect(requireKeyword(new Request('https://x.test/api?keywords=hello'))).toBeNull()
  })

  it('requirePositiveId：0 / 缺失返回 400，正数返回 null', async () => {
    expect((await requirePositiveId(new Request('https://x.test/api?id=0')))?.status).toBe(400)
    expect((await requirePositiveId(new Request('https://x.test/api')))?.status).toBe(400)
    expect(requirePositiveId(new Request('https://x.test/api?id=12'))).toBeNull()
  })
})

describe('请求体安全读取', () => {
  it('bodyString：非字符串 / 非法 JSON 返回空串', async () => {
    const req = (body: string) => new Request('https://x.test', { method: 'POST', body })
    expect(await bodyString(req(JSON.stringify({ name: 'a' })), 'name')).toBe('a')
    expect(await bodyString(req(JSON.stringify({ name: 1 })), 'name')).toBe('')
    expect(await bodyString(req('not json'), 'name')).toBe('')
  })

  it('bodyNumber：数字字符串转数字，非法返回 0', async () => {
    const req = (body: string) => new Request('https://x.test', { method: 'POST', body })
    expect(await bodyNumber(req(JSON.stringify({ n: '12' })), 'n')).toBe(12)
    expect(await bodyNumber(req(JSON.stringify({ n: 'x' })), 'n')).toBe(0)
    expect(await bodyNumber(req('bad json'), 'n')).toBe(0)
  })

  it('记录当前实现：同一 Request 连续读两次 body，第二次为空', async () => {
    // 见 docs/host-code-review.md 严重问题：多个 POST 路由在一个 handler 内
    // 连续调用 bodyString/bodyNumber，第二次起拿到空对象，导致恒 400。
    // 这里锁定当前行为；路由改为「一次读 body、多个字段从同一对象取」后应更新此测试。
    const req = new Request('https://x.test', {
      method: 'POST',
      body: JSON.stringify({ a: '1', b: '2' }),
    })
    expect(await bodyString(req, 'a')).toBe('1')
    expect(await bodyString(req, 'b')).toBe('')
  })
})

describe('run', () => {
  it('正常路径原样返回，不打 warn', async () => {
    const logger = makeLogger()
    const response = await run(logger, 'ok-route', async () => ok('v'))
    expect(await response.json()).toEqual({ ok: true, value: 'v' })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('未知异常打 warn（带插件 id + label）并转 502', async () => {
    const logger = makeLogger()
    const response = await run(logger, 'song-url', async () => {
      throw new Error('boom')
    })
    expect(response.status).toBe(502)
    expect(logger.warn).toHaveBeenCalledWith(`${PLUGIN_ID}/song-url: Error: boom`)
  })

  it('登录态异常静默转 401 / 400，不打 warn', async () => {
    const logger = makeLogger()
    const a = await run(logger, 'me', async () => {
      throw new NotLoggedInError()
    })
    const b = await run(logger, 'cookie', async () => {
      throw new InvalidCookieError('bad')
    })
    expect(a.status).toBe(401)
    expect(b.status).toBe(400)
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
