/* 网易云音乐右侧导航组件。 */

import { NcmHomeIcon, NcmLogoutIcon, NcmMicIcon, NcmUserIcon } from '../base/icons.js'
import './nav-rail.css'

/** 导航 tab。 */
export type NcmRailTab = 'home' | 'artist' | 'mine'

/** 导航 props。 */
export interface NcmNavRailProps {
  readonly active: NcmRailTab
  readonly onSelect: (tab: NcmRailTab) => void
  readonly onLogout: () => void
}

/** 网易云音乐导航。 */
export function NcmNavRail({ active, onSelect, onLogout }: NcmNavRailProps) {
  return (
    <nav className="ncm-nav-rail" aria-label="网易云音乐导航">
      <button
        type="button"
        className={`ncm-nav-rail__btn${active === 'home' ? ' ncm-nav-rail__btn--active' : ''}`}
        onClick={() => onSelect('home')}
        aria-current={active === 'home' ? 'page' : undefined}
      >
        <span className="ncm-nav-rail__icon">
          <NcmHomeIcon size={19} />
        </span>
        <span>首页</span>
      </button>
      <button
        type="button"
        className={`ncm-nav-rail__btn${active === 'artist' ? ' ncm-nav-rail__btn--active' : ''}`}
        onClick={() => onSelect('artist')}
        aria-current={active === 'artist' ? 'page' : undefined}
      >
        <span className="ncm-nav-rail__icon">
          <NcmMicIcon size={19} />
        </span>
        <span>歌手</span>
      </button>
      <button
        type="button"
        className={`ncm-nav-rail__btn${active === 'mine' ? ' ncm-nav-rail__btn--active' : ''}`}
        onClick={() => onSelect('mine')}
        aria-current={active === 'mine' ? 'page' : undefined}
      >
        <span className="ncm-nav-rail__icon">
          <NcmUserIcon size={19} />
        </span>
        <span>我的</span>
      </button>
      <span className="ncm-nav-rail__sep" aria-hidden="true" />
      <button type="button" className="ncm-nav-rail__btn ncm-nav-rail__btn--quiet" onClick={onLogout} title="退出登录">
        <span className="ncm-nav-rail__icon">
          <NcmLogoutIcon size={18} />
        </span>
        <span>退出</span>
      </button>
    </nav>
  )
}
