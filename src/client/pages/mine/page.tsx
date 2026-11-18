/* 「我的」页面（登录后的默认页）。 */

import { useState } from 'react'
import type {
  NcmAlbumCardDTO,
  NcmArtistCardDTO,
  NcmMeDTO,
  NcmPlaylistCardDTO as NcmPlaylistCardData,
  NcmSongDTO,
} from '../../../types/index.js'
import { NcmPlaylistCard } from '../../components/playlist/playlist-card.js'
import { NcmSearchBox } from '../../components/search/search-box.js'
import { SectionHeader } from '../../components/base/section-header.js'
import { MineHero } from '../../components/user/mine-hero.js'
import { NcmHeartIcon, NcmMusicIcon } from '../../components/base/icons.js'
import { cssUrl } from '../../utils/css.js'
import './page.css'

/** 「我的」页面 props。 */
export interface MinePageProps {
  /** 当前登录用户数据（宿主已映射成稳定 DTO）。 */
  readonly me: NcmMeDTO
  /** 选中搜索结果里的歌。 */
  readonly onPickSong?: (song: NcmSongDTO, queue?: readonly NcmSongDTO[], index?: number) => void
  /** 点击「关注」/「粉丝」打开关系弹窗。 */
  readonly onOpenRelation?: (kind: 'follows' | 'fans') => void
  /** 是否显示关注 / 粉丝数量（插件设置）。 */
  readonly showFollowStats?: boolean
  /** 打开歌单详情。 */
  readonly onOpenPlaylist?: (playlist: NcmPlaylistCardData) => void
  /** 播放整张歌单。 */
  readonly onPlayPlaylist?: (playlist: NcmPlaylistCardData) => void
  /** 搜索结果点击歌手 → 打开歌手详情。 */
  readonly onOpenArtist?: (artist: NcmArtistCardDTO) => void
  /** 搜索结果点击专辑 → 打开专辑弹窗。 */
  readonly onOpenAlbum?: (album: NcmAlbumCardDTO) => void
}

/** 一屏最多展示的卡片数；超出折叠。 */
const VISIBLE_LIMIT = 10

/** 我的页面。 */
export default function MinePage({ me, onPickSong, onOpenPlaylist, onPlayPlaylist, onOpenRelation, showFollowStats = true, onOpenArtist, onOpenAlbum }: MinePageProps) {
  const { profile } = me
  const [playlistsExpanded, setPlaylistsExpanded] = useState(false)
  const [collectionsExpanded, setCollectionsExpanded] = useState(false)

  const allPlaylists = [...(me.liked !== null ? [me.liked] : []), ...me.playlists]
  const visiblePlaylists = playlistsExpanded ? allPlaylists : allPlaylists.slice(0, VISIBLE_LIMIT)
  const visibleCollections = collectionsExpanded ? me.collections : me.collections.slice(0, VISIBLE_LIMIT)
  const heroCover = profile.backgroundUrl !== '' ? profile.backgroundUrl : (me.liked?.coverUrl ?? '')
  const backgroundImage = cssUrl(heroCover)
  const isVip = profile.vipType > 0 || profile.vipLevel !== undefined

  return (
    <div className="ncm-mine ncm-scroll">
      <div className="ncm-mine__bg" aria-hidden="true">
        {backgroundImage !== undefined ? <span className="ncm-mine__bg-img" style={{ backgroundImage }} /> : null}
        <span className="ncm-mine__bg-glow" />
      </div>

      <div className="ncm-mine__inner">
        <MineHero me={me} showFollowStats={showFollowStats} onOpenRelation={onOpenRelation} />

        <div className="ncm-search-box">
          <NcmSearchBox placeholder="搜索歌曲、歌手、专辑、歌单…" hasVip={isVip} onPickSong={onPickSong} onOpenArtist={onOpenArtist} onOpenAlbum={onOpenAlbum} onOpenPlaylist={onOpenPlaylist} />
        </div>

        <section className="ncm-section" aria-labelledby="ncm-my-playlists">
          <SectionHeader
            title="我的歌单"
            count={allPlaylists.length}
            expanded={playlistsExpanded}
            expandable={allPlaylists.length > VISIBLE_LIMIT}
            onToggle={() => setPlaylistsExpanded((value) => !value)}
          />
          {allPlaylists.length > 0 ? (
            <div className="ncm-playlist-grid">
              {visiblePlaylists.map((playlist, index) => (
                <NcmPlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  liked={index === 0 && me.liked !== null}
                  onOpen={onOpenPlaylist}
                  onPlay={onPlayPlaylist}
                />
              ))}
            </div>
          ) : (
            <div className="ncm-empty">
              <NcmMusicIcon size={26} />
              <p>还没有创建歌单</p>
            </div>
          )}
        </section>

        <section className="ncm-section" aria-labelledby="ncm-my-collections">
          <SectionHeader
            title="我的收藏"
            count={me.collections.length}
            expanded={collectionsExpanded}
            expandable={me.collections.length > VISIBLE_LIMIT}
            onToggle={() => setCollectionsExpanded((value) => !value)}
          />
          {me.collections.length > 0 ? (
            <div className="ncm-playlist-grid">
              {visibleCollections.map((playlist) => (
                <NcmPlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onOpen={onOpenPlaylist}
                  onPlay={onPlayPlaylist}
                />
              ))}
            </div>
          ) : (
            <div className="ncm-empty">
              <NcmHeartIcon size={26} />
              <p>还没有收藏歌单，去网易云音乐收藏喜欢的歌单吧</p>
            </div>
          )}
        </section>

        <footer className="ncm-mine__foot">数据来自网易云音乐 · 仅保存在本机</footer>
      </div>
    </div>
  )
}
