import type { Grid } from './board'
import { PALETTE } from './colors'

const TAU = Math.PI * 2

export interface DrawSettings {
  /** 传 null 得到透明背景 */
  background?: string | null
  vignette?: boolean
  showGrid?: boolean
  showPegs?: boolean
  hole?: 'fill' | 'cut' | 'none'
  holeColor?: string
}

export function beadRadius(cell: number): number {
  return cell * 0.435
}

export function drawBead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  color: string,
  settings: DrawSettings = {},
) {
  const radius = beadRadius(cell)
  const hole = settings.hole ?? 'fill'

  ctx.beginPath()
  ctx.arc(cx, cy + radius * 0.08, radius, 0, TAU)
  ctx.fillStyle = 'rgba(36, 28, 21, 0.14)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, TAU)
  ctx.fillStyle = color
  ctx.fill()

  ctx.lineWidth = Math.max(0.6, cell * 0.045)
  ctx.strokeStyle = 'rgba(36, 28, 21, 0.2)'
  ctx.stroke()

  if (hole !== 'none' && cell >= 7) {
    const holeRadius = radius * 0.31
    ctx.beginPath()
    ctx.arc(cx, cy, holeRadius * 1.28, 0, TAU)
    ctx.strokeStyle = 'rgba(36, 28, 21, 0.11)'
    ctx.lineWidth = Math.max(0.5, cell * 0.03)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, holeRadius, 0, TAU)
    if (hole === 'cut') {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000'
      ctx.fill()
      ctx.restore()
    } else {
      ctx.fillStyle = settings.holeColor ?? '#FBF5E7'
      ctx.fill()
    }
  }

  if (cell >= 11) {
    ctx.beginPath()
    ctx.arc(cx - radius * 0.26, cy - radius * 0.3, radius * 0.4, 0, TAU)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
    ctx.fill()
  }
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  cell: number,
  settings: DrawSettings = {},
) {
  const { cols, rows, cells } = grid
  const width = cols * cell
  const height = rows * cell
  const background = settings.background === undefined ? '#FBF5E7' : settings.background
  const holeColor = settings.holeColor ?? background ?? '#FBF5E7'

  ctx.clearRect(0, 0, width, height)

  if (background) {
    if (settings.vignette) {
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75,
      )
      gradient.addColorStop(0, '#FDF9EE')
      gradient.addColorStop(1, '#F2E7D2')
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = background
    }
    ctx.fillRect(0, 0, width, height)
  }

  if (settings.showPegs && cell >= 5) {
    const radius = Math.max(0.7, cell * 0.06)
    ctx.fillStyle = 'rgba(36, 28, 21, 0.1)'
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (cells[y * cols + x] !== -1) continue
        ctx.beginPath()
        ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, radius, 0, TAU)
        ctx.fill()
      }
    }
  }

  if (settings.showGrid && cell >= 7) {
    ctx.strokeStyle = 'rgba(36, 28, 21, 0.07)'
    ctx.lineWidth = 1
    for (let x = 1; x < cols; x += 1) {
      if (x % 5 === 0) continue
      ctx.beginPath()
      ctx.moveTo(x * cell + 0.5, 0)
      ctx.lineTo(x * cell + 0.5, height)
      ctx.stroke()
    }
    for (let y = 1; y < rows; y += 1) {
      if (y % 5 === 0) continue
      ctx.beginPath()
      ctx.moveTo(0, y * cell + 0.5)
      ctx.lineTo(width, y * cell + 0.5)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(36, 28, 21, 0.14)'
    for (let x = 5; x < cols; x += 5) {
      ctx.beginPath()
      ctx.moveTo(x * cell + 0.5, 0)
      ctx.lineTo(x * cell + 0.5, height)
      ctx.stroke()
    }
    for (let y = 5; y < rows; y += 5) {
      ctx.beginPath()
      ctx.moveTo(0, y * cell + 0.5)
      ctx.lineTo(width, y * cell + 0.5)
      ctx.stroke()
    }
  }

  const beadSettings: DrawSettings = {
    hole: settings.hole ?? 'fill',
    holeColor,
  }

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const value = cells[y * cols + x]
      if (value < 0 || value >= PALETTE.length) continue
      drawBead(ctx, (x + 0.5) * cell, (y + 0.5) * cell, cell, PALETTE[value].hex, beadSettings)
    }
  }
}
