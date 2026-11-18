/**
 * CSS 副作用导入的统一类型声明。
 *
 * 项目里所有 `import './xxx.css'` 都复用这一份通配声明，不再为每个
 * CSS 文件单独维护 `.d.css.ts`。`tsconfig.json` 中已显式关闭
 * `noUncheckedSideEffectImports`，因此 `import './page.css'` 这类
 * 副作用导入不会触发 TS2882；实际样式由构建管线（@tsdown/css）处理。
 *
 * @module @dylanzbot/dsh-netease-music/src/types/css
 */

export {}

/** 任意 `.css` 模块说明符（副作用导入）：构建时由 @tsdown/css 接管。 */
declare module '*.css'
