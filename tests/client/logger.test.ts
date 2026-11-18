// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildLogExport,
  clearLogs,
  initLogger,
  logError,
  logInfo,
  logWarn,
} from '../../src/client/utils/logger.js'

describe('诊断日志', () => {
  const sink = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }

  beforeEach(() => {
    clearLogs()
    vi.clearAllMocks()
    initLogger({ logger: () => sink })
  })

  it('复用 ctx.logger 输出，同时保留本地记录', () => {
    logInfo('test', 'hello')
    expect(sink.info).toHaveBeenCalledWith('[dsh-netease-music/test] hello')
    const exported = JSON.parse(buildLogExport()) as { records: Array<{ message: string }> }
    expect(exported.records[0]?.message).toContain('hello')
  })

  it('对 Cookie / token 脱敏', () => {
    logWarn('request', 'failed with MUSIC_U=secret123; __csrf=abc and token=xyz')
    const exported = JSON.parse(buildLogExport()) as { records: Array<{ message: string }> }
    const message = exported.records[0]?.message ?? ''
    expect(message).not.toContain('secret123')
    expect(message).not.toContain('abc')
    expect(message).not.toContain('xyz')
    expect(message).toContain('MUSIC_U=***')
    expect(sink.warn).toHaveBeenCalled()
  })

  it('导出内容含插件标识与时间，不含明文 Cookie', () => {
    logError('panel', 'boom', { cookie: '__csrf=topsecret' })
    const text = buildLogExport()
    expect(text).toContain('"plugin": "dsh-netease-music"')
    expect(text).toContain('"exportedAt"')
    expect(text).not.toContain('topsecret')
  })

  it('环形缓冲只保留最近 300 条', () => {
    for (let i = 0; i < 310; i += 1) logInfo('test', `msg-${i}`)
    const exported = JSON.parse(buildLogExport()) as { records: Array<{ message: string }> }
    expect(exported.records).toHaveLength(300)
    expect(exported.records[0]?.message).toContain('msg-10')
    expect(exported.records.at(-1)?.message).toContain('msg-309')
  })

  it('没有 ctx.logger 时仍可记录（老版本 dsh 兜底）', () => {
    initLogger(undefined)
    expect(() => logInfo('test', 'still works')).not.toThrow()
    expect(buildLogExport()).toContain('still works')
  })
})
