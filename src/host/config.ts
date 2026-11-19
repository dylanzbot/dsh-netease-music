/**
 * 旧版本地配置文件的读写（迁移与降级兜底用）。
 *
 * 历史行为：`$DSH_HOME/storages/dsh-netease-music/config.json` 同时存 Cookie
 * 和偏好。现在 Cookie 迁到 dsh 官方凭据 seam（`ctx.credentials`），偏好迁到
 * 插件 Config（`ctx.configEditor`）；这个文件只在两种情况下还会被用到：
 *   1. 初始化时读取老用户遗留的数据并迁移；
 *   2. 极简 profile 没有 credentials / configEditor 服务时降级兜底。
 *
 * 迁移完成后文件里的 `cookie` 会被清空，不再留存明文凭证。
 *
 * @module @dylanzbot/dsh-netease-music/host/config
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { PLUGIN_ID } from '../constants/plugin.js'

/** 旧配置文件结构（仅用于迁移 / 降级）。 */
export interface NcmConfig {
  /** 网易云登录 Cookie（迁移后恒为空串）。 */
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

/** 旧配置文件绝对路径。 */
export function configPath(): string {
  return join(dshHome(), 'storages', PLUGIN_ID, 'config.json')
}

/** 读旧配置；文件不存在或 JSON 损坏时返回空配置。 */
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

/**
 * 写旧配置时的输入形状：`cookie` 可以省略——迁移成功后会把这个键整个删掉，
 * 而不是留一个空串。`readConfig()` 对缺键按未登录处理。
 */
export type LegacyConfigInput = Omit<NcmConfig, 'cookie'> & { readonly cookie?: string }

/** 写旧配置：先建目录，再写文件，最后收紧权限到 600。 */
export function writeConfig(config: LegacyConfigInput): void {
  const path = configPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 })
  try {
    chmodSync(path, 0o600)
  } catch {
    // 某些平台 chmod 可能失败（例如特殊文件系统），忽略即可。
  }
}

/**
 * 删掉旧文件里的整个 `cookie` 键（保留偏好），避免迁移后明文凭证继续留在磁盘上。
 * 文件不存在或键本来就不存在时不写文件。
 */
export function stripLegacyCookie(): void {
  const path = configPath()
  if (!existsSync(path)) return
  const config = readConfig()
  if (config.cookie === '') return
  writeConfig({ showFollowStats: config.showFollowStats })
}
