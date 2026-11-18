import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_ID } from '../../src/constants/plugin.js'
import {
  configPath,
  getCookie,
  getSettings,
  readConfig,
  setCookie,
  setShowFollowStats,
  writeConfig,
} from '../../src/host/config.js'

const TEST_HOME = join(process.cwd(), '.test-tmp', 'dsh-home')
const originalDshHome = process.env.DSH_HOME

beforeEach(() => {
  rmSync(TEST_HOME, { recursive: true, force: true })
  mkdirSync(TEST_HOME, { recursive: true })
  process.env.DSH_HOME = TEST_HOME
})

afterAll(() => {
  rmSync(TEST_HOME, { recursive: true, force: true })
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
})

describe('configPath', () => {
  it('使用 DSH_HOME 下的 storages/<plugin>/config.json', () => {
    expect(configPath()).toBe(join(TEST_HOME, 'storages', PLUGIN_ID, 'config.json'))
  })

  it('DSH_HOME 为空白字符串时回退到 ~/.dsh', () => {
    process.env.DSH_HOME = '   '
    expect(configPath()).toContain('.dsh')
  })
})

describe('readConfig', () => {
  it('文件不存在返回默认配置', () => {
    expect(readConfig()).toEqual({ cookie: '', showFollowStats: true })
  })

  it('损坏的 JSON 返回默认配置', () => {
    const path = configPath()
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, '{bad json', 'utf8')
    expect(readConfig()).toEqual({ cookie: '', showFollowStats: true })
  })

  it('字段类型不对时逐字段回退默认值', () => {
    const path = configPath()
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, JSON.stringify({ cookie: 123, showFollowStats: 'yes' }), 'utf8')
    expect(readConfig()).toEqual({ cookie: '', showFollowStats: true })
  })
})

describe('writeConfig', () => {
  it('递归建目录、写 JSON、权限收紧到 600', () => {
    const path = configPath()
    expect(existsSync(path)).toBe(false)

    writeConfig({ cookie: 'MUSIC_U=x', showFollowStats: false })

    expect(existsSync(path)).toBe(true)
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ cookie: 'MUSIC_U=x', showFollowStats: false })
    expect(statSync(path).mode & 0o777).toBe(0o600)
  })
})

describe('凭证与设置读写', () => {
  it('setCookie 保留 showFollowStats，getCookie 读回', () => {
    writeConfig({ cookie: '', showFollowStats: false })
    setCookie('MUSIC_U=abc; __csrf=xyz')
    expect(getCookie()).toBe('MUSIC_U=abc; __csrf=xyz')
    expect(readConfig().showFollowStats).toBe(false)
  })

  it('setShowFollowStats 保留 cookie 并返回设置', () => {
    setCookie('MUSIC_U=keep')
    expect(setShowFollowStats(false)).toEqual({ showFollowStats: false })
    expect(getCookie()).toBe('MUSIC_U=keep')
    expect(getSettings()).toEqual({ showFollowStats: false })

    expect(setShowFollowStats(true)).toEqual({ showFollowStats: true })
    expect(getCookie()).toBe('MUSIC_U=keep')
  })

  it('getSettings 只暴露非敏感字段', () => {
    setCookie('MUSIC_U=secret')
    expect(getSettings()).toEqual({ showFollowStats: true })
    expect(JSON.stringify(getSettings())).not.toContain('secret')
  })
})
