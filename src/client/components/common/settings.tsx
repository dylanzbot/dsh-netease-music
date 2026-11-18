/* 网易云音乐插件设置面板。 */

import { useEffect, useState } from 'react'
import type { NcmSettingsDTO } from '../../../types/index.js'
import { getSettings, saveSettings } from '../../api/settings.api.js'
import { buildLogExport, downloadLogs } from '../../utils/logger.js'
import './settings.css'

/** 网易云音乐设置面板。 */
export function NcmSettingsSection() {
  const [settings, setSettings] = useState<NcmSettingsDTO | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  /** 复制诊断日志（下载被拦时的兜底）。 */
  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(buildLogExport())
      setNotice('诊断日志已复制到剪贴板')
    } catch {
      setNotice('复制失败，请改用「导出诊断日志」')
    }
  }

  useEffect(() => {
    let alive = true
    getSettings()
      .then((value) => {
        if (alive) setSettings(value)
      })
      .catch((caught) => {
        if (alive) setError(caught instanceof Error ? caught.message : String(caught))
      })
    return () => {
      alive = false
    }
  }, [])

  /** 保存开关并广播事件，让已打开的「我的」页即时更新。 */
  const toggle = async () => {
    if (settings === null || saving) return
    const next = !settings.showFollowStats
    setSaving(true)
    setError(null)
    try {
      const saved = await saveSettings({ showFollowStats: next })
      setSettings(saved)
      window.dispatchEvent(new Event('ncm-settings-changed'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ncm-settings">
      <header className="ncm-settings__head">
        <h2 className="ncm-settings__title">网易云音乐</h2>
        <p className="ncm-settings__sub">管理网易云音乐在 dsh 中的显示选项。</p>
      </header>

      <section className="ncm-settings__section">
        <div className="ncm-settings__row">
          <div className="ncm-settings__copy">
            <span className="ncm-settings__label">显示关注 / 粉丝数量</span>
            <span className="ncm-settings__desc">关闭后「我的」页面的 Hero 区域不再显示关注和粉丝数量。</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings?.showFollowStats ?? true}
            aria-label="显示关注 / 粉丝数量"
            disabled={settings === null || saving}
            className={`ncm-settings__switch${settings?.showFollowStats === true ? ' ncm-settings__switch--on' : ''}`}
            onClick={() => void toggle()}
          >
            <span className="ncm-settings__switch-thumb" />
          </button>
        </div>
        {error !== null ? <p className="ncm-settings__error">{error}</p> : null}
      </section>

      <section className="ncm-settings__section">
        <div className="ncm-settings__copy">
          <span className="ncm-settings__label">诊断日志</span>
          <span className="ncm-settings__desc">遇到问题时导出最近 300 条日志（已自动隐去 Cookie 等敏感信息），附到反馈里便于排查。</span>
        </div>
        <div className="ncm-settings__actions">
          <button type="button" className="ncm-settings__btn ncm-btn" onClick={downloadLogs}>导出诊断日志</button>
          <button type="button" className="ncm-settings__btn ncm-btn" onClick={() => void copyLogs()}>复制日志</button>
        </div>
        {notice !== null ? <p className="ncm-settings__notice">{notice}</p> : null}
      </section>
    </div>
  )
}
