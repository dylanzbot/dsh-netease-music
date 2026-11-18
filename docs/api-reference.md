# 接口清单（浏览器端 ↔ 宿主端上游）

@dylanzbot/dsh-netease-music 是双端插件。请求链路：

```
浏览器端 (src/client)  --/api/ncm/*-->  宿主端 (src/host)  --上游协议-->  music.163.com
   /api/ncm/...  同源路由                    Node 路由 + service              网易云真实接口
```

下面按领域把**两端放在同一行**对照：
- **浏览器端路径**：`/api/ncm/*`，浏览器同源请求宿主；路径 enum 在 `src/client/api/*.api.ts`。
- **宿主端上游路径**：宿主真正发给 `music.163.com` 的接口；按协议分三类：
  - **明文 `/api/...`**（`getNcm` / `postNcm`，带 Cookie + Referer）
  - **weapi `/weapi/...`**（加密表单，关系 / 歌单收藏等）
  - **eapi `/eapi/...`**（客户端协议 + 环境参数，关注列表 / 高层音质 / 听歌足迹）
  - 上游调用在 `src/host/api/*.api.ts`，封装成 DTO 给 `services` 用。
- **方法**：以浏览器端 `request.get` / `request.post` 为准。

> 浏览器端统一 Envelope：`{ ok, value }` / `{ ok, error:{code,message} }`，见 `src/host/utils/response.ts`。

---

## 鉴权 / 登录（auth）

| 领域 | 方法 | 浏览器端路径（enum） | 宿主端上游接口（api 调用 → 文件） | 浏览器端调用 | 宿主端路由 |
|---|---|---|---|---|---|
| 扫码登录·发起 | POST | `/api/ncm/auth/qr/start` · `AuthApiPath.QrStart` | `/eapi/api/login/qrcode/unikey` · `createQrKey()` [auth.api.ts](../src/host/api/auth.api.ts) | `startQrLogin()` [auth.api.ts](../src/client/api/auth.api.ts) | [routes/auth.ts](../src/host/routes/auth.ts) · [services/auth.service.ts](../src/host/services/auth.service.ts) |
| 扫码登录·轮询 | GET | `/api/ncm/auth/qr/check` · `AuthApiPath.QrCheck` | `/eapi/api/login/qrcode/client/login` · `checkQrKey()` [auth.api.ts](../src/host/api/auth.api.ts) | `checkQrLogin(key)` [auth.api.ts](../src/client/api/auth.api.ts) | [routes/auth.ts](../src/host/routes/auth.ts) |
| 手动 Cookie 登录 | POST | `/api/ncm/auth/cookie` · `AccountApiPath.CookieLogin` | `/api/nuser/account/get` · `fetchAccount()` [account.api.ts](../src/host/api/account.api.ts) | `loginWithCookie(cookie)` [account.api.ts](../src/client/api/account.api.ts) | [routes/account.ts](../src/host/routes/account.ts) · [services/account.service.ts](../src/host/services/account.service.ts) |
| 登录态探测 | GET | `/api/ncm/auth/status` · `AccountApiPath.AuthStatus` | 复用「我的」缓存，命中则不打上游；未命中同 `/me`（`fetchAccount` 等） | `getAuthStatus()` [account.api.ts](../src/client/api/account.api.ts) | [routes/account.ts](../src/host/routes/account.ts) |
| 退出登录 | POST | `/api/ncm/auth/logout` · `AccountApiPath.Logout` | （无上游，仅清本地 Cookie + 缓存） | `logout()` [account.api.ts](../src/client/api/account.api.ts) | [routes/account.ts](../src/host/routes/account.ts) |

## 账号 / 我的（account）

| 领域 | 方法 | 浏览器端路径（enum） | 宿主端上游接口（api 调用 → 文件） | 浏览器端调用 | 宿主端路由 |
|---|---|---|---|---|---|
| 我的资料 + 歌单 | GET | `/api/ncm/me` · `AccountApiPath.Me` | 并发多个（30s 内缓存复用）：`/api/nuser/account/get`、`/api/v1/user/detail/{uid}`、`/api/user/playlist`、`/api/vipnewcenter/app/level/growhpoint/basic`、`/api/medal/user/page`、`/eapi/.../listen/data/*` → [account.api.ts](../src/host/api/account.api.ts) · [user.api.ts](../src/host/api/user.api.ts) · [playlist.api.ts](../src/host/api/playlist.api.ts) · [listen.api.ts](../src/host/api/listen.api.ts) | `getMe()` [account.api.ts](../src/client/api/account.api.ts) | [routes/account.ts](../src/host/routes/account.ts) · [services/account.service.ts](../src/host/services/account.service.ts) |

## 设置（settings）

| 领域 | 方法 | 浏览器端路径（enum） | 宿主端上游接口 | 浏览器端调用 | 宿主端路由 |
|---|---|---|---|---|---|
| 读取 / 保存设置 | GET + POST | `/api/ncm/settings` · `SettingsApiPath.Settings` | （无上游，读写本地 [host/config.ts](../src/host/config.ts)） | `getSettings()` / `saveSettings(patch)` [settings.api.ts](../src/client/api/settings.api.ts) | [routes/settings.route.ts](../src/host/routes/settings.route.ts) |

## 用户关系（user / relation）

| 领域 | 方法 | 浏览器端路径（enum） | 宿主端上游接口（api 调用 → 文件） | 浏览器端调用 | 宿主端路由 |
|---|---|---|---|---|---|
| 我关注的用户 | GET | `/api/ncm/user/follows` · `UserApiPath.Follows` | `/eapi/api/user/follow/users/mixed/get/v2` · `fetchFollows()` [user.api.ts](../src/host/api/user.api.ts) | `getFollows(limit, offset)` [user.api.ts](../src/client/api/user.api.ts) | [routes/relation.ts](../src/host/routes/relation.ts) · [services/relation.service.ts](../src/host/services/relation.service.ts) |
| 粉丝列表 | GET | `/api/ncm/user/fans` · `UserApiPath.Fans` | `/weapi/user/getfolloweds/` · `fetchFans()` [user.api.ts](../src/host/api/user.api.ts) | `getFans(limit, offset)` [user.api.ts](../src/client/api/user.api.ts) | [routes/relation.ts](../src/host/routes/relation.ts) |
| 关注 | POST | `/api/ncm/user/follow` · `UserApiPath.Follow` | `/api/user/follow/{uid}` · `performRelationAction()` [user.api.ts](../src/host/api/user.api.ts) | `relationAction('follow', userId)` [user.api.ts](../src/client/api/user.api.ts) | [routes/relation.ts](../src/host/routes/relation.ts) |
| 取消关注 | POST | `/api/ncm/user/unfollow` · `UserApiPath.Unfollow` | `/api/user/delfollow/{uid}` · `performRelationAction()` [user.api.ts](../src/host/api/user.api.ts) | `relationAction('unfollow', userId)` [user.api.ts](../src/client/api/user.api.ts) | [routes/relation.ts](../src/host/routes/relation.ts) |
| 移除粉丝 | POST | `/api/ncm/user/remove-fan` · `UserApiPath.RemoveFan` | `/api/user/delfan` · `performRelationAction()` [user.api.ts](../src/host/api/user.api.ts) | `relationAction('remove-fan', userId)` [user.api.ts](../src/client/api/user.api.ts) | [routes/relation.ts](../src/host/routes/relation.ts) |

## 歌曲 / 搜索 / 推荐（song + search）

| 领域 | 方法 | 浏览器端路径（enum） | 宿主端上游接口（api 调用 → 文件） | 浏览器端调用 | 宿主端路由 |
|---|---|---|---|---|---|
| 搜索歌曲（全站） | GET | `/api/ncm/search` · `SongApiPath.Search` | `/api/cloudsearch/pc` (type=1) · `searchSongs()` [song.api.ts](../src/host/api/song.api.ts) | `searchSongs(keywords)` [song.api.ts](../src/client/api/song.api.ts) | [routes/search.route.ts](../src/host/routes/search.route.ts) · [services/search.service.ts](../src/host/services/search.service.ts) |
| 多类型聚合搜索 | GET | `/api/ncm/search/multi` · `SongApiPath.SearchMulti` | 并发 4 路：`/api/cloudsearch/pc` (type=1/10/1000)、`/api/cloudsearch/pc` 歌手 | `searchMulti(keywords, limit)` [song.api.ts](../src/client/api/song.api.ts) | [routes/search.route.ts](../src/host/routes/search.route.ts) |
| 搜我的歌单 / 收藏 | GET | `/api/ncm/search/library` · `SongApiPath.SearchLibrary` | （无上游：本地遍历「我的歌单」缓存歌曲做字符串匹配，依赖 `/api/ncm/me` 数据） | `searchLibrary(keywords)` [song.api.ts](../src/client/api/song.api.ts) | [routes/search.route.ts](../src/host/routes/search.route.ts) |
| 歌曲播放地址 | GET | `/api/ncm/song/url` · `SongApiPath.SongUrl` | 音质分级回退：高层级 `/eapi/api/song/enhance/player/url/v1`，中低层级 `/weapi/song/enhance/player/url/v1`，兜底 `/api/song/enhance/player/url` · `fetchSongUrlByLevel()` [song.api.ts](../src/host/api/song.api.ts) | `getSongUrl(id, level?)` [song.api.ts](../src/client/api/song.api.ts) | [routes/song.route.ts](../src/host/routes/song.route.ts) · [services/song.service.ts](../src/host/services/song.service.ts) |
| 我喜欢的音乐 ID | GET | `/api/ncm/song/liked` · `SongApiPath.SongLiked` | `/api/song/like/get` · `fetchLikedSongIds()` [song.api.ts](../src/host/api/song.api.ts) | `getLikedSongIds()` [song.api.ts](../src/client/api/song.api.ts) | [routes/song.route.ts](../src/host/routes/song.route.ts) |
| 喜欢 / 取消喜欢 | POST | `/api/ncm/song/like` · `SongApiPath.SongLike` | `/api/song/like` · `setSongLike()` [song.api.ts](../src/host/api/song.api.ts) | `setSongLike(id, like)` [song.api.ts](../src/client/api/song.api.ts) | [routes/song.route.ts](../src/host/routes/song.route.ts) |
| 首页推荐 | GET | `/api/ncm/discover` · `SongApiPath.Discover` | 并发：`/api/personalized/playlist` + `/api/personalized/newsong` · [playlist.api.ts](../src/host/api/playlist.api.ts) [song.api.ts](../src/host/api/song.api.ts) | `getDiscover()` [song.api.ts](../src/client/api/song.api.ts) | [routes/search.route.ts](../src/host/routes/search.route.ts) |

## 歌单（playlist）

| 领域 | 方法 | 浏览器端路径（enum） | 宿主端上游接口（api 调用 → 文件） | 浏览器端调用 | 宿主端路由 |
|---|---|---|---|---|---|
| 歌单详情（歌曲） | GET | `/api/ncm/playlist/detail` · `PlaylistApiPath.Detail` | `/api/v6/playlist/detail` · `fetchPlaylistSongs()` [playlist.api.ts](../src/host/api/playlist.api.ts) | `getPlaylistSongs(id)` [playlist.api.ts](../src/client/api/playlist.api.ts) | [routes/playlist.route.ts](../src/host/routes/playlist.route.ts) · [services/playlist.service.ts](../src/host/services/playlist.service.ts) |
| 收藏 / 取消收藏 | POST | `/api/ncm/playlist/subscribe` · `PlaylistApiPath.Subscribe` | `/weapi/playlist/subscribe` 或 `/weapi/playlist/unsubscribe` · `setPlaylistSubscribed()` [playlist.api.ts](../src/host/api/playlist.api.ts) | `setPlaylistSubscribed(id, subscribed)` [playlist.api.ts](../src/client/api/playlist.api.ts) | [routes/playlist.route.ts](../src/host/routes/playlist.route.ts) |
| 「我的」歌单切片 | GET | `/api/ncm/playlists` · `PlaylistApiPath.MyPlaylists` | `/api/nuser/account/get` + `/api/user/playlist` · `fetchUserPlaylists()` [playlist.api.ts](../src/host/api/playlist.api.ts) [account.api.ts](../src/host/api/account.api.ts) | `getMyPlaylists()` [playlist.api.ts](../src/client/api/playlist.api.ts) | [routes/playlist.route.ts](../src/host/routes/playlist.route.ts) |

## 评论（comment）

| 领域 | 方法 | 浏览器端路径（enum） | 宿主端上游接口（api 调用 → 文件） | 浏览器端调用 | 宿主端路由 |
|---|---|---|---|---|---|
| 拉取一页评论 | GET | `/api/ncm/comments` · `CommentApiPath.Comments` | `/api/v1/resource/comments/{song\|play}` · `fetchComments()` [comment.api.ts](../src/host/api/comment.api.ts) | `getComments(type, id, limit, offset)` [comment.api.ts](../src/client/api/comment.api.ts) | [routes/comment.route.ts](../src/host/routes/comment.route.ts) · [services/comment.service.ts](../src/host/services/comment.service.ts) |
| 点赞 / 取消点赞 | POST | `/api/ncm/comment/like` · `CommentApiPath.Like` | `/weapi/comment/like` · `likeComment()` [comment.api.ts](../src/host/api/comment.api.ts) | `likeComment(threadId, commentId, like)` [comment.api.ts](../src/client/api/comment.api.ts) | [routes/comment.route.ts](../src/host/routes/comment.route.ts) |
| 回复 | POST | `/api/ncm/comment/reply` · `CommentApiPath.Reply` | `/weapi/comment/reply` · `replyComment()` [comment.api.ts](../src/host/api/comment.api.ts) | `replyComment(threadId, commentId, content)` [comment.api.ts](../src/client/api/comment.api.ts) | [routes/comment.route.ts](../src/host/routes/comment.route.ts) |
| 删除自己的评论 | POST | `/api/ncm/comment/delete` · `CommentApiPath.Delete` | `/weapi/comment/delete` · `deleteComment()` [comment.api.ts](../src/host/api/comment.api.ts) | `deleteComment(threadId, commentId)` [comment.api.ts](../src/client/api/comment.api.ts) | [routes/comment.route.ts](../src/host/routes/comment.route.ts) |

## 歌手 / 专辑 / MV（artist）

| 领域 | 方法 | 浏览器端路径（enum） | 宿主端上游接口（api 调用 → 文件） | 浏览器端调用 | 宿主端路由 |
|---|---|---|---|---|---|
| 热门歌手榜 | GET | `/api/ncm/artist/list` · `ArtistApiPath.List` | `/api/artist/top` · `fetchTopArtists()` [artist.api.ts](../src/host/api/artist.api.ts) | `getTopArtists(limit, offset)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) · [services/artist.service.ts](../src/host/services/artist.service.ts) |
| 搜索 / 首字母浏览歌手 | GET | `/api/ncm/artist/search` · `ArtistApiPath.Search` | `/api/cloudsearch/pc` (type=100) · `searchArtists()` [artist.api.ts](../src/host/api/artist.api.ts) | `searchArtists(keywords, offset, limit)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) |
| 歌手详情 + 热门歌曲 | GET | `/api/ncm/artist/detail` · `ArtistApiPath.Detail` | `/api/v1/artist/{id}` · `fetchArtistInfo()` [artist.api.ts](../src/host/api/artist.api.ts) | `getArtistInfo(id)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) |
| 歌手歌曲 | GET | `/api/ncm/artist/songs` · `ArtistApiPath.Songs` | `/api/v1/artist/songs` · `fetchArtistSongs()` [artist.api.ts](../src/host/api/artist.api.ts) | `getArtistSongs(id, order, offset, limit)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) |
| 歌手专辑 | GET | `/api/ncm/artist/albums` · `ArtistApiPath.Albums` | `/api/artist/albums/{id}` · `fetchArtistAlbums()` [artist.api.ts](../src/host/api/artist.api.ts) | `getArtistAlbums(id, limit, offset)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) |
| 专辑详情 + 歌曲 | GET | `/api/ncm/album/songs` · `ArtistApiPath.AlbumDetail` | `/api/v1/album/{id}` · `fetchAlbumDetail()` [artist.api.ts](../src/host/api/artist.api.ts) | `getAlbumDetail(id)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) |
| 歌手 MV | GET | `/api/ncm/artist/mvs` · `ArtistApiPath.Mvs` | `/api/artist/mvs` · `fetchArtistMvs()` [artist.api.ts](../src/host/api/artist.api.ts) | `getArtistMvs(id, limit, offset)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) |
| 关注 / 取关歌手 | POST | `/api/ncm/artist/follow` · `ArtistApiPath.Follow` | `/eapi/api/artist/sub` 或 `/eapi/api/artist/unsub` · `setArtistFollow()` [artist.api.ts](../src/host/api/artist.api.ts) | `setArtistFollow(id, follow)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) |
| MV 详情 | GET | `/api/ncm/mv/detail` · `ArtistApiPath.MvDetail` | `/api/mv/detail` · `fetchMvDetail()` [artist.api.ts](../src/host/api/artist.api.ts) | `getMvDetail(id)` [artist.api.ts](../src/client/api/artist.api.ts) | [routes/artist.ts](../src/host/routes/artist.ts) |
| MV 代理下载 | — | **已注释停用**，相关代码保留在 [routes/artist.ts](../src/host/routes/artist.ts)，恢复时取消注释即可 | — | — | [routes/artist.ts](../src/host/routes/artist.ts) |

---

## 上游协议说明

| 协议 | 前缀 | 加密 | 典型场景 | 工具 |
|---|---|---|---|---|
| 明文 `/api/` | `{BASE}/api/...` | 无（带 Cookie + Referer） | 登录态、资料、搜索、歌手、评论列表、播放地址兜底 | `getNcm` / `postNcm`（[common.api.ts](../src/host/api/common.api.ts)） |
| weapi | `{BASE}/weapi/...` | RSA 密钥 + AES | 关系粉丝、歌单收藏、评论操作 | `weapiPost`（[utils/weapi.ts](../src/host/utils/weapi.ts)） |
| eapi | `{BASE}/eapi/...` | 客户端环境参数 | 扫码登录、关注列表、高层音质、听歌足迹、歌手关注 | `eapiPost` / `eapiPostWithCookie`（[utils/eapi.ts](../src/host/utils/eapi.ts)） |

## 路径注册总览

- **浏览器端**（`/api/ncm/*` 路径 enum）：`src/client/api/*.api.ts`——`AccountApiPath` / `AuthApiPath` / `SettingsApiPath` / `UserApiPath` / `SongApiPath` / `PlaylistApiPath` / `CommentApiPath` / `ArtistApiPath`。
- **宿主端路由**（`HostApiPath`）：[host/routes/paths.ts](../src/host/routes/paths.ts)（共 36 个），注册入口 [host/index.ts](../src/host/index.ts)。
- **宿主端上游**：各 `src/host/api/*.api.ts` 里的 `getNcm` / `postNcm` / `weapiPost` / `eapiPostWithCookie` 调用。

## 错误码约定（Envelope `error.code`）

| 错误码 | 常量 | 含义 |
|---|---|---|
| `ncm/bad-request` | `ERROR_CODE_BAD_REQUEST` | 参数缺失 / 非法 |
| `ncm/not-logged-in` | `ERROR_CODE_NOT_LOGGED_IN` | 未登录 / 登录过期（HTTP 401） |
| `ncm/qr-expired` | `ERROR_CODE_QR_EXPIRED` | 扫码会话失效（HTTP 410） |
| `ncm/upstream` | `ERROR_CODE_UPSTREAM` | 上游网易云失败（HTTP 502） |

错误码定义：[constants/error-code.ts](../src/constants/error-code.ts)；翻译逻辑：[host/routes/shared.ts](../src/host/routes/shared.ts) 的 `toFailure`。
