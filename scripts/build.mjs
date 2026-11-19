#!/usr/bin/env node
/**
 * ============================================================================
 * @dylanzbot/dsh-netease-music 构建脚本（一个脚本同时产出「宿主侧」和「浏览器侧」）
 * ============================================================================
 *
 * @module @dylanzbot/dsh-netease-music/scripts/build
 */
import { build, globalLogger } from 'tsdown'
import { CssPlugin } from '@tsdown/css'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, watch } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PKG_DIR = process.cwd()
const WATCH = process.argv.includes('--watch')
const pkg = JSON.parse(await readFile(join(PKG_DIR, 'package.json'), 'utf8'))
const ID = pkg.name

/**
 * dsh Web 壳子冻结进 module table 的「共享模块白名单」。
 *
 * 依据：官方仓库 `packages/client/modules/README.zh.md` 的「共享模块」一节。
 * 浏览器 bundle 里出现这 6 个模块的裸 import 时，必须保留为 external，让 dsh
 * 壳子的 factory(require) 在运行时提供；出现白名单外的裸 import，则必须打进
 * bundle（否则运行时 require 不到）。白名单内容就是 dsh 壳子冻结的那 6 个：
 *   - react / react/jsx-runtime / react-dom / react-dom/client
 *        —— React 全家桶，壳子冻结进去给插件复用，避免每个插件各带一份 React。
 *   - @deepseek-ai/cordis —— Cordis 框架本体（插件三件套 name/inject/apply 的
 *        宿主框架）。
 *   - zod —— 配置/数据校验库，dsh 官方把它的可用性冻结进了壳子。
 */
const BROWSER_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  'zod',
]

function keepExternal(specifier) {
  return BROWSER_EXTERNALS.includes(specifier)
}

/**
 * 创建 @tsdown/css 插件实例（浏览器侧专用）。
 */
function dshCssPlugin() {
  return CssPlugin(
    { css: { minify: true, fileName: 'style.css' } },
    { logger: globalLogger },
  )
}

/**
 * ============================================================================
 * 核心后处理：把 lib/style.css 内联进 lib/client.js 的 factory 闭包。
 * ============================================================================
 */
async function inlineCssIntoFactory() {
  const stylePath = join(PKG_DIR, 'lib/style.css')
  const clientPath = join(PKG_DIR, 'lib/client.js')
  if (!existsSync(stylePath) || !existsSync(clientPath)) return

  const cssText = readFileSync(stylePath, 'utf8')
  let js = readFileSync(clientPath, 'utf8')

  // tagId 是注入的 <style> 标签的唯一标识，格式和官方 styleInjectionModule 一致：
  // `<插件ID>/style.css`。后面用 data-plugin-css 属性标记，做「避免重复注入」用。
  const tagId = `${ID}/style.css`

  // -------------------------------------------------------------------------
  // 生成注入器 JS。注意：下面几行是「用 JS 字符串生成 JS 代码」，所以有两层：
  //   - 外层是构建脚本（现在跑的 .mjs）；
  //   - 内层是写进 client.js 后、将来在浏览器里跑的那段代码。
  // 模板字符串里的 ${...} 会在「构建时」被求值并烘焙成字面量；
  // 没有 ${...} 包裹的文本会原样成为浏览器代码。
  // -------------------------------------------------------------------------
  const injector = [
    // 浏览器代码里的注释，标记这段注入器是构建脚本自动生成的。
    `// [${ID}] auto-generated CSS injector (from @tsdown/css output)`,
    `var css = ${JSON.stringify(cssText)};`,
    `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(${JSON.stringify(tagId)}) + ']') === null) {`,
    `  var tag = document.createElement('style');`,
    `  tag.dataset.plugin = ${JSON.stringify(ID)};`,
    `  tag.dataset.pluginCss = ${JSON.stringify(tagId)};`,
    `  tag.textContent = css;`,
    `  document.head.appendChild(tag);`,
    `}`,
  ].join('\n')

  js = js.replace(/require\(["']\.{1,2}\/style\.css["']\);?/g, '/* css inlined */')

  // 把注入器插到 factory 闭包开头。
  // tsdown 在 CJS 模式下生成的 intro 是：var module = { exports: {} }; module.exports;
  // 第二句 `module.exports;` 是无赋值表达式（无害），拿它当锚点，把注入器
  // 插到它后面，保证 CSS 变量在 factory 一进来就声明好。
  const anchor = 'module.exports;'
  const anchorIdx = js.indexOf(anchor)
  if (anchorIdx !== -1) {
    // 找到锚点：把 JS 切成「锚点之前 + 锚点本身」，中间夹进注入器，再接上剩余部分。
    js = js.slice(0, anchorIdx + anchor.length) + '\n' + injector + '\n' + js.slice(anchorIdx + anchor.length)
  } else {
    // 兜底路径：如果 tsdown 升级后 intro 形状变了、锚点找不到了，就退而求其次，
    // 定位 `factory: (require) => {`，把注入器插到它的第一个 `{` 之后。
    // 这样即使锚点失配，CSS 依然能进 factory，不会让整次构建静默失败。
    const factoryStart = js.indexOf('factory: (require) => {')
    if (factoryStart !== -1) {
      const insertAt = js.indexOf('{', factoryStart) + 1
      js = js.slice(0, insertAt) + '\n' + injector + '\n' + js.slice(insertAt)
    }
  }

  await writeFile(clientPath, js)

  // 删掉独立的 style.css（内容已打进 client.js，留着反而会让 @tsdown/css 下次构建时把它当成旧产物）。
  const { unlink } = await import('node:fs/promises')
  await unlink(stylePath).catch(() => {})
}

/**
 * ============================================================================
 * 浏览器侧构建配置：lazy-CJS 工厂 + CSS 自动注入。
 * ============================================================================
 *
 * 这个配置对象完整描述了「浏览器 bundle 应该长什么样」。整体形状照搬官方
 * clientBundle 预设，只是这里用 tsdown 公开选项逐项写出来。
 */
const clientConfig = {
  name: `${ID}/client`,
  entry: { client: join(PKG_DIR, 'src/client/index.ts') },
  outDir: join(PKG_DIR, 'lib'),
  // 输出格式：cjs。为什么不是 esm？因为最终产物是 dsh 壳子加载的「经典脚本」，
  // 脚本内部要靠 `var module = { exports: {} }` 这套 CJS 形状 + 结尾
  // `return module.exports` 把插件三件套交出去。官方 clientBundle 用的也是 cjs。
  format: 'cjs',
  platform: 'browser',
  // 浏览器侧不在这里出 .d.ts（类型由 emitTypes() 统一用 tsc 产出），关掉以提速。
  dts: false,
  clean: false,
  sourcemap: true,
  jsx: 'react-jsx',
  deps: {
    neverBundle: keepExternal,
    alwaysBundle: (specifier) => !keepExternal(specifier),
  },
  // CSS 编译插件：@tsdown/css（内部 lightningcss）。配合 splitting: false（默认）
  // 产出单个 style.css，再由 inlineCssIntoFactory() 内联。
  plugins: [dshCssPlugin()],
  outputOptions: {
    // 输出文件名固定为 client.js。package.json 的 exports["./client"] 指向
    // ./lib/client.js，所以名字不能带 hash，也不能变。
    entryFileNames: 'client.js',
    // 万一出现代码分割（当前 splitting: false 不会有），chunk 命名规则也定死，
    // 避免生成浏览器加载不到的文件名。
    chunkFileNames: 'client.[name].js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
}

/**
 * ============================================================================
 * 宿主侧构建配置：Node ESM，一文件一模块（不 bundle）。
 * ============================================================================
 */
const hostConfig = {
  name: `${ID}/host`,
  outDir: join(PKG_DIR, 'lib/host'),
  // 输出格式：esm。宿主侧跑在 Node 里，package.json 的 "type": "module"
  // 声明了整包是 ESM，所以这里必须输出 ESM。
  format: 'esm',
  platform: 'node',
  // 宿主侧的 .d.ts 也统一交给 emitTypes()，这里关闭。
  dts: false,
  // 不 clean lib/host 目录（和浏览器侧共用 lib，不能互删）。
  clean: false,
  sourcemap: true,
  outputOptions: {
    // 关键：tsdown 默认会按格式给输出文件加扩展名（esm → .mjs）。这里强制
    // 输出 [name].js（无 .mjs 后缀），因为整包已由 package.json 声明为 ESM，
    // 且 lib/index.js wrapper 里写的是 `./host/index.js`——后缀必须对上，
    // 否则 Node 解析不到文件。
    entryFileNames: '[name].js',
  },
  deps: {
    // 宿主侧保留所有 import（相对路径 + npm 包都不打包）。这样产物是薄的
    // 转译结果，依赖关系由 Node 原生 ESM 解析器处理。
    neverBundle: () => true,
  },
}

/**
 * ============================================================================
 * 共享运行时模块构建配置：src/constants + src/utils → lib/constants + lib/utils。
 * ============================================================================
 *
 * 宿主半侧是「一文件一模块、不 bundle」，所以 host 里 `import '../constants/*.js'`
 * / `import '../utils/*.js'` 会被原样保留，必须真的在 lib/ 下产出对应 JS，
 * Node 才能解析。浏览器半侧走 clientConfig 的 alwaysBundle，这些模块会被
 * 直接打进 client.js。
 */
const sharedConfig = {
  name: `${ID}/shared`,
  outDir: join(PKG_DIR, 'lib'),
  format: 'esm',
  platform: 'node',
  dts: false,
  clean: false,
  sourcemap: true,
  outputOptions: {
    entryFileNames: '[name].js',
  },
  deps: {
    neverBundle: () => true,
  },
}

/**
 * 共享运行时模块入口枚举：把 src/constants/*.ts 和 src/utils/*.ts 逐个转成
 * lib/constants/*.js、lib/utils/*.js。和 hostEntries 一样动态枚举，新增文件
 * 不用改配置。
 */
async function sharedEntries() {
  const roots = [
    { dir: join(PKG_DIR, 'src/constants'), prefix: 'constants' },
    { dir: join(PKG_DIR, 'src/utils'), prefix: 'utils' },
  ]
  const entries = {}
  for (const { dir, prefix } of roots) {
    const files = await readdir(dir, { recursive: true })
    for (const file of files) {
      if (file.endsWith('.ts')) {
        entries[`${prefix}/${file.replace(/\.ts$/, '')}`] = join(dir, file)
      }
    }
  }
  return entries
}

/**
 * ============================================================================
 * 宿主侧入口枚举：把 src/host/*.ts 逐个转成 lib/host/*.js，不打包。
 * ============================================================================
 *
 * 宿主侧跑在 Node 里，正常 ESM import 都能解析，所以不需要 bundle，只要做 TS→JS 转译即可。
 */
async function hostEntries() {
  const hostDir = join(PKG_DIR, 'src/host')
  const files = await readdir(hostDir, { recursive: true })
  return Object.fromEntries(
    files
      .filter((f) => f.endsWith('.ts'))
      .map((f) => [f.replace(/\.ts$/, ''), join(hostDir, f)]),
  )
}

/**
 * ============================================================================
 * 类型产物：调用本地 tsc，按 tsconfig.json 产出 .d.ts。
 * ============================================================================
 *
 * tsconfig 里配了 emitDeclarationOnly + declarationDir: lib + rootDir: src，
 * 所以 `tsc -p tsconfig` 只生成 .d.ts、不生成 JS（JS 由 tsdown 出）。
 */
async function emitTypes() {
  const tsconfig = join(PKG_DIR, 'tsconfig.json')
  // 用仓库本地 node_modules/.bin/tsc，而不是 PATH 里的全局 tsc，保证版本一致。
  const tsc = join(PKG_DIR, 'node_modules/.bin/tsc')
  if (!existsSync(tsconfig) || !existsSync(tsc)) return
  try {
    execFileSync(tsc, ['-p', tsconfig], { stdio: 'inherit', cwd: PKG_DIR })
  } catch {
  }
}

/**
 * ============================================================================
 * 包入口 wrapper：lib/index.js → re-export lib/host/index.js。
 * ============================================================================
 *
 * package.json 的 main / exports 指向 lib/index.js。宿主侧真实逻辑编译在
 * lib/host/index.js，wrapper 只是把插件三件套 name / inject / apply 转发出去。
 * 这样未来宿主侧如果拆成多个模块，只需要改 wrapper 的转发内容，包的入口路径
 * 对 dsh 保持稳定不变。
 */
async function writeHostWrapper() {
  await mkdir(join(PKG_DIR, 'lib'), { recursive: true })
  await writeFile(
    join(PKG_DIR, 'lib/index.js'),
    `// Package entry: the compiled host plugin lives in ./host/index.js.
export { Config, apply, inject, name } from './host/index.js'
`,
  )
  await writeFile(
    join(PKG_DIR, 'lib/index.d.ts'),
    `// Package entry types: re-export the compiled host plugin declarations.
export { Config, apply, inject, name } from './host/index.js'
export type { Disposable, Logger, PluginConfig } from './host/index.js'
`,
  )
}

/**
 * ============================================================================
 * 一次性构建总流程：清空 lib → 宿主 → wrapper → 浏览器 → CSS 内联 → 类型。
 * ============================================================================
 */
async function buildAll() {
  await rm(join(PKG_DIR, 'lib'), { recursive: true, force: true })
  await build({ ...hostConfig, entry: await hostEntries() })
  await build({ ...sharedConfig, entry: await sharedEntries() })
  await writeHostWrapper()
  await build(clientConfig)
  await inlineCssIntoFactory()
  await emitTypes()
  console.log(`${ID}: built host + client (tsdown + @tsdown/css)`)
}

/**
 * ============================================================================
 * watch 模式（npm run dev）：先全量构建一次，然后监听源码目录增量重建。
 * ============================================================================
 */
async function watchClient() {
  await buildAll()

  let pending = false
  const rebuild = async () => {
    if (pending) return
    pending = true
    try {
      // watch 触发时只重建浏览器半侧（这是增量路径，跳过宿主和类型以提速）。
      await build(clientConfig)
      await inlineCssIntoFactory()
      console.log(`${ID}: client rebuilt ${new Date().toLocaleTimeString()}`)
    } catch (err) {
      // 重建失败只报错不退出进程，让 watch 继续监听，修好源码后会自动再触发。
      console.error(`${ID}: client rebuild failed`, err)
    } finally {
      // 无论成败都释放锁，允许下一次触发。
      pending = false
    }
  }

  // 监听 src/client、src/constants、src/utils 和 src/host（recursive: true）。
  // 说明：rebuild() 目前只重建浏览器侧；constants/utils 会被打进 client.js，
  // 所以也要监听。宿主侧改动要生效，仍需重新 `npm run build` 或重启 `npm run dev`。
  for (const dir of [
    join(PKG_DIR, 'src/client'),
    join(PKG_DIR, 'src/constants'),
    join(PKG_DIR, 'src/utils'),
    join(PKG_DIR, 'src/host'),
  ]) {
    watch(dir, { recursive: true }, () => rebuild())
  }
  console.log(`${ID}: watching src/client + src/constants + src/utils + src/host (tsdown watch)`)
}

if (WATCH) await watchClient()
else await buildAll()
