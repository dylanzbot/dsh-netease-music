/* 登录页「扫码」面板（二维码 + 扫码成功头像浮层 + 过期待刷新覆盖 + 状态提示）。 */

import { QR_STATE, type QrState } from '../../../constants/qr.js'
import { NcmImage } from '../base/image.js'
import { NcmRefreshIcon } from '../base/icons.js'

/** 登录页可见阶段：加载中 + 共享的扫码状态。 */
export type LoginPhase = 'loading' | QrState

/** 扫码后展示的用户信息（来自 /qr/check 的 802 响应）。 */
export interface ScannedProfile {
  readonly nickname: string
  readonly avatarUrl: string
}

/** 扫码面板 props。 */
export interface QrPanelProps {
  readonly phase: LoginPhase
  /** 二维码图片 data URL；null 表示尚未拿到。 */
  readonly qrImage: string | null
  readonly scannedProfile: ScannedProfile | null
  /** 二维码获取失败时的额外错误文案。 */
  readonly errorText: string | null
  /** 各状态下的提示文案。 */
  readonly statusText: Record<LoginPhase, string>
  /** 点击「刷新二维码」。 */
  readonly onRefresh: () => void
}

/** 扫码面板。 */
export function QrPanel({ phase, qrImage, scannedProfile, errorText, statusText, onRefresh }: QrPanelProps) {
  return (
    <>
      <div className={`ncm-login__qrcode ncm-login__qrcode--${phase}`}>
        {qrImage !== null ? (
          <img className="ncm-login__qrcode-img" src={qrImage} alt="网易云音乐登录二维码" />
        ) : (
          <div className="ncm-login__qrcode-loading">
            {phase === QR_STATE.ERROR ? '二维码获取失败' : '二维码加载中…'}
          </div>
        )}

        {phase === QR_STATE.SCANNED &&
        scannedProfile !== null &&
        (scannedProfile.nickname !== '' || scannedProfile.avatarUrl !== '') ? (
          <div className="ncm-login__qrcode-scanned">
            {scannedProfile.avatarUrl !== '' ? (
              <NcmImage
                className="ncm-login__scanned-avatar"
                src={scannedProfile.avatarUrl}
                variant="avatar"
                fallbackText={scannedProfile.nickname}
              />
            ) : null}
            {scannedProfile.nickname !== '' ? (
              <span className="ncm-login__scanned-nickname">{scannedProfile.nickname}</span>
            ) : null}
          </div>
        ) : null}

        {phase === QR_STATE.EXPIRED || phase === QR_STATE.ERROR ? (
          <button type="button" className="ncm-login__qrcode-refresh" onClick={onRefresh}>
            <NcmRefreshIcon size={14} />
            <span>刷新二维码</span>
          </button>
        ) : null}
      </div>

      <ul className="ncm-login__tips">
        <li className={`ncm-login__status ncm-login__status--${phase}`} role="status">
          {phase === QR_STATE.ERROR && errorText !== null ? errorText : statusText[phase]}
        </li>
        <li>登录信息只保存在本机。</li>
        <li>登录信息过期后需重新登录。</li>
      </ul>
    </>
  )
}
