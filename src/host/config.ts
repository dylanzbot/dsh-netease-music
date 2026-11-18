/**
 * 登录凭证（网易云 Cookie）的本地读写。
 * 唯一落盘位置：`$DSH_HOME/storages/dsh-netease-music/config.json`；
 * 目录递归创建，文件权限 600；
 * 浏览器侧永远拿不到完整 Cookie，只由宿主侧读写。
 *
 * @module @dylanzbot/dsh-netease-music/host/config
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { PLUGIN_ID } from '../constants/plugin.js'
import type { NcmSettingsDTO } from '../types/index.js'

/** 配置文件结构。后续接搜索/播放时再扩展字段。 */
export interface NcmConfig {
  /** 网易云登录 Cookie（MUSIC_U=...; __csrf=... 等）。 */
  readonly cookie: string
  /** 是否在「我的」Hero 中显示关注 / 粉丝数量，默认 true。 */
  readonly showFollowStats: boolean
}

/** 空配置。 */
const EMPTY: NcmConfig = { cookie: '', showFollowStats: true }

/** dsh 数据目录：优先 DSH_HOME 环境变量，否则 ~/.dsh。 */
function dshHome(): string {
  const raw = process.env.DSH_HOME?.trim()
  if (raw !== undefined && raw !== '') return raw
  return join(homedir(), '.dsh')
}

/** 配置文件绝对路径。 */
export function configPath(): string {
  return join(dshHome(), 'storages', PLUGIN_ID, 'config.json')
}

/** 读配置；文件不存在或 JSON 损坏时返回空配置。 */
export function readConfig(): NcmConfig {
  const path = configPath()
  if (!existsSync(path)) return { ...EMPTY }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<NcmConfig>
    return {
      cookie: typeof parsed.cookie === 'string' ? parsed.cookie : '',
      showFollowStats: typeof parsed.showFollowStats === 'boolean' ? parsed.showFollowStats : true,
    }
  } catch {
    return { ...EMPTY }
  }
}

/** 写配置：先建目录，再写文件，最后收紧权限到 600。 */
export function writeConfig(config: NcmConfig): void {
  const path = configPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 })
  try {
    chmodSync(path, 0o600)
  } catch {
    // 某些平台 chmod 可能失败（例如特殊文件系统），忽略即可。
  }
}

/** 读当前 Cookie；未登录时返回空串。 */
export function getCookie(): string {
  return readConfig().cookie
}

/** 保存 Cookie（保留其他设置）。 */
export function setCookie(cookie: string): void {
  writeConfig({ ...readConfig(), cookie })
}

/** 读取非敏感设置。 */
export function getSettings(): NcmSettingsDTO {
  const config = readConfig()
  return { showFollowStats: config.showFollowStats }
}

/** 保存非敏感设置（保留 Cookie）。 */
export function setShowFollowStats(showFollowStats: boolean): NcmSettingsDTO {
  const config = readConfig()
  writeConfig({ ...config, showFollowStats })
  return { showFollowStats }
}
