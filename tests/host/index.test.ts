import { describe, expect, it } from 'vitest'
import { Config } from '../../src/host/index.js'

function valueOf(result: ReturnType<typeof Config['~standard']['validate']>): unknown {
  if ('value' in result) return result.value
  throw new Error('expected a valid config')
}

describe('宿主 Config', () => {
  it('Standard Schema 校验空配置时补上默认值 true', () => {
    expect(valueOf(Config['~standard'].validate(undefined))).toEqual({ showFollowStats: true })
    expect(valueOf(Config['~standard'].validate({}))).toEqual({ showFollowStats: true })
  })

  it('保留显式的布尔值，忽略非布尔字段', () => {
    expect(valueOf(Config['~standard'].validate({ showFollowStats: false }))).toEqual({
      showFollowStats: false,
    })
    expect(valueOf(Config['~standard'].validate({ showFollowStats: 'yes' }))).toEqual({
      showFollowStats: true,
    })
  })
})
