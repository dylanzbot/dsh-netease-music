/* 登录页（未登录状态下的首页）。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ERROR_CODE_QR_EXPIRED } from '../../../constants/error-code.js'
import { QR_STATE } from '../../../constants/qr.js'
import { checkQrLogin, startQrLogin } from '../../api/auth.api.js'
// Cookie 登录已注释（暂只保留扫码）；恢复时取消下一行注释：
// import { loginWithCookie } from '../../api/account.api.js'
import { ApiError } from '../../utils/request.js'
import { NcmLogo } from '../../components/base/logo.js'
import { QrPanel, type LoginPhase, type ScannedProfile } from '../../components/login/qr-panel.js'
import './page.css'

/** 登录方式：仅扫码。Cookie 登录（备用方案）已注释，见下方相关代码块。 */
// type LoginMode = 'qr' | 'cookie'

/** 轮询间隔：2 秒。 */
const POLL_INTERVAL_MS = 2000

/** 各状态下的提示文案。 */
const STATUS_TEXT: Record<LoginPhase, string> = {
  loading: '正在获取二维码…',
  waiting: '请用网易云音乐 App 扫码。',
  scanned: '已扫码，请在手机上确认。',
  expired: '请刷新，二维码已过期。',
  confirmed: '登录成功。',
  error: '二维码获取失败，请刷新重试。',
}

/** 登录页 props。 */
export interface LoginPageProps {
  /** 扫码确认成功后的回调：由 panel 重新拉取登录态并切到「我的」。 */
  readonly onLoggedIn?: () => void
}

/** 登录页。 */
export default function LoginPage({ onLoggedIn }: LoginPageProps) {
  // mode 状态已注释（仅扫码）：const [mode, setMode] = useState<LoginMode>('qr')
  const [phase, setPhase] = useState<LoginPhase>('loading')
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [scannedProfile, setScannedProfile] = useState<ScannedProfile | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  // Cookie 登录相关 state（已注释，保留以便恢复）：
  // const [cookieInput, setCookieInput] = useState('')
  // const [cookieBusy, setCookieBusy] = useState(false)
  // const [cookieError, setCookieError] = useState<string | null>(null)
  const keyRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const successTimerRef = useRef<number | null>(null)

  /** 停掉当前轮询定时器。 */
  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /** 轮询一次扫码结果。 */
  const pollOnce = useCallback(
    async (controller: AbortController) => {
      const key = keyRef.current
      if (key === null) return
      try {
        const result = await checkQrLogin(key, controller.signal)

        if (result.state === QR_STATE.SCANNED) {
          setPhase(QR_STATE.SCANNED)
          setScannedProfile({
            nickname: result.nickname ?? '',
            avatarUrl: result.avatarUrl ?? '',
          })
          return
        }

        // 非 scanned 状态（waiting / expired / confirmed / error）都要清掉
        // 头像昵称：用户取消登录后回到 waiting，二维码界面重新可见。
        setScannedProfile(null)

        if (result.state === QR_STATE.WAITING) {
          setPhase(QR_STATE.WAITING)
          return
        }
        if (result.state === QR_STATE.EXPIRED) {
          stopPolling()
          setPhase(QR_STATE.EXPIRED)
          return
        }
        if (result.state === QR_STATE.CONFIRMED) {
          stopPolling()
          setPhase(QR_STATE.CONFIRMED)
          // 稍等一下让「登录成功」的状态可见，再交给 panel 切页。
          successTimerRef.current = window.setTimeout(() => onLoggedIn?.(), 700)
          return
        }
        stopPolling()
        setErrorText(result.message ?? null)
        setPhase(QR_STATE.ERROR)
      } catch (caught) {
        if (controller.signal.aborted) return
        // 会话过期由宿主用 410 + code 标出；其余网络抖动保持当前状态，下一轮重试。
        if (caught instanceof ApiError && caught.code === ERROR_CODE_QR_EXPIRED) {
          setScannedProfile(null)
          stopPolling()
          setPhase(QR_STATE.EXPIRED)
        } else {
          setErrorText(caught instanceof Error ? caught.message : null)
        }
      }
    },
    [onLoggedIn, stopPolling],
  )

  /** 发起一次新的扫码登录（首次进入 / 过期刷新都走这里）。 */
  const begin = useCallback(async () => {
    stopPolling()
    if (successTimerRef.current !== null) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPhase('loading')
    setQrImage(null)
    setScannedProfile(null)
    setErrorText(null)
    keyRef.current = null

    try {
      const started = await startQrLogin(controller.signal)
      if (controller.signal.aborted) return
      keyRef.current = started.key
      setQrImage(started.qrImage)
      setPhase(QR_STATE.WAITING)
      timerRef.current = setInterval(() => {
        void pollOnce(controller)
      }, POLL_INTERVAL_MS)
    } catch {
      if (controller.signal.aborted) return
      setPhase(QR_STATE.ERROR)
    }
  }, [stopPolling, pollOnce])

  // 首次进入发起登录；卸载时停轮询、取消在途请求。
  useEffect(() => {
    void begin()
    return () => {
      stopPolling()
      abortRef.current?.abort()
      if (successTimerRef.current !== null) clearTimeout(successTimerRef.current)
    }
  }, [begin, stopPolling])

  /* Cookie 登录相关逻辑已注释（暂只保留扫码），保留以便恢复：

  /** 切换扫码 / Cookie 登录。 *\/
  const switchMode = (next: LoginMode) => {
    setMode(next)
    setCookieError(null)
    if (next === 'cookie') {
      stopPolling()
      abortRef.current?.abort()
    } else {
      void begin()
    }
  }

  /** 提交手动 Cookie。 *\/
  const submitCookie = async () => {
    if (cookieInput.trim() === '' || cookieBusy) return
    setCookieBusy(true)
    setCookieError(null)
    try {
      await loginWithCookie(cookieInput.trim())
      onLoggedIn?.()
    } catch (error) {
      setCookieError(error instanceof Error ? error.message : 'Cookie 登录失败，请检查后重试')
    } finally {
      setCookieBusy(false)
    }
  }

  */

  return (
    <div className="ncm-login">
      <div className="ncm-login__card">
        {/* 左侧品牌区：光线和 Logo 都挂在同一个旋转动画上，不额外套容器。 */}
        <aside className="ncm-login__art" aria-hidden="true">
          <NcmLogo />
        </aside>

        <section className="ncm-login__main" aria-labelledby="ncm-login__title">
          <h1 id="ncm-login__title" className="ncm-login__title">
            网易云音乐
          </h1>

          <p className="ncm-login__caption">扫码登录</p>
          {/* 原：{mode === 'qr' ? '扫码登录' : 'Cookie 登录'} —— Cookie 登录已禁用 */}

          <QrPanel
            phase={phase}
            qrImage={qrImage}
            scannedProfile={scannedProfile}
            errorText={errorText}
            statusText={STATUS_TEXT}
            onRefresh={() => void begin()}
          />

          {/* Cookie 登录 UI 已注释（暂只保留扫码），保留以便恢复：
          {mode === 'cookie' ? (
            <div className="ncm-login__cookie">
              <textarea
                className="ncm-login__cookie-input"
                value={cookieInput}
                onChange={(event) => setCookieInput(event.target.value)}
                placeholder="MUSIC_U=...; __csrf=..."
                rows={5}
                spellCheck={false}
                aria-label="网易云 Cookie"
              />
              {cookieError !== null ? <p className="ncm-login__cookie-error">{cookieError}</p> : null}
              <button
                type="button"
                className="ncm-login__cookie-submit ncm-btn ncm-btn--accent"
                disabled={cookieInput.trim() === '' || cookieBusy}
                onClick={() => void submitCookie()}
              >
                {cookieBusy ? '验证中…' : '登录'}
              </button>
              <p className="ncm-login__cookie-help">
                在 music.163.com 登录后，F12 → Network → 任意请求 → Request Headers → Cookie，
                复制整串（必须包含 MUSIC_U）。
              </p>
            </div>
          ) : null}
          */}

          {/* Cookie 登录切换按钮已注释：
          <button type="button" className="ncm-login__switch" onClick={() => switchMode(mode === 'qr' ? 'cookie' : 'qr')}>
            {mode === 'qr' ? '扫码遇到 8821？使用 Cookie 登录' : '返回扫码登录'}
          </button>
          */}
        </section>
      </div>
    </div>
  )
}
