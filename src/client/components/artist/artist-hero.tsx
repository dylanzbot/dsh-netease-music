/* 歌手详情页头部（头像 + 名字 + 关注按钮 + 别名/译名 + 作品数 + 可折叠简介）。 */

import type { NcmArtistDetailDTO } from '../../../types/index.js'
import { NcmImage } from '../base/image.js'
import { formatCount } from '../../utils/format.js'

/** 歌手头部 props。 */
export interface ArtistHeroProps {
  readonly artist: NcmArtistDetailDTO
  readonly followed: boolean
  readonly followBusy: boolean
  readonly descExpanded: boolean
  readonly onToggleFollow: () => void
  readonly onToggleDesc: () => void
}

/** 简介超过这个长度才显示展开 / 收起。 */
const DESC_TOGGLE_THRESHOLD = 160

/** 歌手头部。 */
export function ArtistHero({
  artist,
  followed,
  followBusy,
  descExpanded,
  onToggleFollow,
  onToggleDesc,
}: ArtistHeroProps) {
  const desc = artist.briefDesc
  const showDescToggle = desc.length > DESC_TOGGLE_THRESHOLD
  const aliasText = [...(artist.trans !== '' ? [artist.trans] : []), ...artist.alias].join(' / ')

  return (
    <header className="ncm-artist__head">
      <NcmImage className="ncm-artist__avatar" src={artist.avatarUrl} variant="avatar" fallbackText={artist.name} loading="eager" />
      <div className="ncm-artist__meta">
        <div className="ncm-artist__name-row">
          <h1 className="ncm-artist__name">{artist.name}</h1>
          <button
            type="button"
            className={`ncm-artist__follow${followed ? ' ncm-artist__follow--on' : ''}`}
            disabled={followBusy}
            onClick={onToggleFollow}
          >
            {followed ? '已关注' : '+ 关注'}
          </button>
        </div>
        {aliasText !== '' ? <p className="ncm-artist__alias">{aliasText}</p> : null}
        <div className="ncm-artist__stats">
          <span>
            单曲 <b>{formatCount(artist.musicSize)}</b>
          </span>
          <span>
            专辑 <b>{formatCount(artist.albumSize)}</b>
          </span>
          <span>
            MV <b>{formatCount(artist.mvSize)}</b>
          </span>
        </div>
        {desc !== '' ? (
          <div className={`ncm-artist__desc${descExpanded ? ' ncm-artist__desc--expanded' : ''}`}>
            <p>{desc}</p>
            {showDescToggle ? (
              <button type="button" className="ncm-artist__desc-toggle" onClick={onToggleDesc}>
                {descExpanded ? '收起' : '展开'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
