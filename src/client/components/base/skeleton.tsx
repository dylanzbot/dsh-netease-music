/* 页面级加载骨架屏（替代「正在加载…」纯文字提示）。 */

import './skeleton.css'

/** 骨架屏布局：列表行（默认）或封面卡片网格。 */
export type NcmSkeletonVariant = 'list' | 'grid'

/** 骨架屏 props。 */
export interface NcmSkeletonProps {
  /** 行数 / 卡片数，默认 6。 */
  readonly rows?: number
  /** 列表行左侧是否显示方形封面占位（仅 list 变体）。 */
  readonly cover?: boolean
  /** 布局变体，默认 list。 */
  readonly variant?: NcmSkeletonVariant
  /** 额外 class（用于页面私有布局）。 */
  readonly className?: string
}

/** 页面级加载占位：用呼吸动画代替文字提示，避免加载完成时的布局跳变。 */
export function NcmSkeleton({ rows = 6, cover = false, variant = 'list', className }: NcmSkeletonProps) {
  return (
    <div
      className={`ncm-skeleton ncm-skeleton--${variant}${className !== undefined && className !== '' ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div className="ncm-skeleton__row" key={index}>
          {variant === 'grid' ? (
            <>
              <span className="ncm-skeleton__cover-card" />
              <span className="ncm-skeleton__line" />
            </>
          ) : (
            <>
              {cover ? <span className="ncm-skeleton__cover" /> : null}
              <span className="ncm-skeleton__lines">
                <span className="ncm-skeleton__line" />
                <span className="ncm-skeleton__line ncm-skeleton__line--short" />
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
