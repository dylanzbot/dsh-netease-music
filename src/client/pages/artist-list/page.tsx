/* 「歌手」列表页。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { NcmArtistCardDTO } from '../../../types/index.js'
import { getTopArtists, searchArtists } from '../../api/artist.api.js'
import { usePagedList } from '../../hooks/use-paged-list.js'
import { NcmSearchIcon } from '../../components/base/icons.js'
import { NcmImage } from '../../components/base/image.js'
import { NcmSkeleton } from '../../components/base/skeleton.js'
import { formatCount } from '../../utils/format.js'
import './page.css'

/** 首字母栏：热门 + A–Z。 */
const INITIALS: ReadonlyArray<string> = ['-1', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]

/** 每页数量。 */
const PAGE_SIZE = 30

/** 列表页 props。 */
export interface ArtistListPageProps {
  /** 点击歌手卡片进入详情。 */
  readonly onOpenArtist: (artist: NcmArtistCardDTO) => void
}

/** 把两批歌手按 id 去重合并。 */
function mergeArtists(prev: readonly NcmArtistCardDTO[], next: readonly NcmArtistCardDTO[]): NcmArtistCardDTO[] {
  const seen = new Set(prev.map((item) => item.id))
  const merged = [...prev]
  for (const item of next) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(item)
    }
  }
  return merged
}

/** 歌手列表页。 */
export default function ArtistListPage({ onOpenArtist }: ArtistListPageProps) {
  // 首字母选择：'-1' = 热门榜，其余为字母关键词。
  const [activeInitial, setActiveInitial] = useState('-1')
  // 搜索框输入与防抖后的实际查询词。
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // 当前生效的浏览关键词：搜索框优先，其次首字母；空 = 热门榜。
  const keyword = debouncedSearch.trim() !== '' ? debouncedSearch.trim() : activeInitial !== '-1' ? activeInitial : ''

  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 热门榜与关键词检索统一归一成分页结果。
  const fetchPage = useCallback(
    (offset: number, size: number, signal: AbortSignal) => {
      if (keyword === '') {
        return getTopArtists(size, offset, signal).then((top) => ({
          items: top.artists,
          more: top.more,
          total: 0,
        }))
      }
      return searchArtists(keyword, offset, size, signal).then((found) => ({
        items: found.artists,
        more: found.more,
        total: found.total,
      }))
    },
    [keyword],
  )

  const { items: artists, total, more, loading, loadingMore, failed, loadMore } = usePagedList<NcmArtistCardDTO>({
    pageSize: PAGE_SIZE,
    deps: [keyword],
    merge: mergeArtists,
    fetchPage,
  })

  /** 搜索框防抖：300ms 内连续输入只发最后一次。 */
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchText])

  /** 关键词 / 模式变化时回到顶部。 */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [keyword])

  /** 滚动到底部自动加载更多。 */
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (loading || !more) return
      const el = event.currentTarget
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 320) loadMore()
    },
    [loading, more, loadMore],
  )

  /** 点击首字母：切到该字母的关键词检索，并清空搜索框。 */
  const pickInitial = useCallback((letter: string) => {
    setSearchText('')
    setDebouncedSearch('')
    setActiveInitial(letter)
  }, [])

  /** 点击「热门」：回到热门榜。 */
  const pickTop = useCallback(() => {
    setSearchText('')
    setDebouncedSearch('')
    setActiveInitial('-1')
  }, [])

  const isTop = keyword === ''
  const renderGrid = (list: readonly NcmArtistCardDTO[]) => (
    <div className="ncm-artist-list__grid">
      {list.map((artist) => (
        <button
          type="button"
          key={artist.id}
          className="ncm-artist-card"
          onClick={() => onOpenArtist(artist)}
          title={artist.name}
        >
          <NcmImage className="ncm-artist-card__avatar" src={artist.avatarUrl} variant="avatar" fallbackText={artist.name} />
          <span className="ncm-artist-card__name">{artist.name}</span>
          <span className="ncm-artist-card__meta">
            {artist.alias.length > 0 ? `${artist.alias[0]} · ` : ''}
            单曲 {formatCount(artist.musicSize)}
          </span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="ncm-artist-list ncm-scroll" ref={scrollRef} onScroll={handleScroll}>
      <div className="ncm-artist-list__inner">
        <header className="ncm-artist-list__head">
          <h1 className="ncm-artist-list__title">歌手</h1>
          <div className="ncm-artist-list__search">
            <span className="ncm-artist-list__search-icon">
              <NcmSearchIcon size={15} />
            </span>
            <input
              className="ncm-artist-list__search-input"
              type="search"
              placeholder="搜索歌手（输入即搜）"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setDebouncedSearch(searchText.trim())
              }}
            />
            {searchText !== '' ? (
              <button
                type="button"
                className="ncm-artist-list__search-clear"
                onClick={() => {
                  setSearchText('')
                  setDebouncedSearch('')
                }}
                aria-label="清空搜索"
              >
                ×
              </button>
            ) : null}
          </div>
        </header>

        <div className="ncm-artist-list__initials">
          {INITIALS.map((item) => {
            const active = item === '-1' ? isTop : !isTop && activeInitial === item && debouncedSearch.trim() === ''
            return (
              <button
                type="button"
                key={item}
                className={`ncm-artist-list__initial${active ? ' ncm-artist-list__initial--active' : ''}`}
                onClick={() => (item === '-1' ? pickTop() : pickInitial(item))}
              >
                {item === '-1' ? '热门' : item}
              </button>
            )
          })}
        </div>

        <section className="ncm-artist-list__section">
          <header className="ncm-artist-list__section-head">
            <span className="ncm-section__bar" aria-hidden="true" />
            <h2>{isTop ? '热门歌手' : `“${keyword}” 的检索结果`}</h2>
            <span className="ncm-artist-list__count">
              {isTop ? '按热度排序' : `按匹配度排序 · 约 ${formatCount(total)} 位`}
            </span>
          </header>

          {loading && artists.length === 0 ? (
            <NcmSkeleton rows={8} cover />
          ) : failed ? (
            <div className="ncm-artist-list__empty ncm-empty-state">歌手加载失败，请稍后重试</div>
          ) : artists.length === 0 ? (
            <div className="ncm-artist-list__empty ncm-empty-state">{isTop ? '暂无歌手' : `没有找到“${keyword}”相关的歌手`}</div>
          ) : (
            <>
              {renderGrid(artists)}
              {loadingMore ? <div className="ncm-artist-list__hint">正在加载更多…</div> : null}
              {!more && artists.length > 0 ? (
                <div className="ncm-artist-list__hint">没有更多了</div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
