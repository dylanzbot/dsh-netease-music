/* 插件错误页。 */

/** 错误页 props。 */
export interface ErrorPageProps {
  readonly message: string
  readonly onRetry: () => void
}

/** 错误页。 */
export default function ErrorPage({ message, onRetry }: ErrorPageProps) {
  return (
    <div className="ncm-fatal">
      <div className="ncm-fatal__card">
        <h2>音乐空间暂时打不开</h2>
        <p>{message}</p>
        <button type="button" className="ncm-fatal__retry" onClick={onRetry}>
          重新加载
        </button>
      </div>
    </div>
  )
}
