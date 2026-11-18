/**
 * 听歌足迹 / 累计收听数据上游接口。
 *
 * 上游（eapi）：
 *   - /api/content/activity/listen/data/total    所有时间累计收听时长
 *   - /api/content/activity/listen/data/report   上一个完整周 / 月的收听报告
 *
 * 时长的单位在不同接口里并不统一：`totalDuration` 按秒处理，
 * `playDuration` 按分钟处理（网易云听歌足迹接口约定）。
 *
 * 注意「最近一周」必须用 `report?type=week`（上一个完整周），不能用
 * `realtime/report?type=week`：后者返回的是「本周日 00:00 → 此刻」的实时窗口，
 * 在一周开头（周日~周二）通常是 0，与 UI 上「最近一周（分钟）」的语义不符。
 * 网易云的「周」是周日 00:00 到周六 24:00（Asia/Shanghai），本项目不自行
 * 计算周边界，直接沿用接口返回的 playDuration，因此天然与接口口径一致。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-listen
 */

import type { NcmListenStatsDTO } from '../../types/index.js'
import { eapiPostWithCookie } from '../utils/eapi.js'

/** 读取听歌统计（best-effort，单个接口失败不影响另一个）。 */
export async function fetchListenStats(cookie: string, signal?: AbortSignal): Promise<NcmListenStatsDTO> {
  const [totalResult, weekResult] = await Promise.allSettled([
    eapiPostWithCookie('/api/content/activity/listen/data/total', {}, cookie, signal),
    eapiPostWithCookie('/api/content/activity/listen/data/report', { type: 'week' }, cookie, signal),
  ])

  let totalDurationSeconds: number | undefined
  if (totalResult.status === 'fulfilled') {
    const body = totalResult.value.body as {
      code?: number
      data?: { totalDuration?: number }
    }
    if (body.code === 200 && typeof body.data?.totalDuration === 'number') {
      totalDurationSeconds = body.data.totalDuration
    }
  }

  let weekPlayMinutes: number | undefined
  let weekListenDays: number | undefined
  if (weekResult.status === 'fulfilled') {
    const body = weekResult.value.body as {
      code?: number
      data?: {
        listenTimeDistributionBlock?: { playDuration?: number; listenDays?: number }
      }
    }
    const block = body.data?.listenTimeDistributionBlock
    if (body.code === 200 && block !== undefined) {
      if (typeof block.playDuration === 'number') weekPlayMinutes = block.playDuration
      if (typeof block.listenDays === 'number') weekListenDays = block.listenDays
    }
  }

  return { totalDurationSeconds, weekPlayMinutes, weekListenDays }
}
