import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatCount,
  formatDate,
  formatDuration,
  formatListenHoursValue,
  formatListenMinutes,
  formatListenMinutesValue,
  formatListenSeconds,
  genderLabel,
} from '../../src/client/utils/format.js'

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [-1, '0'],
    [Number.NaN, '0'],
    [Number.POSITIVE_INFINITY, '0'],
    [1, '1'],
    [1234.6, '1235'],
    [9999, '9999'],
    [10000, '1万'],
    [12345, '1.2万'],
    [15000, '1.5万'],
    [99999, '10万'],
    [100000000, '1亿'],
    [123456789, '1.2亿'],
  ])('formatCount(%s) === %s', (input, expected) => {
    expect(formatCount(input)).toBe(expected)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '--:--'],
    [-1, '--:--'],
    [Number.NaN, '--:--'],
    [999, '0:01'], // Math.round(0.999) => 1
    [1000, '0:01'],
    [1500, '0:02'], // Math.round(1.5) => 2
    [60000, '1:00'],
    [61000, '1:01'],
    [3661000, '61:01'], // 不换算成小时；分钟可超过 59
  ])('formatDuration(%s) === %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })
})

describe('formatClock', () => {
  it.each([
    [-1, '0:00'],
    [Number.NaN, '0:00'],
    [0, '0:00'],
    [59.9, '0:59'], // 向下取整
    [61, '1:01'],
    [3600, '60:00'],
  ])('formatClock(%s) === %s', (input, expected) => {
    expect(formatClock(input)).toBe(expected)
  })
})

describe('formatDate', () => {
  it('把毫秒时间戳格式化为本地 YYYY-MM-DD', () => {
    // 用本地时间构造器构造，避免测试依赖具体时区
    const ts = new Date(2023, 0, 2, 12, 30).getTime()
    expect(formatDate(ts)).toBe('2023-01-02')
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('非法时间戳 %s 返回空串', (input) => {
    expect(formatDate(input)).toBe('')
  })
})

describe('genderLabel', () => {
  it.each([
    [1, '男'],
    [2, '女'],
    [0, '未知'],
    [3, '未知'],
    [-1, '未知'],
  ])('genderLabel(%s) === %s', (input, expected) => {
    expect(genderLabel(input)).toBe(expected)
  })
})

describe('听歌时长格式化', () => {
  it('formatListenMinutes：不足 1 小时显示分钟，超过显示小时', () => {
    expect(formatListenMinutes(0)).toBe('0 分钟')
    expect(formatListenMinutes(-5)).toBe('0 分钟')
    expect(formatListenMinutes(Number.NaN)).toBe('0 分钟')
    expect(formatListenMinutes(45)).toBe('45 分钟')
    expect(formatListenMinutes(45.6)).toBe('46 分钟')
    expect(formatListenMinutes(60)).toBe('1 小时')
    expect(formatListenMinutes(90)).toBe('1.5 小时')
    expect(formatListenMinutes(119)).toBe('2 小时')
  })

  it('formatListenSeconds：按小时展示', () => {
    expect(formatListenSeconds(0)).toBe('0 小时')
    expect(formatListenSeconds(-1)).toBe('0 小时')
    expect(formatListenSeconds(1800)).toBe('0.5 小时')
    expect(formatListenSeconds(3600)).toBe('1 小时')
    expect(formatListenSeconds(5400)).toBe('1.5 小时')
  })

  it('数值版本去掉多余小数', () => {
    expect(formatListenMinutesValue(0)).toBe('0')
    expect(formatListenMinutesValue(-1)).toBe('0')
    expect(formatListenMinutesValue(45)).toBe('45')
    expect(formatListenMinutesValue(45.6)).toBe('45.6')
    expect(formatListenMinutesValue(120.04)).toBe('120')

    expect(formatListenHoursValue(0)).toBe('0')
    expect(formatListenHoursValue(1800)).toBe('0.5')
    expect(formatListenHoursValue(3600)).toBe('1')
    expect(formatListenHoursValue(5400)).toBe('1.5')
  })
})
