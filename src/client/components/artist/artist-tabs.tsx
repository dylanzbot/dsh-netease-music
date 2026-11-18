/* 歌手详情页的 Tab 栏（全部歌曲 / 热门歌曲 / 专辑 / MV）+ 右侧「播放全部」。 */

import { NcmPlayIcon } from '../base/icons.js'

/** Tab 键。 */
export type ArtistTab = 'all' | 'hot' | 'albums' | 'mvs'

/** Tab 栏 props。 */
export interface ArtistTabsProps {
  readonly tab: ArtistTab
  /** [key, label] 列表。 */
  readonly tabs: ReadonlyArray<readonly [ArtistTab, string]>
  readonly onSelectTab: (tab: ArtistTab) => void
  /** 当前 tab 是否展示「播放全部」按钮（仅音歌 Tab）。 */
  readonly showPlayAll: boolean
  /** 「播放全部」是否禁用（无可播歌曲时为 true）。 */
  readonly playAllDisabled: boolean
  readonly onPlayAll: () => void
}

/** 歌手 Tab 栏。 */
export function ArtistTabs({ tab, tabs, onSelectTab, showPlayAll, playAllDisabled, onPlayAll }: ArtistTabsProps) {
  return (
    <nav className="ncm-artist__tabs">
      <div className="ncm-artist__tabs-list">
        {tabs.map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={`ncm-artist__tab${tab === key ? ' ncm-artist__tab--active' : ''}`}
            onClick={() => onSelectTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {showPlayAll ? (
        <div className="ncm-artist__tabs-actions">
          <button type="button" className="ncm-artist__play-all" disabled={playAllDisabled} onClick={onPlayAll}>
            <NcmPlayIcon size={13} /> 播放全部
          </button>
        </div>
      ) : null}
    </nav>
  )
}
