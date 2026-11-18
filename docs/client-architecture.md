# 客户端（`src/client/`）架构与组件设计说明

> 记录时间：2026-11-14；更新：2026-11-16（新增 §9「全局机制」并同步目录树）
> 来源：从 `src/client/**` 源码注释中提取整理的设计要点（对外发布前的精简版留档）。
> 相关文档：宿主端架构见 [host-architecture.md](./host-architecture.md)；接口清单见 [api-reference.md](./api-reference.md)；
> 构建/双半侧结构见 [FAQ.md](./FAQ.md)；表情见 [emoji-rendering.md](./emoji-rendering.md)；
> 图片尺寸参数见 [image-loading.md](./image-loading.md)；MV 见 [mv-playback.md](./mv-playback.md)；
> 多类型搜索见 [search-multi-type.md](./search-multi-type.md)；壳子交互（滚动条 / 面板动画 / 背景断层）见 [shell-interop.md](./shell-interop.md)。

本文汇总「客户端为什么这样分层 / 组件为什么这样设计」的结论，代码里只留简短注释，
长篇理由集中在这里。

---

## 1. 分层结构

```
src/client/
  index.ts              浏览器半侧入口：把侧栏图标 / 主面板 / 设置卡片注册进 dsh 的 slots
  panel.tsx             主面板：登录态状态机（booting / guest / member / error）+ 页面切换
  api/                  浏览器侧 API 封装（按领域拆分，见 §2）
  constants/
    message.ts          统一错误文案（避免各组件重复字面量）
  components/
    base/               通用基础件（popover / modal / drawer / play-button / tags / image / error-boundary / skeleton / …）
    <领域>/             业务组件（album / artist / comment / mv / player / playlist / search / song / user）
    common/             nav-rail（右侧导航）、settings（设置面板）
    login/              qr-panel（扫码面板）
  hooks/                通用 React hooks（use-async / use-paged-list / use-relation-action / …）
  pages/                页面级组件（home / artist / artist-list / mine / playlist / login / loading / error）
  player/engine.ts      播放器引擎（模块级单例）
  utils/                纯工具（request / format / emoji / mv / pubsub / z-index / css / logger）
  styles/               共享样式（tokens / motion / shell / controls / utilities）
```

**入口与 slots**：`index.ts` 通过 dsh 壳子的 `slots` 服务把组件「插」进预留位置
（`sidebar.panellist`、`main`、`settings.section`）。`slots.inject(插槽名, 回调)` 只是把注册逻辑
挂到插槽上，等壳子激活该插槽时才在回调里 `slots.register(...)`，避免壳子 UI 未就绪时过早注册。
浏览器 bundle 是 lazy-CJS factory，运行时只能 `require` 壳子冻结的 6 个模块
（react / react/jsx-runtime / react-dom / react-dom/client / @deepseek-ai/cordis / zod）。

---

## 2. API 层（`api/`）

- 按领域拆分：`auth`（扫码）、`account`（登录态 / 我的 / Cookie 登录 / 退出）、`user`（关注 / 粉丝 / 关注操作）、
  `playlist`（歌单详情）、`song`（搜索 / 播放地址 / 推荐）、`artist`（歌手 / 专辑 / MV）、`settings`（插件设置）。
  统一从 `api/index.ts` 出口导出。
- 只定义「入参 / 出参」，请求细节（解包宿主 Envelope `{ ok, value }` / `{ ok:false, error }`）统一在
  `utils/request.ts` 完成，网络错误 / 非 JSON / 业务错误都归一成 `ApiError`。
- 路径由各文件的 `*ApiPath` enum 提供，字符串必须与宿主 `HostApiPath` 一致（HTTP 契约）。

---

## 3. 通用基础组件（`components/base/`）

原则：**同一视觉/交互只实现一次**，业务组件通过 `scene` / `size` / `variant` / `footer` 插槽等区分场景。

| 组件 | 职责与设计要点 |
|---|---|
| `NcmPopover` | 通用锚定浮层：无遮罩、不占屏，只提供 z-index / 关闭行为（点外部、Esc，可关）；定位交给使用方 className/style。所有下拉 / 气泡都基于它。与 `NcmModal` 的区别：Modal 是全屏遮罩+居中对话框。 |
| `NcmModal` | 通用弹窗：点遮罩关闭、Esc 关闭、统一动画/圆角/阴影，z-index 全局分配。关闭时返回 `null`，打开时才挂载内层，从而每次 open 都重新分配递增 z-index。 |
| `NcmDrawer` | 通用抽屉：从边缘滑出（left/right，默认 right），能力与 Modal 对齐。 |
| `NcmConfirmModal` / `NcmConfirmPopover` | 二次确认：破坏性操作（取关、移除、删除）统一走这里。Modal 版居中；Popover 版就近行内提示。 |
| `NcmHintPopover` | hover 触发的轻量提示浮层（不占屏、无遮罩）；显隐由 hover 驱动，故关闭点击外部 / Esc。 |
| `NcmPlayButton` | 统一播放按钮，`scene` 分三态：`player`（播放栏，常显）/ `cover`（封面，父级 hover 才显现）/ `row`（表格行内小按钮）。显隐交给场景 CSS，状态（playing/loading/disabled）由 props 传入。 |
| `NcmImage` | 通用图片：空 src / 加载失败兜底、懒加载；`variant` 决定兜底图（avatar/playlist/song/player）。头像、封面等都基于它。 |
| `NcmCoverCard` | 通用封面卡片（歌单/专辑共用），底部文案用 `footer` 插槽由调用方决定。 |
| `NcmSongTable` | 通用歌曲表格（歌单/歌手/专辑弹窗共用），列按场景开关（`showArtist` / `showAlbum`）。 |
| `NcmTags`（`NcmVipTag`/`NcmSvipTag`/`NcmNoCopyrightTag`/`NcmSongTag`） | 统一标签：会员 / 超级会员 / 无版权。`size` 区分尺寸；保留 legacy 样式备用。会员标签表示「歌曲需要会员」，与账号是否会员无关；`hasVip` 参数已废弃不再读取。 |
| `NcmPlayingBars` | 「正在播放」波动线条，替代队列序号；暂停时静止并降透明度。 |
| `NcmToast` | 轻提示，z-index 全局分配。 |
| `NcmErrorBoundary` | 面板级渲染错误兜底，见 §9.1。 |
| `NcmSkeleton` | 页面级加载骨架屏，见 §9.4。 |
| `NcmLogo` / `section-header` / `icons` | Logo、分区标题栏、内联 SVG 线条图标（currentColor，跟随主题）。性别图标的天蓝/粉红语义配色放在 `icons.css`。 |

---

## 4. 播放器引擎（`player/engine.ts`）

- **模块级单例**：`HTMLAudioElement` 与播放状态放在模块作用域而非组件里。原因：dsh「main」插槽切页面时可能卸载
  React 组件，放模块级可让音频不被卸载、跨页面继续播放；多组件（我的/首页/播放栏）共享同一状态。
  刷新/关闭标签时模块作用域销毁，音乐自然停止（普通 HTMLAudioElement，非 Web Audio）。
- **状态**：`createStore` 维护 `NcmPlayerStateVO`，`getPlayerState` / `subscribePlayer` 供 `useNcmPlayer` 订阅。
- **audio 归属标识与清理**：创建的 audio 打上 `data-dsh-netease-music-audio` 属性。每次创建新 audio **前**先按该属性
  清掉页面上残留的本插件 audio（HMR / 模块重载会留下旧节点，导致重复播放/声音叠加），保证同一时刻只有一个。
- **loadAndPlay**：只有真正拿到播放地址并 `play()` 成功后才切换 `current`；目标歌曲因版权/VIP 不可播时，旧歌继续播放，
  避免「播放条显示下一首、实际还在放上一首」。
- **评论数拉取**：best-effort，失败保持 null；因为请求发起时 `current` 可能还是上一首，判断「是否串歌」必须 await 后再读一次 `current`。
- **切换音质**：只持久化设置并更新状态；当前有歌时按新音质重新取地址、从当前进度继续，上游不支持则回滚并提示。
- **与 MV 互斥**：MV 内联播放前调 `pausePlaybackIfPlaying()` 暂停音乐，避免两路声音同时响。

---

## 5. 通用 Hooks（`hooks/`）

| Hook | 说明 |
|---|---|
| `useAsync(fetcher, deps)` | 一次性请求的 data/loading/error 三态；依赖变化自动重发；卸载/变化时 `AbortController` 中断在途请求（防竞态/泄漏）；提供 `reload()`。适用于「进页面拉一份数据」，分页请用 `usePagedList`。 |
| `usePagedList(opts)` | 分页列表（第一页 + 加载更多）：deps 变化自动重置加载首页；`loadMore()` 追加；用递增序号丢弃过期响应（快速切 Tab/改关键词不串数据）；可选 `merge` 去重。 |
| `useRelationAction(opts)` | 关注/取关/移除粉丝的统一逻辑：二次确认状态、调用接口、错误/成功提示、busy 防重复点击。 |
| `usePopupZIndex()` | 浮层 z-index：挂载时从全局管理器分配序号并保持稳定。配合条件渲染实现「后弹出的永远在上面」。 |
| `useNcmPlayer()` | 订阅播放器状态，引擎变化时自动重渲染。 |

---

## 6. 工具（`utils/`）

- `z-index.ts`：全局 z-index 管理（对齐 Element Plus）。基准 2000，挂载即 +1；所有弹出层/Toast 从这里取，避免手写冲突。
- `request.ts`：浏览器侧请求封装，见 §2。
- `format.ts`：展示格式化（数字缩写、时长、日期、性别、听歌时长等）。
- `pubsub.ts`：`createStore`（可订阅状态容器）/ `createEmitter`（单向事件），供跨组件共享。
- `mv.ts`：MV 清晰度档位的纯函数（可用档位、默认档位选择）。
- `css.ts`：把接口返回的 URL 安全拼成 CSS `url("…")`（剔除引号 / 换行；见 M6 修复）。
- `logger.ts`：诊断日志（复用 `ctx.logger` + 缓冲 + 脱敏 + 导出），见 §9.2。
- `emoji.ts`：评论表情渲染，详见 [emoji-rendering.md](./emoji-rendering.md)。

---

## 7. 页面（`pages/`）

- **panel.tsx**：主面板状态机——挂载后查登录态，未登录→登录页，已登录→默认「我的」，右侧导航切「首页 / 歌手 / 我的」；
  登录/退出重新走状态判断。歌单刷新只调 `/api/ncm/playlists` 合并切片，不重拉资料/会员。
  退出登录按钮只打开二次确认弹窗（`NcmConfirmModal`），确认后才执行 `handleLogout`（清 Cookie / 停播放 / 回登录页）。
- **artist/page.tsx**：详情用 `useAsync`，三个可翻页列表（全部歌曲/专辑/MV）用 `usePagedList`，切到对应 Tab 才加载。
  头部与 Tab 栏已拆为 `ArtistHero` / `ArtistTabs`（纯展示）。点封面播放按钮=直接播放整张专辑（不弹窗）；点卡片=开专辑弹窗。
  Tab 内容区用 `key={tab}` 的包裹层，切换时重挂载并触发 `ncm-tab-in` 淡入过渡（见 §9.3）。
  切 Tab 时的滚动条抖动（骨架屏较矮导致滚动条消失/出现、宽度跳变）用 `scrollbar-gutter: stable` +
  Tab 面板 `min-height: 55vh` 解决，内容宽度与滚动区域始终稳定。
- **artist-list/page.tsx**：上游已关停「歌手分类浏览」（`area/type/cat` 被忽略、`initial` 传字母 400、`top` 限 100），
  故改为「热门榜 + 首字母/关键词走 cloudsearch type=100 分页检索」；搜索 300ms 防抖。
- **login/page.tsx**：扫码流程（start→每 2s 轮询 check→waiting/scanned/expired/confirmed），曾提供「Cookie 登录」备用入口（已注释，需含 MUSIC_U）。扫码面板 UI 拆为 `QrPanel`。
- **mine/page.tsx**：Hero（头像/会员/性别/等级/关注粉丝/签名）+ 搜索框 + 我的歌单/收藏网格；Hero 拆为 `MineHero`。
  背景氛围层 `ncm-mine__bg`（模糊封套 + 红色光晕）的子元素用 `background-color` + `background-image`
  分写，避免简写把底色重置成透明导致断层（见 [shell-interop.md](./shell-interop.md) §3）。
- **playlist/page.tsx**：左侧歌单导航 + 右侧信息/播放全部/歌曲表；歌曲用 `useAsync` 加载。（分享/下载入口暂未实现，已注释。）
- **home/page.tsx**：首页发现音乐（推荐歌单 + 新歌速递），数据用 `useAsync`。

---

## 8. 样式（`styles/` 与组件私有 css）

- 设计 token 唯一来源见 `styles/tokens.css`（同时挂 `.ncm-panel` 与 `.ncm-settings`）；动效节奏 token
  （`--ncm-motion-*`）也在这里，**不挂 `:root`**——插件样式被注入 dsh 宿主页面，挂 `:root` 会污染全局。
- 所有 `@keyframes` 与 reduced-motion 降级集中在 `styles/motion.css`（见 §9.3）。
- 共享控件皮肤 `.ncm-btn` / `.ncm-btn--accent` / `.ncm-btn--danger` / `.ncm-icon-btn`；工具类
  `.ncm-ellipsis` / `.ncm-empty-state`。
- **滚动条外观统一**：所有可滚动的容器都挂 `ncm-scroll` 类，规则集中在 `styles/scroll.css`。
  dsh 壳子的 `dsh-client-ui-theme` 已经为整个 Web 界面注入了全局滚动条规则
  （`::-webkit-scrollbar` 系列：5px 胶囊、中性灰、随主题自动切换），**插件的容器直接继承
  这套外观，不再自己写 `::-webkit-scrollbar` 规则（避免叠层）**。`ncm-scroll` 只做两件事：
  `overflow: auto` 把容器切到自定义滚动条模式；给 Firefox 补 `scrollbar-width: thin` +
  `scrollbar-color` 兜底。槽区背景透明，未滚动时由滚动容器自己的 background 填充，
  **不会与业务内容区产生颜色断层**。机制与壳子交互细节见 [shell-interop.md](./shell-interop.md)。
- 共享样式通过 `index.ts` 置顶引入，保证组件样式能覆盖共享类。

---

## 9. 全局机制

这一节汇总跨页面 / 跨组件的系统性机制：异常与错误处理、日志、过渡动画、加载动画。
设计原则：**不引入全局单例式的"总线"或窗口级钩子**——插件跑在 dsh 壳子里，能收口到入口和几层
已有抽象的，就不要挂到 `window` 上，避免与壳子或其它插件互相干扰。

### 9.1 全局异常处理与错误处理

**异常处理 = 渲染期兜底**，只有一层：`components/base/error-boundary.tsx`。

- 在 `index.ts` 注册主面板时用 `NcmErrorBoundary` 包住 `NcmPanel`；`getDerivedStateFromError` 捕获渲染异常，
  渲染复用 `ErrorPage`（文案 + "重新加载"按钮；点击重试只清 boundary 的 state，不整页刷新）。
- `componentDidCatch` 把 `error.message` + `stack` + React 的 `componentStack` 写进诊断日志（见 §9.2）。
- **不注册 `window.onerror` / `unhandledrejection`**：壳子自身通常已有全局钩子，重复挂会互相干扰；
  捕获到也没有统一的展示位。错误入口收敛在 ErrorBoundary 与请求层。

**错误处理 = 分层收敛**，各层职责：

| 层 | 行为 |
|---|---|
| `utils/request.ts` | 网络错误 / 非 JSON / 业务失败一律归一成 `ApiError(code, message)`；同时记日志（只记 pathname） |
| `panel.tsx` | 面板级状态机 `booting / guest / member / error`：`ncm/not-logged-in` → 登录页，其它 → `ErrorPage` + `errorText`；`bootSeq` 丢弃过期启动响应 |
| `playerNotice` emitter | 播放失败 / 版权 / 会员 / 音质切换等跨组件提示由引擎发布，panel 统一订阅后转成 Toast |
| hooks | `useAsync` 的 `error`、`usePagedList` 的 `failed` 各自维护局部失败态，由页面决定怎么渲染 |
| `constants/message.ts` | "请稍后重试"类文案统一收口；具体动作名用 `retryMessage('评论加载失败')` 拼接，避免散落字面量 |
| 宿主侧对应 | `routes/shared.ts` 的 `run()` + `toFailure()` 统一把领域异常翻成 Envelope（401 / 400 / 502），未知异常只给通用文案、原文只进日志，详见 [host-architecture.md](./host-architecture.md) |

### 9.2 全局日志管理与用户导出

日志层在 `utils/logger.ts`。定位：**复用 dsh 的 `ctx.logger`，不另起一套输出系统**。

- 当前安装的 DSH 里，浏览器侧 `apply(ctx)` 拿到的是完整 Cordis Context，`ctx.logger(name)` 提供
  `error / warn / info / debug` 和格式化输出。插件在 `apply()` 里调 `initLogger(ctx)`，把
  `ctx.logger(PLUGIN_ID)` 接进来当输出 sink。老版本 dsh 没有 logger 时静默退回只缓冲。
- `ctx.logger` 是 fire-and-forget，**插件拿不到历史记录、也没有导出 API**。所以外面只包了一层：
  内存环形缓冲（300 条）+ 脱敏 + 导出。两者职责：

  | | `ctx.logger` | 本层新增 |
  |---|---|---|
  | 输出 | dsh 控制台 / 诊断通道，带分级 | 转发给上面的 sink |
  | 历史 | 拿不到 | 最近 300 条环形缓冲 |
  | 导出 | 无 | JSON 下载 / 复制到剪贴板 |
  | 脱敏 | 不认识业务字段 | 自动改写 `MUSIC_U` / `__csrf` / `token` / `Cookie` |

**记录的内容**（关键路径埋点，不是全量日志）：

| 级别 | 位置 | 内容 |
|---|---|---|
| warn | `utils/request.ts` | 网络错误（pathname + 异常 message）、非 JSON 响应（状态码）、接口业务失败（code + message） |
| info | `panel.tsx` | 登录成功（userId） |
| error | `panel.tsx` | 面板启动 / 刷新失败（code + message） |
| error | `error-boundary.tsx` | 渲染异常（message + stack + componentStack） |
| error | `player/engine.ts` | audio 元素 error（只有"是否有 src"的布尔值） |
| warn | `player/engine.ts` | 播放失败（songId + message） |

**明确不记录**：请求 body / header / Cookie；query 字符串（搜索词等隐私，只留 pathname）；完整音源 URL；
用户操作与页面切换；各组件静默 `catch {}` 里的错误（评论、关系弹窗、专辑弹窗、`refreshPlaylists` 等）。
宿主侧（Node）的日志走 dsh 的 `ctx.logger`，**不在**这个导出里。

**导出格式与安全**：`{ plugin, exportedAt, userAgent, records: [{ ts, level, scope, message }] }`；
每条序列化后截断到 800 字符；敏感值替换为 `***`。设置面板（`components/common/settings.tsx`）提供
"导出诊断日志"和"复制日志"两个入口（复制用于下载被环境拦截时的兜底）。

### 9.3 全局过渡动画

- 所有 `@keyframes` 集中在 `styles/motion.css`，由 `styles/index.css` 在 `tokens.css` 之后引入；
  组件 css 只写 `animation: <名称> var(--ncm-motion-...)`，不再各自定义动画。
- 节奏变量 `--ncm-motion-fast / normal / slow / ease` 定义在 `tokens.css` 的
  `.ncm-panel, .ncm-settings` 上（见 §8），不挂 `:root`。
- **页面切换过渡**：给页面根元素 `.ncm-home` / `.ncm-mine` / `.ncm-artist` / `.ncm-playlist-detail` /
  `.ncm-artist-list` / `.ncm-login` 加 `ncm-page-in`（淡入 + 上移 6px，220ms）。这些页面本来就是条件渲染，
  切换时自然重新挂载触发动画；**不给容器加 `key` 强制重挂载**，以免丢失页面内部状态（滚动位置、展开状态等）。
  注意：从对话区切到主面板时的**左右滑入**是 dsh 壳子自带的 Web Animations 动画（插件无法控制），
  此处淡入是叠加效果，见 [shell-interop.md](./shell-interop.md) §2。
- `@keyframes` 在 CSS 规范里天然是全局的，无法按选择器隔离；所有名称统一 `ncm-` 前缀避免与壳子撞名。
- `prefers-reduced-motion: reduce` 的降级也集中在 `motion.css` 一个 media query 里，关掉页面过渡、
  Modal / Drawer / Toast、spinner、骨架呼吸等全部动画。

### 9.4 全局加载动画

按粒度分三层，不引入全局 Loading 遮罩：

- **启动加载**：`panel.tsx` 的 `phase === 'booting'` → `pages/loading/page.tsx`（旋转唱片 + 文案）。
- **页面加载**：统一用骨架屏。共享 `components/base/skeleton.tsx`（`rows` 行数 / `cover` 是否带封面占位 /
  `variant="grid"` 封面卡片网格），歌手详情页、歌单详情页、歌手列表页用它替代"正在加载…"文字；
  歌手页三个分页 Tab（全部歌曲 / 专辑 / MV）的首屏加载也用它（歌曲用 list，专辑/MV 用 grid）；
  首页推荐与搜索弹层用各自的骨架样式；分页的"加载更多"仍用行内文字提示，属于追加而非整页加载。
- **控件级 loading**：保留现状。`NcmPlayButton` 的 `loading` 显示 spinner 并禁用点击；
  评论抽屉 / 关系弹窗 / 专辑弹窗 / 二维码面板等用组件自己的"加载中…"文案。
- 图片加载失败由 `NcmImage` 的 `failed` state 切兜底图，`src` 变化时重置（见 §3）。
