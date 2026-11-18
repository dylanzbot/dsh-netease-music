/* 面板级错误边界：兜住渲染期异常，避免整块面板变白屏。 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import ErrorPage from '../../pages/error/page.js'
import { logError } from '../../utils/logger.js'

interface ErrorBoundaryState {
  readonly error: Error | null
}

/** 面板级错误边界。只包一层，错误文案与重试按钮复用 ErrorPage。 */
export class NcmErrorBoundary extends Component<{ readonly children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('render', error.message, { stack: error.stack, componentStack: info.componentStack })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error !== null) {
      return (
        <div className="ncm-panel">
          <ErrorPage message={error.message || '界面渲染失败，请重新加载'} onRetry={() => this.setState({ error: null })} />
        </div>
      )
    }
    return this.props.children
  }
}
