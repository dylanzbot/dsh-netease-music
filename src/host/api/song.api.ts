/**
 * 歌曲相关上游接口（搜索 / 新歌 / 播放地址 / 喜欢）。
 *
 * @module @dylanzbot/dsh-netease-music/host/api/ncm-song
 */

import type { NcmQualityLevel, NcmSongDTO } from '../../types/index.js'
import { eapiPostWithCookie } from '../utils/eapi.js'
import { weapiPost } from '../utils/weapi.js'
import { csrfFromCookie } from '../../utils/ncm.js'
import { getNcm, mapSong, numberOr, postNcm, imageUrl, NCM_IMAGE_SIZE, type RawSearchSong } from './common.api.js'
import { NcmApiError } from '../error/index.js'

/** 音质等级规格：br 用于明文回退，encodeType 决定上游给的容器格式。 */
export interface NcmQualitySpec {
  readonly br: number
  readonly encodeType: 'mp3' | 'flac'
  /** 沉浸环绕声需要额外的 immerseType 参数。 */
  readonly immerseType?: string
}

/**
 * 各音质等级的上游参数。
 *
 * 说明：`jyeffect / sky / jymaster / vivid` 只能通过 eapi 的 `level` 参数真正拿到，
 * 明文 `br` 接口对它们只会返回「该歌曲可用的最高无损」，因此高层级优先走 eapi。
 */
export const NCM_QUALITY_SPECS: Readonly<Record<NcmQualityLevel, NcmQualitySpec>> = {
  standard: { br: 128000, encodeType: 'mp3' },
  higher: { br: 192000, encodeType: 'mp3' },
  exhigh: { br: 320000, encodeType: 'mp3' },
  lossless: { br: 999000, encodeType: 'flac' },
  jyeffect: { br: 999000, encodeType: 'flac' },
  sky: { br: 999000, encodeType: 'flac', immerseType: 'c51' },
  jymaster: { br: 999000, encodeType: 'flac' },
  vivid: { br: 999000, encodeType: 'flac' },
}

/** 允许的音质等级集合，用于校验外部传参。 */
export const ALLOWED_QUALITY_LEVELS: readonly NcmQualityLevel[] = Object.keys(NCM_QUALITY_SPECS) as NcmQualityLevel[]

/** 默认音质：极高 320 kbps（与旧行为一致）。 */
export const DEFAULT_QUALITY_LEVEL: NcmQualityLevel = 'exhigh'

interface RawNewSongItem {
  readonly id?: number
  readonly name?: string
  readonly picUrl?: string
  readonly song?: {
    readonly id?: number
    readonly name?: string
    readonly duration?: number
    readonly fee?: number
    readonly artists?: ReadonlyArray<{ readonly id?: number; readonly name?: string }>
    readonly album?: { readonly name?: string; picUrl?: string }
    readonly noCopyrightRcmd?: unknown
  }
}

interface RawNewSongBody {
  readonly code?: number
  readonly result?: readonly RawNewSongItem[]
}

/** 歌曲播放地址。 */
export interface NcmSongUrl {
  readonly url: string
  /** 上游实际返回的码率（无损 FLAC / 高清臻音时与请求的 br 不同）。 */
  readonly br: number
  /** 上游返回的音频格式（mp3 / flac 等）。 */
  readonly type: string
  /** 上游返回的文件大小（字节）。 */
  readonly size: number
  /** 上游实际返回的音质等级（可能因为版权 / 会员 / 曲库回退）。 */
  readonly level: string
}

/** 搜索歌曲（cloudsearch 字段最全）。 */
export async function searchSongs(
  keywords: string,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmSongDTO[]> {
  return (await searchSongsWithTotal(keywords, cookie, signal)).songs
}

/** 搜索歌曲并返回命中总数（多类型聚合搜索需要总数判断「查看更多」）。 */
export async function searchSongsWithTotal(
  keywords: string,
  cookie: string,
  signal?: AbortSignal,
): Promise<{ songs: NcmSongDTO[]; total: number }> {
  const { body } = await postNcm(
    '/api/cloudsearch/pc',
    { s: keywords, type: '1', limit: '20', offset: '0', total: 'true' },
    cookie,
    signal,
  )
  const data = body as { code?: number; result?: { songs?: readonly RawSearchSong[] | null; songCount?: number } }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '搜索接口返回失败')
  }
  return {
    songs: (data.result?.songs ?? []).map(mapSong),
    total: numberOr(data.result?.songCount, (data.result?.songs ?? []).length),
  }
}

/** 首页新歌速递。 */
export async function fetchNewSongs(cookie: string, signal?: AbortSignal): Promise<NcmSongDTO[]> {
  const { body } = await getNcm('/api/personalized/newsong?limit=8', cookie, signal)
  const data = body as RawNewSongBody
  return (data.result ?? []).map((item) => {
    const song = item.song
    const artistPairs = (song?.artists ?? [])
      .map((artist) => ({ id: numberOr(artist.id), name: artist.name ?? '' }))
      .filter((pair) => pair.name !== '')
    return {
      id: numberOr(item.id ?? song?.id),
      name: item.name ?? song?.name ?? '未知歌曲',
      artists: artistPairs.map((pair) => pair.name),
      artistIds: artistPairs.map((pair) => pair.id),
      album: song?.album?.name ?? '',
      durationMs: numberOr(song?.duration),
      coverUrl: imageUrl(item.picUrl ?? song?.album?.picUrl, NCM_IMAGE_SIZE.xs),
      fee: numberOr(song?.fee),
      ...(song?.noCopyrightRcmd != null ? { noCopyright: true } : {}),
    }
  })
}

/** 上游响应里的单条歌曲地址。 */
interface RawSongUrlItem {
  readonly url?: string | null
  readonly br?: number
  readonly type?: string | null
  readonly size?: number
  readonly level?: string | null
}

/** 把上游单条数据收敛成 NcmSongUrl。 */
function toSongUrl(item: RawSongUrlItem | undefined, requestedLevel: string): NcmSongUrl | null {
  const url = typeof item?.url === 'string' ? item.url : ''
  if (url === '') return null
  return {
    url: url.replace(/^http:\/\//, 'https://'),
    br: item?.br ?? 0,
    type: item?.type ?? '',
    size: item?.size ?? 0,
    level: item?.level ?? requestedLevel,
  }
}

/** 明文 br 接口（所有等级都能用，但只能拿到「该歌曲最高可用」的无损）。 */
async function fetchSongUrlByBr(
  id: number,
  br: number,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmSongUrl | null> {
  const params = new URLSearchParams({ id: String(id), ids: JSON.stringify([id]), br: String(br) })
  const { body } = await getNcm(`/api/song/enhance/player/url?${params.toString()}`, cookie, signal)
  const data = body as { code?: number; data?: readonly RawSongUrlItem[] }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '歌曲地址接口返回失败')
  }
  return toSongUrl(data.data?.[0], '')
}

/** weapi 的 level 接口（稳定；高层级会回退成最高无损）。 */
async function fetchSongUrlByWeapiLevel(
  id: number,
  level: NcmQualityLevel,
  encodeType: 'mp3' | 'flac',
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmSongUrl | null> {
  const { body } = await weapiPost(
    '/song/enhance/player/url/v1',
    { ids: JSON.stringify([id]), level, encodeType, csrf_token: '' },
    cookie,
    signal,
  )
  const data = body as { code?: number; data?: readonly RawSongUrlItem[] }
  if (data.code !== undefined && data.code !== 200) return null
  return toSongUrl(data.data?.[0], level)
}

/** eapi 的 level 接口（高清臻音 / 沉浸环绕声 / 超清母带；上游可能返回 -460）。 */
async function fetchSongUrlByEapiLevel(
  id: number,
  level: NcmQualityLevel,
  spec: NcmQualitySpec,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmSongUrl | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { body } = await eapiPostWithCookie(
      '/api/song/enhance/player/url/v1',
      {
        ids: JSON.stringify([id]),
        level,
        encodeType: spec.encodeType,
        csrf_token: '',
        ...(spec.immerseType !== undefined ? { immerseType: spec.immerseType } : {}),
      },
      cookie,
      signal,
    )
    const data = body as { code?: number; data?: readonly RawSongUrlItem[] }
    const got = toSongUrl(data.data?.[0], level)
    if (got !== null) return got
    // -460 时重试一次；其他错误直接放弃。
    if (data.code !== -460) return null
  }
  return null
}

/**
 * 按音质等级获取歌曲播放地址（版权 / VIP 受限时 url 为空串）。
 *
 * 策略：
 *   1. 普通等级（标准 / 较高 / 极高 / 无损）走稳定的 weapi level 接口；
 *   2. 高层级（高清臻音 / 沉浸环绕声 / 超清母带 / 臻音全景声）先试 eapi
 *      （只有 eapi 能拿到这些音源），-460 时降级到 weapi；
 *   3. 最后再用明文 br 兜底，保证任何等级都有声音。
 *
 * 返回值里的 `br / type / level` 是上游**实际**给的数据，UI 可以据此展示真实码率。
 */
export async function fetchSongUrlByLevel(
  id: number,
  level: NcmQualityLevel,
  cookie: string,
  signal?: AbortSignal,
): Promise<NcmSongUrl> {
  const spec = NCM_QUALITY_SPECS[level]
  const isHighTier = level === 'jyeffect' || level === 'sky' || level === 'jymaster' || level === 'vivid'

  let result: NcmSongUrl | null = null
  if (isHighTier) {
    try {
      result = await fetchSongUrlByEapiLevel(id, level, spec, cookie, signal)
    } catch {
      result = null
    }
  }
  if (result === null) {
    try {
      result = await fetchSongUrlByWeapiLevel(id, level, spec.encodeType, cookie, signal)
    } catch {
      result = null
    }
  }
  if (result === null) {
    result = await fetchSongUrlByBr(id, spec.br, cookie, signal)
  }
  return result ?? { url: '', br: 0, type: '', size: 0, level }
}

/** 兼容旧调用：按 br 获取播放地址。 */
export async function fetchSongUrl(
  id: number,
  cookie: string,
  br: number = NCM_QUALITY_SPECS.exhigh.br,
  signal?: AbortSignal,
): Promise<NcmSongUrl> {
  const result = await fetchSongUrlByBr(id, br, cookie, signal)
  return result ?? { url: '', br: 0, type: '', size: 0, level: '' }
}


/** 读取「我喜欢的音乐」歌曲 ID 列表。 */
export async function fetchLikedSongIds(cookie: string, signal?: AbortSignal): Promise<number[]> {
  const { body } = await getNcm('/api/song/like/get', cookie, signal)
  const data = body as { code?: number; ids?: readonly number[] }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, '喜欢列表接口返回失败')
  }
  return (data.ids ?? []).filter((id) => Number.isFinite(id) && id > 0)
}

/** 喜欢 / 取消喜欢一首歌。 */
export async function setSongLike(
  id: number,
  like: boolean,
  cookie: string,
  signal?: AbortSignal,
): Promise<void> {
  const params = new URLSearchParams({
    trackId: String(id),
    like: like ? 'true' : 'false',
    csrf_token: csrfFromCookie(cookie),
  })
  const { body } = await getNcm(`/api/song/like?${params.toString()}`, cookie, signal)
  const data = body as { code?: number; message?: string }
  if (data.code !== undefined && data.code !== 200) {
    throw new NcmApiError(data.code, data.message ?? '喜欢操作失败')
  }
}
