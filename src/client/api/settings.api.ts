/* 插件设置接口（浏览器侧）。 */

import type { NcmSettingsDTO } from '../../types/index.js'
import { request } from '../utils/request.js'

/** 设置接口路径。 */
export enum SettingsApiPath {
  /** 读取 / 保存插件设置。 */
  Settings = '/api/ncm/settings',
}

/** 读取插件设置。 */
export function getSettings(signal?: AbortSignal): Promise<NcmSettingsDTO> {
  return request.get<NcmSettingsDTO>(SettingsApiPath.Settings, signal)
}

/** 更新插件设置（当前只有显示关注 / 粉丝开关）。 */
export function saveSettings(patch: Partial<NcmSettingsDTO>): Promise<NcmSettingsDTO> {
  return request.post<NcmSettingsDTO>(SettingsApiPath.Settings, patch)
}
