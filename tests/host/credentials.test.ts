import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ID } from '../../src/constants/plugin.js'
import { configPath, readConfig, writeConfig } from '../../src/host/config.js'
import type {
  Context,
  CredentialRecord,
  CredentialsService,
  Logger,
} from '../../src/types/cordis-host.js'

const TEST_HOME = join(process.cwd(), '.test-tmp', 'dsh-home-credentials')
const originalDshHome = process.env.DSH_HOME
const COOKIE_KEY = `${PLUGIN_ID}/ncm-cookie`

beforeEach(() => {
  vi.resetModules()
  rmSync(TEST_HOME, { recursive: true, force: true })
  mkdirSync(TEST_HOME, { recursive: true })
  process.env.DSH_HOME = TEST_HOME
})

afterAll(() => {
  rmSync(TEST_HOME, { recursive: true, force: true })
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
})

function createLogger(): Logger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger
}

function createCtx(service: CredentialsService | undefined): Context {
  return {
    logger: () => createLogger(),
    get: (name: string) => (name === 'credentials' ? service : undefined),
    inject: vi.fn(),
    effect: vi.fn(),
  } as unknown as Context
}

function makeService(record: CredentialRecord | undefined): CredentialsService {
  return {
    readRecord: vi.fn().mockResolvedValue(record),
    modifyRecord: vi.fn(async (_key, mutate) => mutate(record)),
    deleteRecord: vi.fn().mockResolvedValue(undefined),
  } as unknown as CredentialsService
}

describe('Cookie 凭据存储', () => {
  it('无 credentials 服务时降级到旧文件', async () => {
    writeConfig({ cookie: 'MUSIC_U=legacy', showFollowStats: false })
    const mod = await import('../../src/host/credentials.js')

    await mod.initCookieStore(createCtx(undefined), createLogger())
    expect(mod.getCookie()).toBe('MUSIC_U=legacy')

    await mod.saveCookie('MUSIC_U=next')
    expect(mod.getCookie()).toBe('MUSIC_U=next')
    expect(readConfig()).toEqual({ cookie: 'MUSIC_U=next', showFollowStats: false })
  })

  it('有凭据记录时预读到内存缓存', async () => {
    const service = makeService({ kind: 'grant', payload: { cookie: 'MUSIC_U=stored' } })
    const mod = await import('../../src/host/credentials.js')

    await mod.initCookieStore(createCtx(service), createLogger())
    expect(mod.getCookie()).toBe('MUSIC_U=stored')
    expect(service.readRecord).toHaveBeenCalledWith(COOKIE_KEY)
  })

  it('首次启动把旧文件 Cookie 迁移进凭据记录并删掉 cookie 键', async () => {
    writeConfig({ cookie: 'MUSIC_U=old', showFollowStats: false })
    const service = makeService(undefined)
    const mod = await import('../../src/host/credentials.js')

    await mod.initCookieStore(createCtx(service), createLogger())

    expect(service.modifyRecord).toHaveBeenCalledWith(COOKIE_KEY, expect.any(Function))
    expect(mod.getCookie()).toBe('MUSIC_U=old')
    expect(JSON.parse(readFileSync(configPath(), 'utf8'))).toEqual({ showFollowStats: false })
  })

  it('记录格式不对时当作未登录', async () => {
    const service = makeService({ kind: 'grant', payload: { other: 'x' } })
    const mod = await import('../../src/host/credentials.js')

    await mod.initCookieStore(createCtx(service), createLogger())
    expect(mod.getCookie()).toBe('')
  })

  it('读取记录失败时记 warn 且不登录', async () => {
    const logger = createLogger()
    const service = {
      ...makeService(undefined),
      readRecord: vi.fn().mockRejectedValue(new Error('read failed')),
    }
    const mod = await import('../../src/host/credentials.js')

    await mod.initCookieStore(createCtx(service as unknown as CredentialsService), logger)
    expect(mod.getCookie()).toBe('')
    expect(logger.warn).toHaveBeenCalled()
  })

  it('迁移写入失败时保留旧文件与内存值', async () => {
    writeConfig({ cookie: 'MUSIC_U=keep', showFollowStats: true })
    const service = {
      ...makeService(undefined),
      modifyRecord: vi.fn().mockRejectedValue(new Error('write failed')),
    }
    const logger = createLogger()
    const mod = await import('../../src/host/credentials.js')

    await mod.initCookieStore(createCtx(service as unknown as CredentialsService), logger)
    expect(mod.getCookie()).toBe('MUSIC_U=keep')
    expect(readConfig().cookie).toBe('MUSIC_U=keep')
    expect(logger.warn).toHaveBeenCalled()
  })

  it('saveCookie 写 grant 记录；空串走 deleteRecord', async () => {
    const service = makeService(undefined)
    const mod = await import('../../src/host/credentials.js')
    await mod.initCookieStore(createCtx(service), createLogger())

    await mod.saveCookie('MUSIC_U=fresh')
    expect(service.modifyRecord).toHaveBeenCalledWith(COOKIE_KEY, expect.any(Function))

    await mod.saveCookie('')
    expect(service.deleteRecord).toHaveBeenCalledWith(COOKIE_KEY)
    expect(mod.getCookie()).toBe('')
  })

  it('保存失败时回滚内存缓存并抛错', async () => {
    const service = {
      ...makeService({ kind: 'grant', payload: { cookie: 'MUSIC_U=stored' } }),
      modifyRecord: vi.fn().mockRejectedValue(new Error('boom')),
    }
    const mod = await import('../../src/host/credentials.js')
    await mod.initCookieStore(createCtx(service as unknown as CredentialsService), createLogger())

    await expect(mod.saveCookie('MUSIC_U=new')).rejects.toThrow('boom')
    expect(mod.getCookie()).toBe('MUSIC_U=stored')
  })
})
