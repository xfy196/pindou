import { EMPTY } from './board'
import { paletteIndex } from './colors'

export type PatternId = 'heart' | 'star' | 'rainbow' | 'mushroom'

export const PATTERNS: { id: PatternId; name: string; note: string }[] = [
  { id: 'heart', name: '一颗心', note: '暖红渐变' },
  { id: 'star', name: '小星星', note: '五角星' },
  { id: 'rainbow', name: '彩虹云', note: '六色拱桥' },
  { id: 'mushroom', name: '蘑菇仔', note: '奶油白点' },
]

function paint(cells: number[], cols: number, x: number, y: number, color: number) {
  if (x < 0 || y < 0) return
  if (x >= cols || y * cols + x >= cells.length) return
  cells[y * cols + x] = color
}

function heart(cells: number[], cols: number, rows: number) {
  const size = Math.min(cols, rows) / 2 / 1.36
  const cx = cols / 2
  const cy = rows / 2
  const light = paletteIndex('P10')
  const mid = paletteIndex('P11')
  const dark = paletteIndex('P12')

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const nx = (x + 0.5 - cx) / size
      const ny = -(y + 0.5 - cy) / size
      const t = nx * nx + ny * ny - 1
      const f = t * t * t - nx * nx * ny * ny * ny
      if (f > 0) continue

      let color = mid
      if (ny > 0.42) color = light
      else if (ny < -0.4) color = dark

      paint(cells, cols, x, y, color)
    }
  }
}

function star(cells: number[], cols: number, rows: number) {
  const outer = Math.min(cols, rows) / 2 * 0.94
  const inner = outer * 0.4
  const cx = cols / 2
  const cy = rows / 2
  const points: [number, number][] = []

  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const radius = i % 2 === 0 ? outer : inner
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius])
  }

  const inside = (px: number, py: number) => {
    let hit = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i]
      const [xj, yj] = points[j]
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }

  const center = paletteIndex('P07')
  const mid = paletteIndex('P08')
  const edge = paletteIndex('P09')

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!inside(x + 0.5, y + 0.5)) continue
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / outer
      const color = distance < 0.34 ? center : distance < 0.72 ? mid : edge
      paint(cells, cols, x, y, color)
    }
  }
}

function rainbow(cells: number[], cols: number, rows: number) {
  const cx = cols / 2
  const cy = rows * 0.99
  const radius = Math.min(cols * 0.47, rows * 0.86)
  const band = radius / 7.4
  const colors = ['P11', 'P09', 'P08', 'P24', 'P19', 'P17'].map(paletteIndex)

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const dx = x + 0.5 - cx
      const dy = cy - (y + 0.5)
      if (dy <= 0) continue
      const distance = Math.hypot(dx, dy)
      const index = Math.floor((radius - distance) / band)
      if (index < 0 || index >= colors.length) continue
      paint(cells, cols, x, y, colors[index])
    }
  }

  const cloud = paletteIndex('P01')
  const puff = (ox: number, oy: number, r: number) => {
    for (let y = Math.floor(oy - r); y <= oy + r; y += 1) {
      for (let x = Math.floor(ox - r); x <= ox + r; x += 1) {
        if ((x + 0.5 - ox) ** 2 + (y + 0.5 - oy) ** 2 <= r * r) paint(cells, cols, x, y, cloud)
      }
    }
  }

  const cloudY = cy - band * 0.9
  for (const side of [-1, 1]) {
    const baseX = cx + side * radius * 0.98
    puff(baseX, cloudY, band * 1.25)
    puff(baseX - band * 1.15, cloudY + band * 0.55, band * 0.95)
    puff(baseX + band * 1.15, cloudY + band * 0.55, band * 0.95)
  }
}

const MUSHROOM = [
  '...................',
  '.......RRRRR.......',
  '.....RRRRRRRRR.....',
  '...RRRRRRRRRRRRR...',
  '..RRRWWRRRRRWWRRR..',
  '.RRRWWWWRRRWWWWRRR.',
  '.RRRWWWWRRRWWWWRRR.',
  'RRRRWWRRRRRRRWWRRRR',
  'RRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRR',
  '.RRRRRRRRRRRRRRRRR.',
  '..DDDDDDDDDDDDDDD..',
  '.....CCCCCCCCC.....',
  '.....CCCCCCCCC.....',
  '.....CCKKCCCKK.....',
  '.....CCKKCCCKK.....',
  '.....CCCCCCCCC.....',
  '......CCCCCCC......',
  '.......CCCCC.......',
]

const MUSHROOM_KEYS: Record<string, string> = {
  R: 'P11',
  D: 'P12',
  W: 'P01',
  C: 'P02',
  K: 'P06',
}

function mushroom(cells: number[], cols: number, rows: number) {
  const srcH = MUSHROOM.length
  const srcW = MUSHROOM[0].length
  let scale = Math.min(cols / srcW, rows / srcH)
  if (scale >= 1) scale = Math.floor(scale)
  const drawW = Math.round(srcW * scale)
  const drawH = Math.round(srcH * scale)
  const offsetX = Math.round((cols - drawW) / 2)
  const offsetY = Math.round((rows - drawH) / 2)

  for (let y = 0; y < drawH; y += 1) {
    for (let x = 0; x < drawW; x += 1) {
      const sx = Math.min(srcW - 1, Math.floor(x / scale))
      const sy = Math.min(srcH - 1, Math.floor(y / scale))
      const key = MUSHROOM[sy][sx]
      const id = MUSHROOM_KEYS[key]
      if (!id) continue
      paint(cells, cols, offsetX + x, offsetY + y, paletteIndex(id))
    }
  }
}

export function buildPattern(id: PatternId, cols: number, rows: number): number[] {
  const cells = new Array<number>(cols * rows).fill(EMPTY)
  if (id === 'heart') heart(cells, cols, rows)
  else if (id === 'star') star(cells, cols, rows)
  else if (id === 'rainbow') rainbow(cells, cols, rows)
  else mushroom(cells, cols, rows)
  return cells
}
