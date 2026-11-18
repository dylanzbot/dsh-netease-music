/* 网易云音乐 Logo（黑线条风格），用作侧栏图标和登录页左侧的大 Logo。 */

/** Logo/侧栏图标注入的 props。 */
export interface NcmLogoProps {
  /** 期望的方形边长（像素）。侧栏展开 16 / 折叠 18。 */
  readonly size?: number
  /** 当前面板是否被选中（本组件未使用，留给将来「选中态加粗」）。 */
  readonly active?: boolean
}

/** 网易云音乐 Logo（侧栏图标）。 */
export function NcmLogo({ size = 18 }: NcmLogoProps) {
  // 路径直接抄自 tabler 图标库的 brand-netease-music.svg。
  // 它由三段组成：
  //   - 一个 24×24 的透明背景方块（确保描边不会画出 viewBox）
  //   - 圆环（网易云的「唱片」标志）
  //   - 音符的勾与横线
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M0 0h24v24H0z" fill="none" />
      <path
        d="M9 4c-2.93 1.346-5 5.046-5 8.492C4 17 8 20 12 20s8-3 8-7c0-3.513-3.5-5.513-6-5.513S9 9 9 12c0 2 1.5 3 3 3s3-1 3-3c0-3.513-2-4.508-2-6.515c0-3.504 3.5-2.603 4-1.502"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}
