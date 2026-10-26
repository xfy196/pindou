export type GroupKey = 'basic' | 'warm' | 'cool' | 'earth' | 'special'

export interface BeadColor {
  id: string
  name: string
  hex: string
  group: GroupKey
}

export const GROUPS: { key: GroupKey; label: string; en: string }[] = [
  { key: 'basic', label: '基础', en: 'BASIC' },
  { key: 'warm', label: '暖调', en: 'WARM' },
  { key: 'cool', label: '冷调', en: 'COOL' },
  { key: 'earth', label: '大地', en: 'EARTH' },
  { key: 'special', label: '特别', en: 'SPECIAL' },
]

/** 一盒常用的拼豆配色（近似 Hama / Perler 色卡） */
export const PALETTE: BeadColor[] = [
  { id: 'P01', name: '珍珠白', hex: '#F8F6EF', group: 'basic' },
  { id: 'P02', name: '奶油', hex: '#F3E3C3', group: 'basic' },
  { id: 'P03', name: '亚麻', hex: '#E4D0AE', group: 'basic' },
  { id: 'P04', name: '浅灰', hex: '#C9CAC5', group: 'basic' },
  { id: 'P05', name: '中灰', hex: '#8B8D88', group: 'basic' },
  { id: 'P06', name: '炭黑', hex: '#2A2523', group: 'basic' },

  { id: 'P07', name: '柠檬黄', hex: '#F6DE52', group: 'warm' },
  { id: 'P08', name: '向日葵', hex: '#FBBF24', group: 'warm' },
  { id: 'P09', name: '南瓜橙', hex: '#EE8420', group: 'warm' },
  { id: 'P10', name: '珊瑚', hex: '#FF7A5C', group: 'warm' },
  { id: 'P11', name: '朱红', hex: '#E1492F', group: 'warm' },
  { id: 'P12', name: '樱桃', hex: '#C31F30', group: 'warm' },
  { id: 'P13', name: '玫瑰粉', hex: '#F5A3C0', group: 'warm' },
  { id: 'P14', name: '蜜桃', hex: '#F7C7AE', group: 'warm' },
  { id: 'P15', name: '洋红', hex: '#DE3D86', group: 'warm' },

  { id: 'P16', name: '薰衣草', hex: '#C5A8E8', group: 'cool' },
  { id: 'P17', name: '葡萄紫', hex: '#7A4A9F', group: 'cool' },
  { id: 'P18', name: '雾蓝', hex: '#AACEEB', group: 'cool' },
  { id: 'P19', name: '天蓝', hex: '#5FB6E5', group: 'cool' },
  { id: 'P20', name: '湖蓝', hex: '#1C86C4', group: 'cool' },
  { id: 'P21', name: '海军蓝', hex: '#24467C', group: 'cool' },
  { id: 'P22', name: '薄荷', hex: '#A4E5D1', group: 'cool' },
  { id: 'P23', name: '青瓷', hex: '#4FBEA3', group: 'cool' },
  { id: 'P24', name: '草绿', hex: '#4AA34E', group: 'cool' },
  { id: 'P25', name: '抹茶', hex: '#B3C87C', group: 'cool' },
  { id: 'P26', name: '森林绿', hex: '#1F6B4A', group: 'cool' },
  { id: 'P27', name: '天青', hex: '#8FD2D6', group: 'cool' },

  { id: 'P28', name: '沙黄', hex: '#D8BC90', group: 'earth' },
  { id: 'P29', name: '焦糖', hex: '#BF8047', group: 'earth' },
  { id: 'P30', name: '栗棕', hex: '#8A5A33', group: 'earth' },
  { id: 'P31', name: '深咖', hex: '#4D3423', group: 'earth' },
  { id: 'P32', name: '砖红', hex: '#A84B32', group: 'earth' },
  { id: 'P33', name: '陶土', hex: '#C96F52', group: 'earth' },

  { id: 'P34', name: '香槟金', hex: '#D6B24A', group: 'special' },
  { id: 'P35', name: '月光银', hex: '#B9C0C7', group: 'special' },
  { id: 'P36', name: '荧光粉', hex: '#FF4F9E', group: 'special' },
  { id: 'P37', name: '荧光绿', hex: '#C8F04C', group: 'special' },
  { id: 'P38', name: '荧光橙', hex: '#FF8C1A', group: 'special' },
  { id: 'P39', name: '夜光', hex: '#DFF3C4', group: 'special' },
]

const byId = new Map(PALETTE.map((c, i) => [c.id, i]))

export function paletteIndex(id: string): number {
  const index = byId.get(id)
  return index === undefined ? 0 : index
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

function toLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export type Lab = [number, number, number]

export function rgbToLab(r: number, g: number, b: number): Lab {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)

  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x)
  const fy = f(y)
  const fz = f(z)

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export const PALETTE_LAB: Lab[] = PALETTE.map((color) => {
  const [r, g, b] = hexToRgb(color.hex)
  return rgbToLab(r, g, b)
})

export const PALETTE_RGB = PALETTE.map((color) => hexToRgb(color.hex))

/** CIE76 距离，足够用来找最接近的豆子颜色 */
export function nearestPaletteIndex(r: number, g: number, b: number): number {
  const [l, a, bb] = rgbToLab(r, g, b)
  let best = 0
  let bestDistance = Infinity

  for (let i = 0; i < PALETTE_LAB.length; i += 1) {
    const [pl, pa, pb] = PALETTE_LAB[i]
    const dl = l - pl
    const da = a - pa
    const db = bb - pb
    const distance = dl * dl + da * da + db * db
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  }

  return best
}
