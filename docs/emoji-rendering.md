# 评论表情渲染方案（emoji）

> 模块：`src/client/utils/emoji.ts`
> 记录时间：2026-11-13
> 相关组件：`src/client/components/comment-drawer.tsx`、`comment-drawer.css`
> 关联：[upstream-notes.md](./upstream-notes.md)（上游接口现状）；原调研稿（评论 emoji / 语音）已并入本文并归档删除

---

## 1. 背景：为什么需要这张映射表

网易云评论接口（`/api/v1/resource/comments/{threadId}`）把表情以**方括号占位符**内联在纯文本里：

```
我09年的哦[呲牙]
打卡[爱心]
期末全及格了[多多捂脸]回来还愿[多多捂脸]
```

实测（扫描 8 首歌 1380 条真实评论）：

- 普通评论的结构化富媒体字段 `contentResource` / `extJson` / `expressionUrl` / `contentStickerExt` **全部为空**；
- 即使用 App 的 **eapi** 协议请求同一接口，这些字段依然为空；
- **没有稳定的公开表情列表 API**（`/api/comment/emoji/list` 等路径均 404）。

所以结论：**只能前端内置「表情名 → 图片/Unicode」映射，把 `[xxx]` 占位符替换掉。**

语音评论（`[语音]`）在网页 Cookie 体系下拿不到，本方案不处理（见调研报告）。

---

## 2. 三层解析策略

按优先级从高到低，`resolveEmoji(name)` 依次尝试：

| 优先级 | 类型 | 资源来源 | 示例 |
|---|---|---|---|
| 1 | **自定义表情直链** | 官方 Android 评论社区 `CustomEmojiMap`（`p1/p2.music.126.net` 的 jpg） | 多多捂脸、西西心动 |
| 2 | **官方 PC Web 表情图** | `https://s1.music.126.net/style/web2/emoji/emoji_{ID}@2x.png` | 爱心、呲牙、亲吻（别名→亲亲） |
| 3 | **Unicode 兜底** | 语义相近的系统 emoji 文本 | 笑哭了→😂、爆笑→🤣、庆祝→🎉 |
| 4 | **原样保留** | 都不认识时保留 `[xxx]` 原文 | `[这本不该被替换]` |

### 为什么需要第 3 层（Unicode）

网易云后续新增了大量表情，**没有公开图片资源**，例如：

- `笑哭了`、`爆笑`、`庆祝`、`偷笑`、`欣赏音乐` 等

对这些只能用语义相近的 Unicode emoji 显示（如 `笑哭了→😂`），保证"能看懂、不露原始占位符"。

### 别名层

部分占位符是官方表情的别名，需要先归一再查图：

- `亲吻` → `亲亲`（有官方图）
- `赞/棒/good` → `强`
- `红心/心/爱` → `爱心`
- `祈祷/作揖/合十` → `拜`

---

## 3. 内置数据表（4 张）

定义在 `src/client/utils/emoji.ts` 顶部：

| 常量 | 条目数 | 作用 |
|---|---|---|
| `NETEASE_EMOJI_IDS` | 60 | 官方 PC Web 表情「名称 → 图片 ID」 |
| `NETEASE_CUSTOM_EMOJI_URLS` | 23 | 多多 / 西西系列「名称 → jpg 直链」 |
| `NETEASE_EMOJI_ALIASES` | 58 | 别名「别名 → 规范名」 |
| `NETEASE_EMOJI_UNICODE` | 179 | 「名称 → Unicode」兜底 |

> 只内置「名称 → 资源」映射（纯数据约几 KB），**不打包图片**：表情图运行时由网易云官方 CDN 按需加载并走浏览器缓存，产物不增加图片体积，也不涉及把官方素材二次分发。

### 数据来源

社区长期维护、与网易云客户端一致的表情映射数据（交叉核对多份开源实现后确认一致）：

- 图 ID 表与直链：来自公开维护的表情映射数据；
- Unicode 兜底、别名表：参考 Hydrogen-Music / ZViewer 的 `neteaseEmoji` 实现。

### 关于两台已确认可用的 CDN（实测）

- `https://s1.music.126.net/style/web2/emoji/emoji_{ID}@2x.png`（本方案采用，@2x 更清晰）
- `https://s1.music.126.net/style/web2/emt/emoji_{ID}.png`（旧版，同样可用）

59 个旧表情的 ID 实测 59/59 全部返回 `200 image/png`（约 4KB/张）；多多/西西 jpg 直链实测可用。

---

## 4. API 与用法

```ts
// 解析单个表情名（不含方括号）→ 图片 URL 或 Unicode
export interface EmojiPiece {
  readonly imageUrl?: string // 有图片资源时
  readonly unicode?: string  // 无图时的 Unicode 兜底
}
export function resolveEmoji(name: string): EmojiPiece | undefined

// 把整段正文渲染成 React 节点数组
export function renderCommentContent(text: string): ReactNode[]
```

`renderCommentContent` 的规则：

- `[名称]` 有图 → `<img class="ncm-comment-item__emoji" src=... />`
- 无图但有 Unicode → 直接渲染 emoji 文本（`<span>` 语义上即文本节点）
- 都不认识 → 原样保留 `[名称]` 文本

**安全**：用 React 节点而非 `dangerouslySetInnerHTML`，纯文本天然转义，无 XSS 风险。

**降级**：图片 `onError` 时，把 `<img>` 替换成 Unicode（或原始 `[xxx]`）文本节点，离线 / CDN 异常时不会裂图。

### 组件接入（comment-drawer.tsx）

评论正文和「引用回复」内容都改用 `renderCommentContent()`：

```tsx
<p className="ncm-comment-item__content">{renderCommentContent(comment.content)}</p>
...
<span className="ncm-comment-item__quoted-name">@{comment.quoted.nickname}</span>：
{renderCommentContent(comment.quoted.content)}
```

### 样式（comment-drawer.css）

```css
.ncm-comment-item__emoji {
  display: inline-block;
  width: 18px;
  height: 18px;
  margin: 0 1px;
  vertical-align: -4px;      /* 与正文基线对齐 */
  object-fit: contain;
  border: 0;
}
```

---

## 5. 已知覆盖情况

| 表情 | 渲染结果 |
|---|---|
| 笑哭了 / 爆笑 / 庆祝 / 偷笑 / 欣赏音乐 | Unicode emoji（😂🤣🎉🤭🎧） |
| 认可 / 装可爱 | 语义兜底（👍🥰）— 公开生态无官方图，非官方原图 |
| 亲吻 | 官方「亲亲」图 |
| 爱心 / 呲牙 / 大笑 …（旧 60 项） | 官方 PC Web 图 |
| 多多捂脸 / 西西心动 …（23 项） | 官方 jpg 直链图 |
| 真正未知的 `[xxx]` | 原样保留 |

> `认可` / `装可爱` 是较新表情，公开映射数据中暂无对应图片。如需显示，可按下方维护步骤补充一个新的映射条目即可。

---

## 6. 维护：如何新增表情

1. **有官方图**：在 `NETEASE_EMOJI_IDS` 加 `名称: 'ID'`，验证 `emoji_{ID}@2x.png` 返回 200。
2. **有多多/西西类直链**：在 `NETEASE_CUSTOM_EMOJI_URLS` 加 `名称: 'https://...jpg'`。
3. **只有语义、无图**：在 `NETEASE_EMOJI_UNICODE` 加 `名称: '😀'`，并视情况在 `NETEASE_EMOJI_ALIASES` 加别名。
4. 改完 `npm run typecheck && npm run build`，刷新 dsh Web 页面即可生效（profile 为 symlink，无需重装）。

### 验证脚本思路

- 批量 `HEAD/GET` 校验图片 URL 是否 200（避免死链）；
- 用真实评论正文跑 `renderCommentContent`（或等价纯逻辑）确认切分正确、未知表情原样保留。

---

## 7. 待办 / 可选增强

- [ ] `认可`、`装可爱` 等暂无公开映射的新表情：如后续有公开数据再补充；
- [ ] 若出现高频且未收录的占位符，持续补 `NETEASE_EMOJI_UNICODE` / 别名表；
- [ ] 可选：离线场景预缓存常用表情图（当前依赖官方 CDN 在线）。
