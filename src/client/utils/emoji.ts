/* 评论正文里的网易云表情渲染（图片优先 + Unicode 兜底）。 */

import { createElement, useState, type ReactNode } from 'react'

/** 官方表情图 CDN 模板（`{ID}` 由映射表替换；@2x 清晰度）。 */
const EMOJI_IMAGE_URL_TEMPLATE = 'https://s1.music.126.net/style/web2/emoji/emoji_{ID}@2x.png'

export const NETEASE_EMOJI_IDS: Readonly<Record<string, string>> = {
  '18': '186',
  '大笑': '86',
  '可爱': '85',
  '憨笑': '359',
  '色': '95',
  '亲亲': '363',
  '惊恐': '96',
  '流泪': '356',
  '亲': '362',
  '呆': '352',
  '哀伤': '342',
  '呲牙': '343',
  '吐舌': '348',
  '撇嘴': '353',
  '怒': '361',
  '奸笑': '341',
  '汗': '97',
  '痛苦': '346',
  '惶恐': '354',
  '生病': '350',
  '口罩': '351',
  '大哭': '357',
  '晕': '355',
  '发怒': '115',
  '开心': '360',
  '鬼脸': '94',
  '皱眉': '87',
  '流感': '358',
  '爱心': '33',
  '心碎': '34',
  '钟情': '303',
  '星星': '309',
  '生气': '314',
  '便便': '89',
  '强': '13',
  '弱': '372',
  '拜': '14',
  '牵手': '379',
  '跳舞': '380',
  '禁止': '374',
  '这边': '262',
  '爱意': '106',
  '示爱': '376',
  '嘴唇': '367',
  '狗': '81',
  '猫': '78',
  '猪': '100',
  '兔子': '459',
  '小鸡': '450',
  '公鸡': '461',
  '幽灵': '116',
  '圣诞': '411',
  '外星': '101',
  '钻石': '52',
  '礼物': '107',
  '男孩': '0',
  '女孩': '1',
  '蛋糕': '337',
  '圈': '312',
  '叉': '313',
}

export const NETEASE_CUSTOM_EMOJI_URLS: Readonly<Record<string, string>> = {
  '多多大笑': 'https://p1.music.126.net/V4m7SdpzgrPfjJWaTu3xSQ==/109951163626285326.jpg',
  '多多耍酷': 'https://p1.music.126.net/x5mZknOpJNzKC7LS0zv2iA==/109951163626286808.jpg',
  '多多比耶': 'https://p1.music.126.net/BqJoqXngUpIZ3pq_Fvrvbw==/109951163626291112.jpg',
  '多多大哭': 'https://p2.music.126.net/XuQpmBaIzQ6uJ3mtmSBESQ==/109951163626288209.jpg',
  '多多瞌睡': 'https://p1.music.126.net/WfFex7GPSUiuIKE8anlcbA==/109951163626285332.jpg',
  '多多难过': 'https://p2.music.126.net/yaiHLfm4mpIMqu9NaJwnIA==/109951163626282475.jpg',
  '多多笑哭': 'https://p1.music.126.net/UG4mAEogOWZRhjlxBRHDTw==/109951163626295026.jpg',
  '多多可怜': 'https://p1.music.126.net/od41_QdeiOwB2i9Tuk0h-Q==/109951163626289680.jpg',
  '多多无语': 'https://p2.music.126.net/8x10ArHD1deDphGZ-_WfVw==/109951163626291589.jpg',
  '多多捂脸': 'https://p2.music.126.net/3NOXs8vDoAsZWTF_3O0zrQ==/109951163626287335.jpg',
  '多多亲吻': 'https://p1.music.126.net/2zaHfDaWioE7V-CLH7kMQQ==/109951163626285824.jpg',
  '多多调皮': 'https://p2.music.126.net/ZGF1A6bKMuFyW3qXK-tZjw==/109951163626288207.jpg',
  '西西心动': 'https://p1.music.126.net/3-uHZ9cyQNXZh9Bu7e21TQ==/109951163626284860.jpg',
  '西西发怒': 'https://p1.music.126.net/KMCVtbMU2vgjG3SiCBlRNg==/109951163626291586.jpg',
  '西西惊讶': 'https://p2.music.126.net/vegDCq0l-hXeZZLb8ks8qw==/109951163626290613.jpg',
  '西西奸笑': 'https://p2.music.126.net/X8dYyhEH_5O7liwCyOueZg==/109951163626285329.jpg',
  '西西晕了': 'https://p2.music.126.net/WrzdxYPaj-YnKPsjIY0rEw==/109951163626294527.jpg',
  '西西机智': 'https://p1.music.126.net/1zU_MqYm-HVsMZF8kU_xLw==/109951163626295022.jpg',
  '西西惊吓': 'https://p2.music.126.net/pc3WJ0iLPYZLWExXW-UZdQ==/109951163626292571.jpg',
  '西西流汗': 'https://p2.music.126.net/R0iMN1AqBe5hDKWPSO3Dug==/109951163626281959.jpg',
  '西西呕吐': 'https://p1.music.126.net/E4CO8ilH6Q5Pb829Nv0Xvg==/109951163626287760.jpg',
  '西西再见': 'https://p1.music.126.net/Vn3cObjyvp_RT_lNeP4s0g==/109951163626290116.jpg',
  '西西疑问': 'https://p2.music.126.net/QRiFigltORAlbhZfgOqu4w==/109951163626285827.jpg',
}

export const NETEASE_EMOJI_ALIASES: Readonly<Record<string, string>> = {
  '笑': '大笑',
  '笑脸': '开心',
  '哈哈': '大笑',
  '呵呵': '开心',
  '嘿嘿': '奸笑',
  '嘻嘻': '大笑',
  '愉快': '开心',
  '哭': '大哭',
  '泪': '流泪',
  '难过': '哀伤',
  '悲伤': '哀伤',
  '伤心': '哀伤',
  '失望': '哀伤',
  '得意': '奸笑',
  '阴险': '奸笑',
  '感冒': '流感',
  '发烧': '流感',
  '咳': '生病',
  '发火': '发怒',
  '抓狂': '发怒',
  '震惊': '惊恐',
  '惊讶': '惊恐',
  '害怕': '惊恐',
  '白眼': '撇嘴',
  '鄙视': '撇嘴',
  '不屑': '撇嘴',
  '冷漠': '呆',
  '黑线': '呆',
  '赞': '强',
  '棒': '强',
  '很棒': '强',
  good: '强',
  '不行': '弱',
  no: '弱',
  '祈祷': '拜',
  '作揖': '拜',
  '合十': '拜',
  '拜托': '拜',
  '亲吻': '亲亲',
  '献吻': '亲亲',
  '红唇': '嘴唇',
  '爱': '爱心',
  '心': '爱心',
  '红心': '爱心',
  '送心': '钟情',
  '心动': '钟情',
  '喜欢': '钟情',
  '秀恩爱': '示爱',
  '礼盒': '礼物',
  '生日': '蛋糕',
  '小狗': '狗',
  '狗头': '狗',
  '猪头': '猪',
  '小猫': '猫',
  '鸡': '公鸡',
  '鬼魂': '幽灵',
  '圣诞树': '圣诞',
  '钻': '钻石',
  OK: '圈',
  '对': '圈',
  '错': '叉',
}

export const NETEASE_EMOJI_UNICODE: Readonly<Record<string, string>> = {
  '多多耍酷': '😎',
  '多多大笑': '😆',
  '多多开心': '😊',
  '多多可爱': '🥰',
  '多多比耶': '✌️',
  '多多得意': '😏',
  '多多大哭': '😭',
  '多多难过': '😔',
  '多多可怜': '🥺',
  '多多委屈': '🥺',
  '多多生病': '😷',
  '多多困': '😴',
  '多多瞌睡': '😴',
  '多多睡觉': '😴',
  '多多惊讶': '😮',
  '多多吃饭': '😋',
  '多多音乐': '🎧',
  '多多爱心': '❤️',
  '多多比心': '🫶',
  '多多拥抱': '🤗',
  '多多抱抱': '🤗',
  '多多加油': '💪',
  '多多捂脸': '🤦',
  '多多无语': '😑',
  '多多笑哭': '😂',
  '多多调皮': '😜',
  '多多吃瓜': '🍉',
  '多多疑问': '❓',
  '多多害羞': '😳',
  '多多尴尬': '😅',
  '多多生气': '😠',
  '多多点费': '👍',
  '多多点费2': '👍',
  '多多点营': '👍',
  '多多点赞': '👍',
  '多多亲亲': '😘',
  '多多亲吻': '😘',
  '多多流汗': '😓',
  '多多吐舌': '😜',
  '多多喜欢': '😍',
  '西西心动': '💘',
  '西西发怒': '😡',
  '西西惊讶': '😱',
  '西西奸笑': '😏',
  '西西晕了': '😵',
  '西西机智': '🤓',
  '西西惊吓': '😨',
  '西西流汗': '😓',
  '西西呕吐': '🤮',
  '西西再见': '👋',
  '西西疑问': '❓',
  '蛋仔喜欢': '😍',
  '蛋仔白眼': '🙄',
  '蛋仔酷': '😎',
  '蛋仔耍酷': '😎',
  '蛋仔吃瓜': '🍉',
  '蛋仔送福': '🧧',
  '蛋仔疲惫': '😫',
  '蛋仔打脸': '🤦',
  '蛋仔大哭': '😭',
  '蛋仔大笑': '😆',
  '蛋仔裂开': '😵',
  '蛋仔开心': '😊',
  '蛋仔叹气': '😮‍💨',
  '蛋仔晕': '😵',
  '蛋仔坏笑': '😏',
  '蛋仔星星眼': '🤩',
  '蛋仔吹口哨': '😙',
  '蛋仔打Call': '📣',
  '蛋仔比心': '🫶',
  '蛋仔无语': '😑',
  '蛋仔疑问': '❓',
  '蛋仔惊讶': '😮',
  '蛋仔生气': '😠',
  '蛋仔委屈': '🥺',
  '蛋仔可爱': '🥰',
  '蛋仔加油': '💪',
  '打Call': '📣',
  '加油': '💪',
  '加油呀': '💪',
  '音乐': '🎵',
  '许愿': '🙏',
  '笑了': '😊',
  '脸红': '😳',
  '哭哭': '😭',
  '笑哭': '😂',
  '笑哭了': '😂',
  '爆笑': '🤣',
  '泣不成声': '😭',
  '抱抱': '🤗',
  '抱抱你': '🤗',
  '摸头': '🤗',
  '捂脸': '🤦',
  '吃瓜': '🍉',
  '比心': '🫶',
  '无语': '😑',
  '可怜': '🥺',
  '问号': '❓',
  '思考': '🤔',
  what: '🤔',
  '石化': '🗿',
  '害羞': '😳',
  '委屈': '🥺',
  '叹气': '😮‍💨',
  '唉': '😔',
  '裂开': '😵',
  '闭嘴': '🤐',
  '酷': '😎',
  '睡': '😴',
  '困': '😪',
  '吐': '🤮',
  '呕吐': '🤮',
  '流鼻涕': '🤧',
  '无奈': '😤',
  '囧': '囧',
  '嘿哈': '😄',
  '偷笑': '🤭',
  '机智': '🤓',
  '惊喜': '🤩',
  '舔屏': '😋',
  '哇': '😮',
  '啊': '😮',
  '哦': '😯',
  '咦': '🤨',
  '嗯': '🤔',
  '嗯嗯': '😌',
  '嘘': '🤫',
  '嘿': '😄',
  '调皮': '😜',
  '举手': '🙋',
  '拳头': '✊',
  '胜利': '✌️',
  '鼓掌': '👏',
  '握手': '🤝',
  '抱拳': '🙏',
  '勾引': '😏',
  '逢考必过': '🍀',
  '超绝': '💯',
  '搞怪': '😜',
  '手动狗头': '🐶',
  '蓝心': '💙',
  '黄心': '💛',
  '绿心': '💚',
  '紫心': '💜',
  '黑心': '🖤',
  '白心': '🤍',
  '橙心': '🧡',
  '粉心': '🩷',
  '玫瑰': '🌹',
  '凋谢': '🥀',
  '太阳': '☀️',
  '月亮': '🌙',
  '下雨': '🌧️',
  '咖啡': '☕',
  '啤酒': '🍺',
  '飞机': '✈️',
  '汽车': '🚗',
  '红包': '🧧',
  '炸弹': '💣',
  '刀': '🔪',
  '菜刀': '🔪',
  '庆祝': '🎉',
  '撒花': '🎉',
  '烟花': '🎆',
  '磕头': '🙇',
  '回头': '👀',
  '跳绳': '💃',
  '挥手': '👋',
  '激动': '🤩',
  '街舞': '🕺',
  '左太极': '☯️',
  '右太极': '☯️',
  '熊猫': '🐼',
  '羊': '🐑',
  '神兽': '🦙',
  '鸭': '🦆',
  '青蛙': '🐸',
  Mufasa: '🦁',
  '认可': '👍',
  '装可爱': '🥰',
  '欣赏音乐': '🎧',
}

/** 单个表情解析结果。 */
export interface EmojiPiece {
  /** 有图片资源则为图片 URL；否则 undefined（走 Unicode / 原样）。 */
  readonly imageUrl?: string
  /** 无图片时的 Unicode emoji 兜底；没有则为 undefined。 */
  readonly unicode?: string
}

/**
 * 解析一个表情名（不含方括号）→ 图片 URL / Unicode。
 *
 * 顺序：自定义图 → 别名归一后查官方图 → 直接查官方图 → Unicode 兜底。
 */
export function resolveEmoji(name: string): EmojiPiece | undefined {
  const custom = NETEASE_CUSTOM_EMOJI_URLS[name]
  if (custom !== undefined) {
    return { imageUrl: custom, unicode: NETEASE_EMOJI_UNICODE[name] }
  }
  // 别名归一（如 亲吻 → 亲亲），再查官方图 ID
  const canonical = NETEASE_EMOJI_IDS[name] !== undefined ? name : NETEASE_EMOJI_ALIASES[name]
  if (canonical !== undefined) {
    const id = NETEASE_EMOJI_IDS[canonical]
    if (id !== undefined) {
      return {
        imageUrl: EMOJI_IMAGE_URL_TEMPLATE.replace('{ID}', id),
        unicode: NETEASE_EMOJI_UNICODE[canonical],
      }
    }
  }
  const unicode = NETEASE_EMOJI_UNICODE[name]
  if (unicode !== undefined) return { unicode }
  return undefined
}

/** 占位符正则：匹配 `[名称]`，名称 1~32 字且不含方括号 / 换行（与官方表情名长度一致）。 */
const EMOJI_TOKEN_PATTERN = /\[([^[\]\r\n]{1,32})\]/g

/** 表情图片组件 props。 */
interface EmojiImageProps {
  readonly url: string
  /** 图片加载失败时展示的兜底文本（Unicode 或原始 `[名称]`）。 */
  readonly fallback: string
  readonly name: string
}

/**
 * 表情图片：加载失败时通过 React state 降级为文本。
 *
 * 不能像以前那样在 onError 里直接 `img.replaceWith(textNode)` —— 那会绕过
 * React 协调，评论列表刷新 / 删除时对已被摘除的节点执行 removeChild 会抛错。
 */
function EmojiImage({ url, fallback, name }: EmojiImageProps): ReactNode {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback
  return createElement('img', {
    className: 'ncm-comment-item__emoji',
    src: url,
    alt: fallback,
    title: name,
    loading: 'lazy',
    decoding: 'async',
    draggable: false,
    onError: () => setFailed(true),
  })
}

/* 把一段评论正文解析成 React 节点数组： */
export function renderCommentContent(text: string): ReactNode[] {
  if (text === '') return []
  const nodes: ReactNode[] = []
  let cursor = 0
  let key = 0
  EMOJI_TOKEN_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = EMOJI_TOKEN_PATTERN.exec(text)) !== null) {
    const token = match[0]
    const name = match[1] ?? ''
    const piece = resolveEmoji(name)
    if (piece === undefined) continue // 不认识：不拆分，留在纯文本里
    const start = match.index
    if (start > cursor) nodes.push(text.slice(cursor, start))
    if (piece.imageUrl !== undefined) {
      nodes.push(
        createElement(EmojiImage, {
          key: `emoji-${key++}`,
          url: piece.imageUrl,
          fallback: piece.unicode ?? token,
          name,
        }),
      )
    } else {
      // 无图：直接渲染 Unicode emoji 文本。
      nodes.push(piece.unicode ?? token)
    }
    cursor = start + token.length
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}
