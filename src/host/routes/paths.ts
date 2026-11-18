/**
 * 宿主路由路径。
 *
 * 浏览器请求走 client/api 各自定义的 enum，宿主侧注册路由使用这里的 enum；
 * 两边字符串必须保持一致，这是 HTTP 契约的一部分。
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/paths
 */

export enum HostApiPath {
  QrStart = '/api/ncm/auth/qr/start',
  QrCheck = '/api/ncm/auth/qr/check',
  // CookieLogin = '/api/ncm/auth/cookie', // 手动 Cookie 登录已禁用
  AuthStatus = '/api/ncm/auth/status',
  Logout = '/api/ncm/auth/logout',
  Me = '/api/ncm/me',
  Settings = '/api/ncm/settings',
  Search = '/api/ncm/search',
  SearchLibrary = '/api/ncm/search/library',
  SearchMulti = '/api/ncm/search/multi',
  Discover = '/api/ncm/discover',
  SongUrl = '/api/ncm/song/url',
  SongLiked = '/api/ncm/song/liked',
  SongLike = '/api/ncm/song/like',
  PlaylistDetail = '/api/ncm/playlist/detail',
  PlaylistSubscribe = '/api/ncm/playlist/subscribe',
  MyPlaylists = '/api/ncm/playlists',
  Comments = '/api/ncm/comments',
  CommentLike = '/api/ncm/comment/like',
  CommentReply = '/api/ncm/comment/reply',
  CommentDelete = '/api/ncm/comment/delete',
  Follows = '/api/ncm/user/follows',
  Fans = '/api/ncm/user/fans',
  Follow = '/api/ncm/user/follow',
  Unfollow = '/api/ncm/user/unfollow',
  RemoveFan = '/api/ncm/user/remove-fan',
  ArtistList = '/api/ncm/artist/list',
  ArtistSearch = '/api/ncm/artist/search',
  ArtistDetail = '/api/ncm/artist/detail',
  ArtistSongs = '/api/ncm/artist/songs',
  ArtistAlbums = '/api/ncm/artist/albums',
  // 路径值沿用旧的 /api/ncm/album/songs：宿主侧升级为「介绍 + 歌曲」聚合返回后，
  // 运行中的旧版本仍能响应同一路径（只是只返回 songs[]，浏览器侧会兼容）。
  AlbumDetail = '/api/ncm/album/songs',
  ArtistMvs = '/api/ncm/artist/mvs',
  MvDetail = '/api/ncm/mv/detail',
  MvDownload = '/api/ncm/mv/download',
  ArtistFollow = '/api/ncm/artist/follow',
}
