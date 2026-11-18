/**
 * 登录相关路由。
 *
 * 只做三件事：
 *   1. 解析浏览器请求参数；
 *   2. 调 services/auth.service.ts；
 *   3. 用 utils/response.ts 的 Envelope 包一层返回。
 *
 * @module @dylanzbot/dsh-netease-music/host/routes/auth
 */

import type { Logger } from '../../types/cordis.js'
import { HostApiPath } from './paths.js'
import { ERROR_CODE_QR_EXPIRED } from '../../constants/error-code.js'
import { HTTP_STATUS_GONE } from '../../constants/http.js'
import { checkQrLogin, startQrLogin } from '../services/auth.service.js'
import { QrSessionExpiredError } from '../error/index.js'
import { fail, ok } from '../utils/response.js'
import { badRequest, getRoute, postRoute, run, type HostRoute } from './shared.js'

/** 组装登录路由。 */
export function createAuthRouter(logger: Logger): HostRoute[] {
  return [
    postRoute(HostApiPath.QrStart, () => run(logger, 'qr-start', async () => ok(await startQrLogin()))),
    getRoute(HostApiPath.QrCheck, (request) => {
      const key = new URL(request.url).searchParams.get('key') ?? ''
      if (key === '') return badRequest('缺少 key 参数')
      return run(logger, 'qr-check', async () => {
        try {
          return ok(await checkQrLogin(key))
        } catch (error) {
          // 扫码会话过期是业务约定：410 + 专用错误码，其余交给 run() 统一翻译。
          if (error instanceof QrSessionExpiredError) {
            return fail(ERROR_CODE_QR_EXPIRED, error.message, HTTP_STATUS_GONE)
          }
          throw error
        }
      })
    }),
  ]
}
