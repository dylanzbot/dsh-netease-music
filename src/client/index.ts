/* @dylanzbot/dsh-netease-music 的浏览器半侧入口。 */

import './styles/index.css'
import { createElement } from 'react'
import { NcmPanel } from './panel.js'
import { NcmErrorBoundary } from './components/base/error-boundary.js'
import { initLogger } from './utils/logger.js'
import { NcmLogo } from './components/base/logo.js'
import { NcmSettingsSection } from './components/common/settings.js'
import { SERVICE_SLOTS } from '../constants/dsh-service.js'
import { PLUGIN_ID, PLUGIN_LABEL } from '../constants/plugin.js'
import type { ClientContext } from '../types/cordis.js'

/** 插件稳定 id（短名），必须和 `cordis.patch.yml` 的 `id` 一致；不是 scoped 包名。 */
const name = PLUGIN_ID

/** 声明本插件依赖的 dsh 服务：`slots`（壳子的 UI 插槽服务）。 */
const inject = [SERVICE_SLOTS]

/* 侧栏项和主面板共用 PLUGIN_ID（壳子据此把「点图标」对应到「切主面板」）。 */

/** 客户端配置（loader 传入），目前留空。 */
export interface ClientConfig {
  /** 预留。 */
}

/**
 * 浏览器半侧入口（dsh 等 `slots` 服务就绪后调用）。
 *
 * @param ctx - loader 传入的 context，含 `slots` 服务。
 * @param _config - 客户端配置，当前未使用。
 */
function apply(ctx: ClientContext, _config: ClientConfig = {}): void {
  // 复用 dsh 的 ctx.logger 做输出；同时开启可导出的内存缓冲。
  initLogger(ctx)
  const slots = ctx.slots

  // 旧版 dsh 可能没把 slots 传进来：静默返回，避免插件崩溃。
  if (slots === undefined || typeof slots.register !== 'function') return

  // 挂载点 1：侧栏菜单列表。
  slots.inject('sidebar.panellist', () =>
    slots.register(
      {
        name: 'sidebar.panellist', // 注册到哪个插槽
        id: PLUGIN_ID, // 侧栏项的唯一 id，和主面板的 key 配对
        order: 70, // 排序权重，越小越靠前
        label: PLUGIN_LABEL, // 悬停提示 / 无障碍标签
      },
      // 壳子会把这里返回的组件渲染成图标按钮，并自动传入 { size, active }。
      () => createElement(NcmLogo, {}),
    ),
  )

  // 挂载点 3：dsh 全局设置页的「网易云音乐」分区。
  slots.inject('settings.section', () =>
    slots.register(
      { name: 'settings.section', id: PLUGIN_ID, order: 130, label: PLUGIN_LABEL },
      () => createElement(NcmSettingsSection, {}),
    ),
  )
  slots.inject('settings.section.icon', () =>
    slots.register({ name: 'settings.section.icon', id: PLUGIN_ID }, () => createElement(NcmLogo, {})),
  )

  // 挂载点 2：中间主面板区。
  // key: PLUGIN_ID 与上面侧栏项的 id 相同；壳子因此知道「点侧栏的网易云图标
  // 时，把主面板切成 key 为 PLUGIN_ID 的这一块」。
  slots.inject('main', () =>
    slots.register(
      { name: 'main', key: PLUGIN_ID },
      () => createElement(NcmErrorBoundary, null, createElement(NcmPanel, {})),
    ),
  )
}

module.exports = {
  name,
  inject,
  apply,
}
