/* 插件加载页。 */

/** 加载页 props。 */
export interface LoadingPageProps {
  /** 加载文案。 */
  readonly text?: string
}

/** 加载页。 */
export default function LoadingPage({ text = '正在打开你的音乐空间…' }: LoadingPageProps) {
  return (
    <div className="ncm-boot">
      <div className="ncm-boot__disc" aria-hidden="true" />
      <span className="ncm-boot__text">{text}</span>
    </div>
  )
}
