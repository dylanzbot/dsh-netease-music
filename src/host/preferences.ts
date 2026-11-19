/**
 * 插件偏好（`showFollowStats`）的存储层：走 dsh 插件 Config + configEditor。
 *
 * @module @dylanzbot/dsh-netease-music/host/preferences
 */

import type { ConfigEditor, Context, Logger, PluginEntry } from '../types/cordis-host.js'
import type { NcmSettingsDTO } from '../types/index.js'
import { PLUGIN_ID } from '../constants/plugin.js'
import { readConfig, writeConfig } from './config.js'

/** 当前生效的配置编辑器与条目；undefined 表示走旧文件降级。 */
let editor: ConfigEditor | undefined
let entry: PluginEntry | undefined

/** 偏好内存快照（供同步的 getSettings 读取）。 */
let current = true

/**
 * 在 `apply` 里调用一次，用 Cordis 校验后的 Config 初始化偏好。
 * 老用户旧文件里若有一个和默认 Config 不同的值，顺手迁进 profile 配置。
 */
export function initPreferences(
  ctx: Context,
  config: { readonly showFollowStats: boolean },
  logger: Logger,
): void {
  const legacy = readConfig()
  const candidate = ctx.get('configEditor')
  const fiberEntry = ctx.fiber?.entry

  if (candidate === undefined || fiberEntry === undefined) {
    current = legacy.showFollowStats
    return
  }

  editor = candidate
  entry = fiberEntry
  current = config.showFollowStats

  if (legacy.showFollowStats !== config.showFollowStats) {
    void candidate
      .edit(fiberEntry, (raw) => ({ ...raw, showFollowStats: legacy.showFollowStats }))
      .then(() => {
        current = legacy.showFollowStats
      })
      .catch((error: unknown) => {
        logger.warn(`${PLUGIN_ID}: 迁移旧偏好失败，沿用插件 Config：${String(error)}`)
      })
  }
}

/** 读当前非敏感设置。 */
export function getSettings(): NcmSettingsDTO {
  return { showFollowStats: current }
}

/** 保存偏好；有 configEditor 时写回 profile 配置，否则降级写旧文件。 */
export async function setShowFollowStats(showFollowStats: boolean): Promise<NcmSettingsDTO> {
  const previous = current
  current = showFollowStats

  if (editor !== undefined && entry !== undefined) {
    try {
      await editor.edit(entry, (raw) => ({ ...raw, showFollowStats }))
    } catch (error) {
      current = previous
      throw error
    }
    return { showFollowStats }
  }

  try {
    writeConfig({ ...readConfig(), showFollowStats })
  } catch (error) {
    current = previous
    throw error
  }
  return { showFollowStats }
}
