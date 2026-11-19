import { describe, expect, it } from 'vitest'
import { AccountApiPath } from '../../src/client/api/account.api.js'
import { ArtistApiPath } from '../../src/client/api/artist.api.js'
import { AuthApiPath } from '../../src/client/api/auth.api.js'
import { CommentApiPath } from '../../src/client/api/comment.api.js'
import { PlaylistApiPath } from '../../src/client/api/playlist.api.js'
import { SettingsApiPath } from '../../src/client/api/settings.api.js'
import { SongApiPath } from '../../src/client/api/song.api.js'
import { UserApiPath } from '../../src/client/api/user.api.js'
import { HostApiPath } from '../../src/host/routes/paths.js'

const clientPaths = [
  ...Object.values(AuthApiPath),
  ...Object.values(AccountApiPath),
  ...Object.values(SettingsApiPath),
  ...Object.values(SongApiPath),
  ...Object.values(PlaylistApiPath),
  ...Object.values(CommentApiPath),
  ...Object.values(UserApiPath),
  ...Object.values(ArtistApiPath),
]

describe('HTTP 路径契约', () => {
  it('HostApiPath 的值没有重复', () => {
    const paths = Object.values(HostApiPath)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('所有浏览器侧路径都能在宿主侧找到对应注册', () => {
    const hostPaths = new Set<string>(Object.values(HostApiPath))
    const missing = clientPaths.filter((path) => !hostPaths.has(path))
    expect(missing).toEqual([])
  })

  it('所有路径都以 /api/ncm/ 开头', () => {
    expect(clientPaths.every((path) => path.startsWith('/api/ncm/'))).toBe(true)
    expect(Object.values(HostApiPath).every((path) => path.startsWith('/api/ncm/'))).toBe(true)
  })

  it('关键路径字面量保持兼容（历史路径不可随意改）', () => {
    expect(HostApiPath.AlbumDetail).toBe('/api/ncm/album/songs')
    expect(HostApiPath.MvDownload).toBe('/api/ncm/mv/download')
  })
})
