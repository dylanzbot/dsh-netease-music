/**
 * 多类型聚合搜索类型（单曲 / 歌手 / 专辑 / 歌单）。
 *
 * @module @dylanzbot/dsh-netease-music/types/search
 */

import type { NcmAlbumCardDTO, NcmArtistCardDTO } from './artist.js'
import type { NcmPlaylistCardDTO } from './playlist.js'
import type { NcmSongDTO } from './song.js'

/** 各组命中总数（用于判断「查看更多」/ 是否还有下一页）。 */
export interface NcmMultiSearchCountsDTO {
  readonly song: number
  readonly artist: number
  readonly album: number
  readonly playlist: number
}

/**
 * 多类型聚合搜索结果：一次返回四组结果。
 *
 * 由宿主 `GET /api/ncm/search/multi` 内部并发请求 cloudsearch 的
 * type=1 / 100 / 10 / 1000 四组后合并返回。
 */
export interface NcmMultiSearchDTO {
  readonly songs: readonly NcmSongDTO[]
  readonly artists: readonly NcmArtistCardDTO[]
  readonly albums: readonly NcmAlbumCardDTO[]
  readonly playlists: readonly NcmPlaylistCardDTO[]
  readonly counts: NcmMultiSearchCountsDTO
}
