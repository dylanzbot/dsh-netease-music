/**
 * 插件身份类常量（跨半侧一致）。
 *
 * 注意：`cordis.patch.yml` 的 `id` 和 `package.json` 的 `name` 都是配置文件，没法
 * import 这里的 JS 常量。两者现在刻意不同：
 *   - PLUGIN_ID（短 id）→ patch 的 `id`、slots、宿主 name、Cookie 落盘目录；
 *   - 包名（scoped）→ patch 的 `name`、浏览器 factory id。
 * 改 PLUGIN_ID 时同步 patch 的 `id`；改包名时同步 patch 的 `name`。
 *
 * @module @dylanzbot/dsh-netease-music/constants/plugin
 */

/** 插件稳定 id：dsh 注册、slots 绑定、cordis.patch.yml 都用它。 */
export const PLUGIN_ID = 'dsh-netease-music'

/** 插件显示名（侧栏标签 / 页面标题）。 */
export const PLUGIN_LABEL = '网易云音乐'
