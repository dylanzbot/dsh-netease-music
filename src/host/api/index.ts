/**
 * 宿主侧上游 API 统一出口（barrel）。
 *
 * 按领域拆成多个文件：
 *   - common.api.ts   共享基础：base URL、原始类型、字段映射
 *   - auth.api.ts     登录：扫码 eapi、二维码、Cookie 登录
 *   - account.api.ts  账号：登录态、黑胶会员等级
 *   - user.api.ts     用户：资料、徽章、关注/粉丝、关系操作
 *   - playlist.api.ts 歌单：用户歌单、歌单详情、推荐歌单
 *   - song.api.ts     歌曲：搜索、新歌、播放地址（音质）、喜欢
 *   - artist.api.ts   歌手 / 专辑 / MV
 *   - comment.api.ts  评论
 *   - listen.api.ts   听歌足迹
 *
 * services 层从这里按需 import，不直接依赖具体文件。
 *
 * @module @dylanzbot/dsh-netease-music/host/api
 */

export { NCM_BASE_URL } from './common.api.js'
export type { RawProfile, RawPlaylist, RawSearchSong } from './common.api.js'
export { NcmApiError } from '../error/index.js'

export { NcmQrCode, checkQrKey, createQrKey } from './auth.api.js'
export type { NcmQrCheck, NcmQrKey } from './auth.api.js'

export { fetchAccount, fetchVipInfo } from './account.api.js'

export {
  fetchBadgeSummary,
  fetchFans,
  fetchFollowDays,
  fetchFollows,
  fetchUserDetail,
  performRelationAction,
} from './user.api.js'
export type { NcmRelationActionResult, RawMixedDayRecord, RawRelationUser } from './user.api.js'

export {
  fetchPlaylistSongs,
  fetchRecommendedPlaylists,
  fetchUserPlaylists,
  searchPlaylists,
  setPlaylistSubscribed,
} from './playlist.api.js'

export {
  fetchAlbumDetail,
  fetchArtistAlbums,
  fetchArtistInfo,
  fetchArtistMvs,
  fetchArtistSongs,
  fetchMvDetail,
  fetchTopArtists,
  searchAlbums,
  searchArtists,
  setArtistFollow,
} from './artist.api.js'

export { fetchListenStats } from './listen.api.js'

export { deleteComment, fetchComments, likeComment, replyComment } from './comment.api.js'

export {
  ALLOWED_QUALITY_LEVELS,
  DEFAULT_QUALITY_LEVEL,
  fetchLikedSongIds,
  fetchNewSongs,
  fetchSongUrl,
  fetchSongUrlByLevel,
  NCM_QUALITY_SPECS,
  searchSongs,
  searchSongsWithTotal,
  setSongLike,
} from './song.api.js'
export type { NcmQualitySpec, NcmSongUrl } from './song.api.js'
