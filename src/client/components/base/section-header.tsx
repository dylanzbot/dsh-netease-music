/* 通用分区标题栏（左侧竖条 + 标题 + 数量 + 可选的「查看全部 / 收起」）。 */

import { NcmChevronRightIcon } from './icons.js'

/** 分区标题栏 props。 */
export interface SectionHeaderProps {
  readonly title: string
  readonly count: number
  /** 是否有可展开的额外内容（决定是否显示「查看全部 / 收起」）。 */
  readonly expandable?: boolean
  readonly expanded?: boolean
  /** 展开 / 收起回调；仅在 expandable 为 true 时需要。 */
  readonly onToggle?: () => void
}

/** 分区标题栏。 */
export function SectionHeader({ title, count, expandable = false, expanded = false, onToggle }: SectionHeaderProps) {
  return (
    <header className="ncm-section__head">
      <span className="ncm-section__bar" aria-hidden="true" />
      <h2 className="ncm-section__title">{title}</h2>
      <span className="ncm-section__count">{count}</span>
      {expandable ? (
        <button type="button" className="ncm-section__more" onClick={onToggle}>
          {expanded ? '收起' : '查看全部'}
          <NcmChevronRightIcon size={13} className={expanded ? 'ncm-section__more-icon--down' : undefined} />
        </button>
      ) : null}
    </header>
  )
}
