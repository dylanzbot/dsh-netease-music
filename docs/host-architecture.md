# 宿主端（`src/host/`）架构与设计说明

> 记录时间：2026-11-15
> 来源：从 `src/host/**` 源码中提取整理的设计要点，与客户端文档 [client-architecture.md](./client-architecture.md) 对称。
> 相关文档：接口清单见 [api-reference.md](./api-reference.md)；上游接口约束见 [upstream-notes.md](./upstream-notes.md)；
> MV / 搜索 / 图片等专项见 [mv-playback.md](./mv-playback.md) / [search-multi-type.md](./search-multi-type.md) / [image-loading.md](./image-loading.md)。

本文汇总「宿主端为什么这样分层 / 为什么这样设计」的结论，代码里只留简短注释。

---

## 1. 分层结构

```
src/host/
  index.ts              宿主入口：Cordis 插件三件套（name / inject / apply / Config），注册全部路由
  credentials.ts        Cookie：dsh 官方凭据 seam + 内存缓存 + 旧数据迁移
  preferences.ts        非敏感偏好：插件 Config / configEditor
  config.ts             旧文件存储（仅迁移与降级兜底）
  error/                全部领域错误类型（api-error / auth-error / index barrel）
  api/                  上游接口封装层（按领域：common / auth / account / user / playlist / song / artist / comment / listen）
  services/             业务逻辑层（按领域拆分 + cache.ts 集中缓存）
  routes/               路由层（Controller：paths / shared + 按领域拆分的 route 文件）
  utils/                宿主工具（request / eapi / weapi / cookie / response）
```

**依赖方向**（单向、无环）：
```
index.ts → routes/* → services/* → api/* → utils/* → constants / types / utils(ncm,time,json)
```
- `routes` 只做「读参数 → 调 service → 包 Envelope」，不碰加密、不发上游请求；
- `services` 做「取 Cookie → 调 api → 组装 DTO / 缓存」，统一处理未登录；
- `api` 做「调哪个上游接口、把原始字段映射成 DTO」，不碰 HTTP 路由、不直接读 dsh 配置。

> 共享层：`src/constants/**`（错误码 / HTTP / 插件名）、`src/types/**`（DTO/VO）、`src/utils/**`（跨端纯函数）由 host 与 client 共用。

---

## 2. 入口与路由注册（`index.ts`）

- `name` / `inject` / `apply` 是 Cordis 插件硬契约，**名字不能改**。
- `inject: ['connection']` 声明依赖 dsh 的 `connection` 服务（HTTP 通道路由层）。
- `apply` 里 `ctx.inject([SERVICE_CONNECTION], scope => ...)` 等连接就位后注册路由。
- **降级**：旧版 dsh 没有 `fetch.register` 时打一条 warn 并直接返回——面板仍能渲染，只是拿不到数据。
- **生命周期**：每条路由用 `ctx.effect(register, label)` 注册，插件卸载时自动撤销。
- 路由数组按领域组织：`auth → account → settings → relation → search → song → comment → playlist → artist`（共 36 条）。

---

## 3. 路由层（`routes/`）

### 3.1 `paths.ts` —— HTTP 契约

- `HostApiPath` enum 是宿主侧对浏览器暴露的 `/api/ncm/*` 路径清单（36 个）。
- 浏览器端各 `*ApiPath` enum 与之一一对应，字符串必须完全一致（详见 [api-reference.md](./api-reference.md)）。
- 少数路径**刻意沿用旧值**以兼容运行中的旧宿主（如 `AlbumDetail = '/api/ncm/album/songs'`）。

### 3.2 `shared.ts` —— 路由样板收敛

各路由反复出现的「读参 / 校验 / try-catch / 包 Envelope」统一到这里：

| 工具 | 作用 |
|---|---|
| `route(path, methods, fetch)` / `getRoute` / `postRoute` | 组装 `RouteDefinition`，统一 `requestBody: 'buffered'` |
| `run(logger, label, fn)` | 执行「调 service + 包 Envelope」；统一异常翻译与日志 |
| `toFailure(error)` | 领域异常 → Envelope：未登录 401 / Cookie 无效 400 / 其余 502 |
| `badRequest(msg)` | 最常用的 400 参数失败 |
| `intParam` / `requireKeyword` / `requirePositiveId` | query 参数读取与必填校验 |
| `bodyString` / `bodyNumber` | JSON body 安全取值 |

**`run()` 的日志策略**：`NotLoggedInError` / `InvalidCookieError` 是预期中的用户态（登录态探测会频繁触发），**静默**处理不打 warn；其它异常打一条带标签的 warn 再转 502，避免登录轮询刷屏。

### 3.3 按领域拆分的路由文件

`account.ts`（登录/Cookie/退出/我的）、`search.route.ts`（搜索/聚合/库内/推荐）、`song.route.ts`（播放地址/喜欢）、
`comment.route.ts`、`playlist.route.ts`、`settings.route.ts`、`relation.ts`（关注/粉丝）、`auth.ts`（扫码）、`artist.ts`（歌手/专辑/MV）。
**文件命名与客户端 `client/api/*.api.ts` 领域一一对应**，便于两端对照。

- 例外：`artist.ts` 的 **MV 下载**是流式代理（自定义响应头、非 Envelope），单独处理但同样用 `route()` 包定义。

---

## 4. API 层（`api/`）

- 按领域拆分：`common`（共享基础）/ `auth`（扫码）/ `account`（登录态/会员）/ `user`（资料/关系）/ `playlist` / `song` / `artist` / `comment` / `listen`（听歌足迹）。统一从 `api/index.ts` barrel 导出，**services 只从 barrel 取，不依赖具体文件**。
- 每个 `fetch*` 函数签名固定为 `(业务参数..., cookie, signal?)`，内部：调上游 → 校验 `code` → 映射 DTO。
- **DTO 映射**集中在 api 层：`mapSong` / `mapPlaylist` / `mapAlbumCard` / `mapArtistCard` / `mapRelationUser` 等，把上游原始结构（`Raw*`）收敛成 `src/types/**` 的 DTO。
- **错误**：上游 `code !== 200` 抛 `NcmApiError(code, message)`（保留上游数字 code，供 service 判断 301/302 登录失效、501 幂等等）。

### 4.1 `common.api.ts` —— 共享基础

- `NCM_BASE_URL` 单例（来自 `constants/ncm.ts`）、`getNcm` / `postNcm`（明文协议 + Cookie + Referer）。
- 图片处理 `httpsUrl()` / `imageUrl(url, size)` + `NCM_IMAGE_SIZE` 档位（见 [image-loading.md](./image-loading.md)）。
- 原始类型 `RawProfile` / `RawPlaylist` / `RawSearchSong` / `RawAlbumCard` 与映射函数。

---

## 5. Service 层（`services/`）

- 按领域拆分：`account` / `auth` / `search` / `song` / `comment` / `playlist` / `relation` / `artist`。
- 统一模式：`requireCookie()`（空 Cookie 抛 `NotLoggedInError`）→ 调 `api` → 返回 DTO。
- **Cookie 失效处理集中在 account.service**：一旦上游明确 301/302，立即清掉本地 Cookie，让浏览器回登录页，而不是一直显示空数据。

### 5.1 `cache.ts` —— 集中缓存（避免循环依赖）

各 service 的内存缓存收拢到一处：

| 缓存 | 有效期 | 用途 |
|---|---|---|
| `meCacheStore`（`MeCache`） | 30s | 「我的」数据（资料+歌单+会员+徽章+听歌），同 Cookie 内复用 |
| `playlistTracksCache` | 5min | 歌单歌曲（库内搜索时避免重复拉全量歌单） |
| `librarySearchCache` | 30s | 「我的歌单/收藏」内搜索结果（按关键词） |

`clearAllCaches()` 供「退出登录 / 取消收藏」一次性清空。**为什么不放各 service 内部**：`logout()` 要清全部、`subscribePlaylist` 要清 me 缓存——集中存放可避免 service 之间互相 import 成环。

---

## 6. 上游协议（`utils/eapi.ts` / `utils/weapi.ts`）

宿主不直连浏览器、也不让浏览器碰加密；三套上游协议都在宿主侧：

| 协议 | 前缀 | 加密 | 典型场景 | 工具 |
|---|---|---|---|---|
| 明文 `/api/` | `{BASE}/api/...` | 无（Cookie + Referer） | 登录态、资料、搜索、歌手、评论、播放地址兜底 | `getNcm` / `postNcm` |
| weapi | `{BASE}/weapi/...` | AES-128-CBC + RSA | 关系粉丝、歌单收藏、评论操作 | `weapiPost` |
| eapi | `{BASE}/eapi/...` | AES-128-ECB + 客户端环境参数 | 扫码登录、关注列表、高层音质、听歌足迹、歌手关注 | `eapiPost` / `eapiPostWithCookie` |

**关键约束（踩过的坑）**：
- **eapi 的 UA 与环境参数需一致**：`eapiCookieHeader` 用 `os=pc` / Windows，与 UA 不一致时上游返回 `-460`（高清臻音 / 环绕声等音源会失败）。
- **设备号复用**：`SHARED_DEVICE` 全局固定，保持会话环境参数一致。
- **扫码登录**使用 eapi 协议。
- **weapi 密钥是协议常量**，不是用户凭证；参考 `NeteaseCloudMusicApiEnhanced/api-enhanced`。

---

## 7. 错误体系（`error/`）

所有领域错误**单一来源**，避免同一错误类在多 service 各写一份、`instanceof` 互不认：

| 错误 | 位置 | 语义 |
|---|---|---|
| `NcmApiError` | `error/api-error.ts` | 上游 `code !== 200`，保留数字 code |
| `InvalidCookieError` | `error/auth-error.ts` | 手动 Cookie 无效（`code = ncm/bad-request`） |
| `NotLoggedInError` | `error/auth-error.ts` | 未登录 / 过期（`code = ncm/not-logged-in`） |
| `QrSessionExpiredError` | `error/auth-error.ts` | 扫码会话失效（路由转 410） |

- 错误码定义在 `src/constants/error-code.ts`；路由层 `toFailure` 负责把错误翻成 Envelope + HTTP 状态。
- 浏览器侧对 Envelope 的错误归一成 `ApiError`（`client/utils/request.ts`）。

---

## 8. 配置与凭证（`credentials.ts` / `preferences.ts` / `config.ts`）

- **Cookie 走 dsh 官方凭据 seam**：作为 `dsh-netease-music/ncm-cookie` 记录（`kind: 'grant'`，payload 里是 Cookie）读写，写路径只有 `modifyRecord` / `deleteRecord`。`ctx.credentials` 不存在时降级到旧文件。
- **`getCookie()` 同步**：`apply` 时预读一次凭据到内存缓存；写操作异步，成功后更新缓存，失败回滚。
- **偏好走插件 Config**：`showFollowStats` 通过 `ctx.configEditor.edit` 写回当前 profile 的插件配置；`Config` 是手写 Standard Schema 对象，不引入 zod / schemastery 依赖。无 configEditor 时降级到旧文件。
- **`config.ts` 只做迁移与兜底**：旧文件 `$DSH_HOME/storages/dsh-netease-music/config.json` 迁移成功后抹掉 `cookie` 字段（保留偏好），不再留存明文；损坏 JSON 回退空配置，权限 600。
- **Cookie 只由宿主读写**，浏览器侧永远拿不到完整 Cookie（安全边界）。

---

## 9. 工具（`utils/`）

- `request.ts`：宿主 HTTP 封装（Node `fetch`），统一 Chrome UA、Cookie 注入、读 `Set-Cookie`；返回 `{ body, setCookies }`。**固定 UA** 使请求稳定、可复现。
- `cookie.ts`：纯字符串处理——解析 `Set-Cookie`、清洗 `Path/Domain/HttpOnly` 等属性（`normalizeCookieString`）、合并多段 Cookie（`mergeCookieStrings`）。登录成功时完整 Cookie 可能在 `data.cookie` 或 `Set-Cookie` 头里，属性不能原样保存。
- `response.ts`：Envelope `{ ok:true, value }` / `{ ok:false, error:{code,message} }`，统一 `no-store`。
- `eapi.ts` / `weapi.ts`：见 §6。

---

## 10. 与客户端的对称关系

| 关注点 | 客户端 | 宿主端 |
|---|---|---|
| 入口 | `client/index.ts`（slots 注册） | `host/index.ts`（Cordis 插件 + 路由注册） |
| API 层 | `client/api/*.api.ts`（`*ApiPath` enum） | `host/routes/*.ts`（`HostApiPath`）+ `host/api/*.api.ts`（上游） |
| 领域划分 | auth/account/user/playlist/song/artist/settings/comment | 同名对齐 |
| 请求封装 | `client/utils/request.ts`（Envelope 解包） | `host/utils/request.ts`（HTTP + Set-Cookie） |
| 错误 | `ApiError`（Envelope code） | `error/*`（领域异常）+ `toFailure` |
| 缓存 | 无（纯前端） | `services/cache.ts`（me/歌单/搜索） |
| 凭证 | 不接触 | `credentials.ts`（官方凭据记录，同步内存读）；`config.ts` 仅迁移/兜底 |

> 接口的逐条对照（浏览器 `/api/ncm/*` ↔ 宿主上游 `music.163.com` 路径）见 [api-reference.md](./api-reference.md)。
