import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../src/types/cordis.js'
import { NotLoggedInError } from '../../src/host/error/index.js'
import { QrSessionExpiredError } from '../../src/host/error/auth-error.js'
import { checkQrLogin, startQrLogin } from '../../src/host/services/auth.service.js'
import { getFollows } from '../../src/host/services/relation.service.js'
import { HostApiPath } from '../../src/host/routes/paths.js'
import { createAuthRouter } from '../../src/host/routes/auth.js'
import { createRelationRouter } from '../../src/host/routes/relation.js'

vi.mock('../../src/host/services/auth.service.js', () => ({
  startQrLogin: vi.fn(),
  checkQrLogin: vi.fn(),
}))
vi.mock('../../src/host/services/relation.service.js', () => ({
  getFollows: vi.fn(),
  getFans: vi.fn(),
  doRelationAction: vi.fn(),
}))

const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }

function routeOf(routes: ReturnType<typeof createAuthRouter>, path: string) {
  const found = routes.find((item) => item.def.path === path)
  if (found === undefined) throw new Error(`route ${path} not found`)
  return found.def.fetch
}

describe('路由错误翻译收敛（M3）', () => {
  it('扫码发起失败走统一 toFailure（未登录 401，不打 warn）', async () => {
    vi.mocked(startQrLogin).mockRejectedValueOnce(new NotLoggedInError())
    const response = await routeOf(createAuthRouter(logger), HostApiPath.QrStart)(new Request('https://x/api'))
    expect(response.status).toBe(401)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('会话过期仍是 410 + 专用错误码', async () => {
    vi.mocked(checkQrLogin).mockRejectedValueOnce(new QrSessionExpiredError())
    const response = await routeOf(
      createAuthRouter(logger),
      HostApiPath.QrCheck,
    )(new Request('https://x/api?key=k'))
    expect(response.status).toBe(410)
    expect(await response.json()).toMatchObject({ error: { code: 'ncm/qr-expired' } })
  })

  it('关注列表未登录返回 401 而非 502', async () => {
    vi.mocked(getFollows).mockRejectedValueOnce(new NotLoggedInError())
    const response = await routeOf(
      createRelationRouter(logger),
      HostApiPath.Follows,
    )(new Request('https://x/api'))
    expect(response.status).toBe(401)
  })

  it('未知异常返回通用文案，不回传异常原文', async () => {
    vi.mocked(getFollows).mockRejectedValueOnce(new Error('internal fields exposed'))
    const response = await routeOf(
      createRelationRouter(logger),
      HostApiPath.Follows,
    )(new Request('https://x/api'))
    expect(response.status).toBe(502)
    expect(await response.json()).not.toMatchObject({ error: { message: 'Error: internal fields exposed' } })
  })
})
