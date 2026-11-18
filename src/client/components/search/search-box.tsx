/* 全局搜索框（带下拉结果）。 */

import { useEffect, useRef, useState } from 'react'
import type {
  NcmAlbumCardDTO,
  NcmArtistCardDTO,
  NcmLibrarySearchDTO,
  NcmMultiSearchDTO,
  NcmPlaylistCardDTO,
  NcmSongDTO,
} from '../../../types/index.js'
import { searchLibrary, searchMulti } from '../../api/song.api.js'
import { NcmSearchIcon } from '../base/icons.js'
import { NcmSearchPopover } from './search-popover.js'
import './search-box.css'

/** 搜索框 props。 */
export interface NcmSearchBoxProps {
  /** 占位文案。 */
  readonly placeholder?: string
  /** 尺寸：md 普通 / lg 首页大号。 */
  readonly size?: 'md' | 'lg'
  /** 当前账号是否黑胶会员。 */
  readonly hasVip?: boolean
  /** 选中一首歌（附带当前结果队列）。 */
  readonly onPickSong?: (song: NcmSongDTO, queue: readonly NcmSongDTO[], index: number) => void
  /** 点击歌手结果：打开歌手详情。 */
  readonly onOpenArtist?: (artist: NcmArtistCardDTO) => void
  /** 点击专辑结果：打开专辑弹窗。 */
  readonly onOpenAlbum?: (album: NcmAlbumCardDTO) => void
  /** 点击歌单结果：打开歌单详情。 */
  readonly onOpenPlaylist?: (playlist: NcmPlaylistCardDTO) => void
}

/** 搜索框。 */
export function NcmSearchBox({
  placeholder = '搜索歌曲、歌手、专辑、歌单…',
  size = 'md',
  hasVip = false,
  onPickSong,
  onOpenArtist,
  onOpenAlbum,
  onOpenPlaylist,
}: NcmSearchBoxProps) {
  const [value, setValue] = useState('')
  const [library, setLibrary] = useState<NcmLibrarySearchDTO | null>(null)
  const [multi, setMulti] = useState<NcmMultiSearchDTO | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 输入防抖：300ms 内连续输入只发最后一次。
  useEffect(() => {
    const keyword = value.trim()
    if (keyword === '') {
      abortRef.current?.abort()
      setLibrary(null)
      setMulti(null)
      setLoading(false)
      setFailed(false)
      return
    }

    setOpen(true)
    setLoading(true)
    setFailed(false)
    const timer = window.setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      // 本地歌单/收藏命中优先展示；同时并行拉全站四类结果，下拉更完整。
      Promise.all([
        searchLibrary(keyword, controller.signal).catch(() => null),
        searchMulti(keyword, 5, controller.signal).catch(() => null),
      ])
        .then(([libResult, multiResult]) => {
          if (controller.signal.aborted) return
          setLibrary(libResult)
          setMulti(multiResult)
          setFailed(libResult === null && multiResult === null)
          setLoading(false)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setLibrary(null)
          setMulti(null)
          setLoading(false)
          setFailed(true)
        })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [value])

  // 组件卸载时中止在途请求。
  useEffect(() => () => abortRef.current?.abort(), [])

  return (
    <div className={`ncm-search ncm-search--${size}`} ref={rootRef}>
      <div className="ncm-search__field">
        <span className="ncm-search__icon" aria-hidden="true">
          <NcmSearchIcon size={size === 'lg' ? 19 : 17} />
        </span>
        <input
          className="ncm-search__input"
          type="search"
          value={value}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => {
            if (value.trim() !== '') setOpen(true)
          }}
        />
        {value !== '' ? (
          <button
            type="button"
            className="ncm-search__clear"
            aria-label="清空搜索"
            onClick={() => {
              setValue('')
              setOpen(false)
            }}
          >
            ×
          </button>
        ) : (
          <span className="ncm-search__kbd" aria-hidden="true">
            Enter
          </span>
        )}
      </div>

      <NcmSearchPopover
        open={open && value.trim() !== ''}
        onClose={() => setOpen(false)}
        anchorRef={rootRef}
        keyword={value.trim()}
        library={library}
        multi={multi}
        loading={loading}
        failed={failed}
        hasVip={hasVip}
        onPick={(song, queue, index) => {
          onPickSong?.(song, queue, index)
          setOpen(false)
        }}
        onOpenArtist={(artist) => {
          onOpenArtist?.(artist)
          setOpen(false)
        }}
        onOpenAlbum={(album) => {
          onOpenAlbum?.(album)
          setOpen(false)
        }}
        onOpenPlaylist={(playlist) => {
          onOpenPlaylist?.(playlist)
          setOpen(false)
        }}
      />
    </div>
  )
}
