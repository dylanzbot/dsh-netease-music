/* 专辑弹窗（歌手页点击专辑卡片时打开）。 */

import type { NcmAlbumCardDTO, NcmAlbumInfoDTO, NcmSongDTO } from '../../../types/index.js'
import { useEffect, useState } from 'react'
import { getAlbumDetail } from '../../api/artist.api.js'
import { formatDate } from '../../utils/format.js'
import { NcmPlayIcon } from '../base/icons.js'
import { NcmImage } from '../base/image.js'
import { NcmModal } from '../base/modal.js'
import { NcmSongTable } from '../song/song-table.js'
import './album-modal.css'

/** 专辑弹窗 props。 */
export interface NcmAlbumModalProps {
  /** 当前打开的专辑卡片；null 表示关闭。 */
  readonly album: NcmAlbumCardDTO | null
  /** 当前账号是否黑胶会员（用于无版权 / VIP 标签）。 */
  readonly hasVip: boolean
  /** 歌手详情页的歌手名；宿主侧旧版本拿不到专辑歌手时用它兜底。 */
  readonly artistName: string
  /** 关闭弹窗。 */
  readonly onClose: () => void
  /** 播放一组歌曲（队列 + 起始索引）。 */
  readonly onPlayQueue: (songs: readonly NcmSongDTO[], index: number) => void
}

/** 专辑弹窗。 */
export function NcmAlbumModal({ album, hasVip, artistName: fallbackArtistName, onClose, onPlayQueue }: NcmAlbumModalProps) {
  const [detail, setDetail] = useState<NcmAlbumInfoDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    if (album === null) return
    const controller = new AbortController()
    setDetail(null)
    setDescExpanded(false)
    setLoading(true)
    setFailed(false)
    getAlbumDetail(album.id, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return
        setDetail(value)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setFailed(true)
        setLoading(false)
      })
    return () => controller.abort()
  }, [album])

  const info = detail?.album
  const songs = detail?.songs ?? []

  // 接口未回来（或宿主侧尚未重载、拿不到 album 节点）前用卡片数据兜底，
  // 保证弹窗一打开就有内容。
  const name = info?.name ?? album?.name ?? ''
  const coverUrl = info?.coverUrl ?? album?.coverUrl ?? ''
  const artistName = info?.artistName || fallbackArtistName
  const type = info?.type || album?.type || '专辑'
  const publishTime = info?.publishTime ?? album?.publishTime ?? 0
  const description = info?.description ?? ''
  // 截断按固定 2 行渲染，窄侧栏里 2 行只能容纳几十字，阈值放低避免正文被藏住又没「展开」。
  const showDescToggle = description.length > 40

  const facts: string[] = []
  if (artistName !== '') facts.push(`歌手 ${artistName}`)
  const date = formatDate(publishTime)
  if (date !== '') facts.push(`发行 ${date}`)
  // 数据回来后以实际曲目数为准，避免「10 首」和「暂无歌曲 / 加载失败」同屏矛盾。
  if (!failed) facts.push(`${detail !== null ? songs.length : (album?.size ?? 0)} 首`)
  if (info?.subType) facts.push(info.subType)
  if (info?.company) facts.push(info.company)

  return (
    <NcmModal
      open={album !== null}
      onClose={onClose}
      className="ncm-album-modal"
      overlayClassName="ncm-album-modal__overlay"
      ariaLabelledBy="ncm-album-modal-title"
    >
      <header className="ncm-album-modal__intro">
        <NcmImage className="ncm-album-modal__cover" src={coverUrl} variant="playlist" loading="eager" />
        <div className="ncm-album-modal__meta">
          <div className="ncm-album-modal__title-row">
            <span className="ncm-album-modal__type">{type}</span>
            <h2 id="ncm-album-modal-title" title={name}>{name}</h2>
          </div>
          {facts.length > 0 ? <p className="ncm-album-modal__facts" title={facts.join(' · ')}>{facts.join(' · ')}</p> : null}
          {description !== '' ? (
            <div className={`ncm-album-modal__desc${descExpanded ? ' ncm-album-modal__desc--expanded' : ''} ncm-scroll`}>
              <p>{description}</p>
              {showDescToggle ? (
                <button
                  type="button"
                  className="ncm-album-modal__desc-toggle"
                  aria-expanded={descExpanded}
                  onClick={() => setDescExpanded((value) => !value)}
                >
                  {descExpanded ? '收起' : '展开'}
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="ncm-album-modal__actions">
            <button
              type="button"
              className="ncm-album-modal__play-all"
              disabled={loading || failed || songs.length === 0}
              onClick={() => onPlayQueue(songs, 0)}
            >
              <NcmPlayIcon size={13} /> 播放全部
            </button>
          </div>
        </div>
        <button type="button" className="ncm-album-modal__close ncm-icon-btn" aria-label="关闭" onClick={onClose}>
          ×
        </button>
      </header>

      <section className="ncm-album-modal__songs ncm-scroll">
        {loading ? (
          <div className="ncm-album-modal__state">正在加载专辑歌曲…</div>
        ) : failed ? (
          <div className="ncm-album-modal__state">专辑加载失败，请关闭后重试</div>
        ) : (
          <NcmSongTable
            songs={songs}
            hasVip={hasVip}
            onPlaySong={onPlayQueue}
            showArtist
            showAlbum={false}
            emptyText="这张专辑暂无歌曲"
          />
        )}
      </section>
    </NcmModal>
  )
}
