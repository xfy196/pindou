import { EMPTY } from './board'
import { nearestPaletteIndex, PALETTE_RGB } from './colors'

export interface ConvertOptions {
  dither: boolean
  dropLight: boolean
  fit: 'cover' | 'contain'
}

export interface ConvertResult {
  cells: number[]
  beads: number
  colors: number
}

export function imageToBeads(
  image: HTMLImageElement,
  cols: number,
  rows: number,
  options: ConvertOptions,
): ConvertResult {
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const cells = new Array<number>(cols * rows).fill(EMPTY)
  if (!ctx) return { cells, beads: 0, colors: 0 }

  ctx.clearRect(0, 0, cols, rows)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const scale =
    options.fit === 'cover'
      ? Math.max(cols / width, rows / height)
      : Math.min(cols / width, rows / height)
  const drawWidth = width * scale
  const drawHeight = height * scale
  ctx.drawImage(image, (cols - drawWidth) / 2, (rows - drawHeight) / 2, drawWidth, drawHeight)

  const data = ctx.getImageData(0, 0, cols, rows).data
  const buffer = new Float32Array(cols * rows * 3)
  for (let i = 0; i < cols * rows; i += 1) {
    buffer[i * 3] = data[i * 4]
    buffer[i * 3 + 1] = data[i * 4 + 1]
    buffer[i * 3 + 2] = data[i * 4 + 2]
  }

  const cache = new Map<number, number>()
  const nearest = (r: number, g: number, b: number) => {
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2)
    const cached = cache.get(key)
    if (cached !== undefined) return cached
    const index = nearestPaletteIndex(r, g, b)
    cache.set(key, index)
    return index
  }

  let beads = 0
  const used = new Set<number>()

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const i = y * cols + x
      const alpha = data[i * 4 + 3]
      if (alpha < 96) continue

      let r = Math.min(255, Math.max(0, buffer[i * 3]))
      let g = Math.min(255, Math.max(0, buffer[i * 3 + 1]))
      let b = Math.min(255, Math.max(0, buffer[i * 3 + 2]))

      if (alpha < 250) {
        const ratio = alpha / 255
        r = r * ratio + 255 * (1 - ratio)
        g = g * ratio + 255 * (1 - ratio)
        b = b * ratio + 255 * (1 - ratio)
      }

      if (options.dropLight && r > 238 && g > 238 && b > 238) continue

      const index = nearest(r, g, b)
      cells[i] = index
      beads += 1
      used.add(index)

      if (options.dither) {
        const [pr, pg, pb] = PALETTE_RGB[index]
        const er = r - pr
        const eg = g - pg
        const eb = b - pb
        const spread = (dx: number, dy: number, weight: number) => {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return
          const ni = (ny * cols + nx) * 3
          buffer[ni] += er * weight
          buffer[ni + 1] += eg * weight
          buffer[ni + 2] += eb * weight
        }
        spread(1, 0, 7 / 16)
        spread(-1, 1, 3 / 16)
        spread(0, 1, 5 / 16)
        spread(1, 1, 1 / 16)
      }
    }
  }

  return { cells, beads, colors: used.size }
}
