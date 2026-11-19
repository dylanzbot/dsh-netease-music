# AGENTS.md

## 项目

`@dylanzbot/dsh-netease-music` 是一个双端 DeepSeek Harness（dsh）插件：

- **宿主侧**（`src/host/`）：Node ESM 的 Cordis 插件，注册 `/api/ncm/*` 路由代理网易云音乐接口，并管理本地保存的登录 Cookie。
- **浏览器侧**（`src/client/`）：React 18 侧栏面板，构建时打包成单个经典脚本供 dsh Web 壳子加载，CSS 在构建时内联进该脚本。

技术栈：TypeScript 5.9（strict、NodeNext）、React 18.3、tsdown 0.23 + @tsdown/css 0.23（rolldown 1.3）、Vitest 5.1、Node 22.19+ / 24+。

## 命令

在仓库根目录执行。改动完成前，下面四项检查都应通过。

- 全量构建：`npm run build` —— 宿主 → shared → wrapper → client → CSS 内联 → `tsc` 产出 `.d.ts` 到 `lib/`
- 构建 + 监听（仅浏览器侧）：`npm run dev`
- 类型检查：`npm run typecheck`
- 全部测试：`npm test`（30 个文件 / 256 个用例）
- 单个测试文件：`npx vitest run tests/client/format.test.ts`
- 按名称跑单个用例：`npx vitest run -t "formatCount"`
- 覆盖率：`npm run test:coverage`
- 安装进 dsh profile：`bash scripts/link-profile.sh [profile]`（默认 `web`）
- 查看将发布的包内容：`npm pack --dry-run`

## 项目结构

- `src/host/` —— Node 侧：路由、服务、API 客户端、配置/Cookie 存储。一个源文件对应一个 `lib/host/*.js`，不打包。
- `src/client/` —— 浏览器侧：React 组件、hooks、API 封装、CSS。全部打进 `lib/client.js`。
- `src/constants/`、`src/utils/`、`src/types/` —— 两端共享；`src/types/cordis.ts` 是 cordis 类型的统一入口，核心类型（`Logger` / `Disposable` / `Context`）直接复用 peer 依赖 `@deepseek-ai/cordis` 的官方声明，两端独有的 dsh 服务切片分别在 `src/types/cordis-host.ts` / `src/types/cordis-client.ts`（用 declaration merging 给官方 `Context` 补服务键）。
- `tests/client/`、`tests/host/` —— 与源码结构对应。
- `scripts/build.mjs` —— 完整构建流程；`scripts/link-profile.sh` —— 本地安装并同步 `lib/`。
- `lib/` —— 生成目录，已 gitignore。`docs/` —— 设计与发布笔记。`locale/en.json`、`icon.svg` —— 插件展示元信息。
- `.github/workflows/` —— tag 驱动的发布流程；`release-please-config.json` —— 版本管理。

## 测试

- Vitest 5.1，默认 `environment: 'node'`。需要 DOM 的测试在文件头加注释：`// @vitest-environment jsdom`。
- 测试文件位于 `tests/**/*.test.ts` / `.test.tsx`，命名对应源码，如 `src/client/utils/format.ts` → `tests/client/format.test.ts`。
- 已开启 `clearMocks` 和 `restoreMocks`，不要在用例之间手动重置 mock。
- 每次行为改动都要新增或更新测试。不要为了让套件变绿而删除或跳过失败的测试。

## 代码风格

- TypeScript strict 模式：`noUncheckedIndexedAccess`、`noImplicitOverride`、`noFallthroughCasesInSwitch` 均已开启。
- 单引号、无分号、2 空格缩进。注释和 JSDoc 用中文写。
- 优先用具名导出和小而纯的函数。保持两端边界清晰：`src/client/` 不得引入 Node 内置模块；`src/host/` 不得引入 React 或浏览器 API。
- 项目风格示例：

```ts
/** 数字缩写：12345 → 1.2万，123456789 → 1.2亿。 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value >= 10_000) return `${trimZero(value / 10_000)}万`
  return String(Math.round(value))
}
```

## 两套身份，不要混

- **包名** `@dylanzbot/dsh-netease-music`：`package.json` 的 `name`、`cordis.patch.yml` 的 `name`、浏览器 factory id（`build.mjs` 里从 `pkg.name` 派生）、CSS 的 `data-plugin` 属性。
- **插件短 id** `dsh-netease-music`：`src/constants/plugin.ts` 的 `PLUGIN_ID`、`cordis.patch.yml` 的 `id`、slots 的 id/key、宿主 `name`、日志前缀，以及 Cookie 目录 `storages/dsh-netease-music/config.json`。

两者刻意不同——dsh 的约定就是短 `id` 加 scoped `name`。改短 id 会让老用户已保存的 Cookie 失效，并让 slots 与 patch 脱钩。同理，`src/client/player/engine.ts` 里的 `QUALITY_STORAGE_KEY` 和 `data-dsh-netease-music-audio` 是持久化/DOM 键，不是包名。

## 构建与发布注意点

- `lib/` 由三个构建配置共用。`buildAll()` 开头会整目录清空一次；永远不要把单个配置的 `clean` 改成 `true`——各构建会互相删掉对方产物。
- `npm run dev` 只重建浏览器侧。宿主或 shared 模块的改动必须跑一次完整的 `npm run build`。
- 从 `lib/` 里，`files` 白名单只收 `*.js` 和 `*.d.ts`；`.map` 文件刻意不进包。
- 版本由 `release-please` 管理（在 `main` 上触发）；发布由 `v*.*.*` tag 通过 `.github/workflows/publish.yml` 触发。不要手改 `package.json` 的 `version`。

## Git 工作流

- 提交信息遵循 Conventional Commits（`feat:`、`fix:`、`chore:` 等），husky 的 `commit-msg` 钩子会校验。中文 subject 没问题——`subject-case` 和结尾句号规则已关闭。
- 从 `main` 分支开发，改动保持聚焦。tag push 会在 CI 里跑类型检查、测试、构建和发布。

## 边界

- ✅ **总是：** 改动后运行 `npm run build && npm run typecheck && npm test`；代码改动同时更新测试；改动 `files`、exports 或身份标识后运行 `npm pack --dry-run`。
- ⚠️ **先问：** 改 `PLUGIN_ID`、包名、`cordis.patch.yml`、`scripts/build.mjs` 的构建形状、`.github/workflows/` 或依赖。`package-lock.json` 只能通过 `npm install --package-lock-only` 更新。
- 🚫 **绝不：** 手改 `lib/` 或 `node_modules/` 里的任何文件；提交 Cookie、凭证或 `.env` 文件；改 Cookie 存储路径；删除失败的测试；对构建配置设 `clean: true`。
