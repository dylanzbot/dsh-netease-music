import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { readConfig, writeConfig } from '../../src/host/config.js'
import type { ConfigEditor, Context, Logger, PluginEntry } from '../../src/types/cordis-host.js'

const TEST_HOME = join(process.cwd(), '.test-tmp', 'dsh-home-preferences')
const originalDshHome = process.env.DSH_HOME

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

const ENTRY: PluginEntry = { id: 'dsh-netease-music', options: { config: {} } }

function createCtx(editor: ConfigEditor | undefined, withEntry = true): Context {
  return {
    logger: () => createLogger(),
    get: (name: string) => (name === 'configEditor' ? editor : undefined),
    fiber: withEntry ? { entry: ENTRY } : undefined,
    inject: vi.fn(),
    effect: vi.fn(),
  } as unknown as Context
}

function makeEditor(): ConfigEditor {
  return {
    edit: vi.fn(async (_entry, change) => {
      change({}, {})
    }),
  } as unknown as ConfigEditor
}

describe('插件偏好存储', () => {
  it('有 configEditor 时偏好走 profile 配置', async () => {
    const editor = makeEditor()
    const mod = await import('../../src/host/preferences.js')
    mod.initPreferences(createCtx(editor), { showFollowStats: true }, createLogger())

    expect(mod.getSettings()).toEqual({ showFollowStats: true })
    await expect(mod.setShowFollowStats(false)).resolves.toEqual({ showFollowStats: false })
    expect(editor.edit).toHaveBeenCalledWith(ENTRY, expect.any(Function))
    expect(mod.getSettings()).toEqual({ showFollowStats: false })
  })

  it('编辑失败时回滚内存快照并抛错', async () => {
    const editor = {
      edit: vi.fn().mockRejectedValue(new Error('edit failed')),
    } as unknown as ConfigEditor
    const mod = await import('../../src/host/preferences.js')
    mod.initPreferences(createCtx(editor), { showFollowStats: true }, createLogger())

    await expect(mod.setShowFollowStats(false)).rejects.toThrow('edit failed')
    expect(mod.getSettings()).toEqual({ showFollowStats: true })
  })

  it('无 configEditor 时降级到旧文件且保留 Cookie', async () => {
    writeConfig({ cookie: 'MUSIC_U=keep', showFollowStats: false })
    const mod = await import('../../src/host/preferences.js')
    mod.initPreferences(createCtx(undefined), { showFollowStats: true }, createLogger())

    expect(mod.getSettings()).toEqual({ showFollowStats: false })
    await mod.setShowFollowStats(true)
    expect(mod.getSettings()).toEqual({ showFollowStats: true })
    expect(readConfig()).toEqual({ cookie: 'MUSIC_U=keep', showFollowStats: true })
  })

  it('缺少 fiber.entry 时也走降级', async () => {
    writeConfig({ cookie: '', showFollowStats: false })
    const mod = await import('../../src/host/preferences.js')
    mod.initPreferences(createCtx(makeEditor(), false), { showFollowStats: true }, createLogger())
    expect(mod.getSettings()).toEqual({ showFollowStats: false })
  })

  it('把旧文件里的偏好迁移进 profile 配置', async () => {
    writeConfig({ cookie: '', showFollowStats: false })
    const editor = makeEditor()
    const mod = await import('../../src/host/preferences.js')
    mod.initPreferences(createCtx(editor), { showFollowStats: true }, createLogger())

    await vi.waitFor(() => expect(editor.edit).toHaveBeenCalled())
    expect(mod.getSettings()).toEqual({ showFollowStats: false })
  })
})
