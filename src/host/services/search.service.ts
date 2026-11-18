/**
 * 搜索 / 推荐业务逻辑。
 *
 *   - 搜索歌曲（全站）
 *   - 多类型聚合搜索（单曲 / 歌手 / 专辑 / 歌单）
 *   - 在「我的歌单 / 我的收藏」里搜歌曲（库内搜索）
 *   - 首页推荐（推荐歌单 + 新歌速递）
 *
 * 未登录也能搜索（Cookie 只用于提升音质 / 版权判定），库内搜索依赖 getMe。
 *
 * @module @dylanzbot/dsh-netease-music/host/services/search
 */

import type {
  NcmDiscoverDTO,
  NcmLibrarySearchDTO,
  NcmLibrarySearchItemDTO,
  NcmMultiSearchDTO,
  NcmSongDTO,
} from '../../types/index.js'
import {
  fetchNewSongs,
  fetchRecommendedPlaylists,
  fetchPlaylistSongs,
  searchAlbums,
  searchArtists,
  searchPlaylists,
  searchSongs,
  searchSongsWithTotal,
} from '../api/index.js'
import { getCookie } from '../config.js'
import { getMe } from './account.service.js'
import {
  librarySearchCache,
  playlistTracksCache,
  scopedCacheKey,
  type PlaylistTracksCache,
} from './cache.js'

/** 歌单歌曲缓存：搜索我的歌单时避免每次都重新拉全部歌单。 */
const PLAYLIST_TRACKS_TTL_MS = 5 * 60_000

const LIBRARY_SEARCH_TTL_MS = 30_000

/** 读取歌单歌曲（带 5 分钟缓存，按用户 + 歌单 id 隔离）。 */
async function getPlaylistSongsCached(id: number): Promise<readonly NcmSongDTO[]> {
  const key = scopedCacheKey(getCookie(), String(id))
  const cached = playlistTracksCache.get(key)
  if (cached !== undefined && Date.now() - cached.at < PLAYLIST_TRACKS_TTL_MS) return cached.songs
  try {
    const songs = await fetchPlaylistSongs(id, getCookie())
    playlistTracksCache.set(key, { at: Date.now(), songs } satisfies PlaylistTracksCache)
    return songs
  } catch {
    return []
  }
}

/** 在「我的歌单 / 我的收藏」里搜索歌曲名或歌手名。 */
export async function searchLibrary(keywords: string): Promise<NcmLibrarySearchDTO> {
  const trimmed = keywords.trim()
  if (trimmed === '') return { mine: [], collections: [] }

  const cacheKey = scopedCacheKey(getCookie(), trimmed)
  const cached = librarySearchCache.get(cacheKey)
  if (cached !== undefined && Date.now() - cached.at < LIBRARY_SEARCH_TTL_MS) return cached.data

  const me = await getMe()
  const mineCards = [...(me.liked !== null ? [me.liked] : []), ...me.playlists]
  const groups = await Promise.all(
    [
      { cards: mineCards, key: 'mine' as const },
      { cards: me.collections, key: 'collections' as const },
    ].map(async ({ cards, key }) => {
      const entries = await Promise.all(
        cards.map(async (playlist) => ({ playlist, songs: await getPlaylistSongsCached(playlist.id) })),
      )
      const needle = trimmed.toLowerCase()
      const items: NcmLibrarySearchItemDTO[] = []
      for (const entry of entries) {
        for (const song of entry.songs) {
          if (
            song.name.toLowerCase().includes(needle) ||
            song.artists.some((artist) => artist.toLowerCase().includes(needle))
          ) {
            items.push({ song, playlist: entry.playlist })
            if (items.length >= 20) break
          }
        }
        if (items.length >= 20) break
      }
      return { key, items }
    }),
  )

  const data: NcmLibrarySearchDTO = {
    mine: groups.find((group) => group.key === 'mine')?.items ?? [],
    collections: groups.find((group) => group.key === 'collections')?.items ?? [],
  }
  librarySearchCache.set(cacheKey, { at: Date.now(), data })
  return data
}

/** 搜索歌曲。未登录也允许搜索（Cookie 用于提升音质 / 版权判定）。 */
export async function search(keywords: string): Promise<NcmSongDTO[]> {
  const trimmed = keywords.trim()
  if (trimmed === '') return []
  return searchSongs(trimmed, getCookie())
}

/**
 * 多类型聚合搜索：并发请求 cloudsearch 的单曲 / 歌手 / 专辑 / 歌单。
 *
 * 官方搜索下拉正是「按 type 分组展示」，同一个 cloudsearch 接口分别用
 * type=1/100/10/1000 请求后合并。这里在宿主侧并发四路、一次返回四组结果，
 * 浏览器侧只需一次请求。任一组失败不影响其它组（失败组返回空数组）。
 */
export async function searchMulti(keywords: string, limit = 5): Promise<NcmMultiSearchDTO> {
  const trimmed = keywords.trim()
  if (trimmed === '') {
    return {
      songs: [],
      artists: [],
      albums: [],
      playlists: [],
      counts: { song: 0, artist: 0, album: 0, playlist: 0 },
    }
  }
  const cookie = getCookie()
  const size = Math.min(Math.max(limit, 1), 30)
  const [songR, artistR, albumR, playlistR] = await Promise.all([
    searchSongsExpanded(trimmed, cookie, size),
    searchArtists(trimmed, 0, size, cookie).catch(() => ({ artists: [], total: 0, more: false })),
    searchAlbums(trimmed, 0, size, cookie).catch(() => ({ albums: [], total: 0, more: false })),
    searchPlaylists(trimmed, 0, size, cookie).catch(() => ({ playlists: [], total: 0, more: false })),
  ])
  return {
    songs: songR.songs,
    artists: artistR.artists,
    albums: albumR.albums,
    playlists: playlistR.playlists,
    counts: {
      song: songR.total,
      artist: artistR.total,
      album: albumR.total,
      playlist: playlistR.total,
    },
  }
}

/** 搜索歌曲并取回命中总数（searchSongs 只返回数组，聚合搜索需要总数）。截断到 limit 条展示。 */
async function searchSongsExpanded(
  keywords: string,
  cookie: string,
  limit: number,
): Promise<{ songs: readonly NcmSongDTO[]; total: number }> {
  try {
    const { songs, total } = await searchSongsWithTotal(keywords, cookie)
    return { songs: songs.slice(0, limit), total }
  } catch {
    return { songs: [], total: 0 }
  }
}

/** 首页推荐：推荐歌单 + 新歌速递。 */
export async function getDiscover(): Promise<NcmDiscoverDTO> {
  const cookie = getCookie()
  const [playlists, newSongs] = await Promise.all([
    fetchRecommendedPlaylists(cookie),
    fetchNewSongs(cookie),
  ])
  return { playlists, newSongs }
}
