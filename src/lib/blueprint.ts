import type { Grid } from './board'
import { PALETTE, hexToRgb } from './colors'

/**
 * 拼豆图纸：把画布排成可以直接照着拼的打印稿。
 * 所有尺寸都以毫米为单位计算，最后按目标 DPI 一次性放大绘制。
 */

export const MM_PER_INCH = 25.4

/** A4 竖版，单位 mm */
export const A4 = { width: 210, height: 297 }

export interface BlueprintOptions {
  /** 每格写色号数字，黑白打印也能照着拼 */
  codes: boolean
  /** 底部色号对照表 */
  legend: boolean
  /** 行列编号 */
  ruler: boolean
  /** 用圆豆代替方格：更接近画布，但对比度与对齐性会下降 */
  beads: boolean
}

export const DEFAULT_BLUEPRINT: BlueprintOptions = {
  codes: true,
  legend: true,
  ruler: true,
  beads: false,
}

const MARGIN = 11
const HEADER_H = 17
const RULER_W = 7.5
const RULER_H = 7
const FOOT_H = 10
const LEGEND_TITLE_H = 6
const LEGEND_ROW_H = 5.2
const LEGEND_COLS = 4
/** 单格最多 7mm，再大就显得松散 */
const CELL_MAX = 7
/** 低于 4.2mm 时数字开始糊，宁可多分一页 */
const CELL_MIN = 4.2
const PAGE_LIMIT = 6

const INK = '#241C15'
const INK_SOFT = '#6B5B49'
const SANS = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif'
const MONO = '"SFMono-Regular", Menlo, Consolas, "DejaVu Sans Mono", monospace'

export interface BlueprintPage {
  index: number
  total: number
  /** 含起始、不含结束 */
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}

export interface BlueprintPlan {
  cellMm: number
  perPageCols: number
  perPageRows: number
  pages: BlueprintPage[]
  /** 网格左上角在纸上的位置（mm） */
  gridX: number
  gridY: number
  legendRows: number
  legendHeight: number
  used: { index: number; count: number }[]
  total: number
}
export function countColors(grid: Grid): { index: number; count: number }[] {
  const counts = new Map<number, number>()
  for (const value of grid.cells) {
    if (value < 0) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([index, count]) => ({ index, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 挑一个「页数尽量少、格子尽量大」的排法。
 * 1 页能放下就 1 页；放不下时先满足单格不小于 4.2mm，再看总页数。
 */
export function planBlueprint(grid: Grid, options: BlueprintOptions): BlueprintPlan {
  const used = countColors(grid)
  const legendRows = options.legend && used.length > 0 ? Math.ceil(used.length / LEGEND_COLS) : 0
  const legendHeight = legendRows > 0 ? LEGEND_TITLE_H + legendRows * LEGEND_ROW_H : 0

  const areaW = A4.width - MARGIN * 2 - (options.ruler ? RULER_W : 0)
  const areaH =
    A4.height - MARGIN * 2 - HEADER_H - (options.ruler ? RULER_H : 0) - FOOT_H - legendHeight

  let best: { nx: number; ny: number; cellMm: number } | null = null
  for (let nx = 1; nx <= PAGE_LIMIT; nx += 1) {
    for (let ny = 1; ny <= PAGE_LIMIT; ny += 1) {
      const perCols = Math.ceil(grid.cols / nx)
      const perRows = Math.ceil(grid.rows / ny)
      const cellMm = Math.min(areaW / perCols, areaH / perRows, CELL_MAX)
      if (cellMm < CELL_MIN) continue
      if (
        best === null ||
        nx * ny < best.nx * best.ny ||
        (nx * ny === best.nx * best.ny && cellMm > best.cellMm + 0.01)
      ) {
        best = { nx, ny, cellMm }
      }
    }
  }

  if (best === null) {
    // 极端尺寸（远超 64 格）兜底：按最小格算需要几页就几页
    const nx = Math.max(1, Math.ceil(grid.cols / Math.floor(areaW / CELL_MIN)))
    const ny = Math.max(1, Math.ceil(grid.rows / Math.floor(areaH / CELL_MIN)))
    const perCols = Math.ceil(grid.cols / nx)
    const perRows = Math.ceil(grid.rows / ny)
    best = { nx, ny, cellMm: Math.min(areaW / perCols, areaH / perRows) }
  }

  const { nx, ny, cellMm } = best
  const perPageCols = Math.ceil(grid.cols / nx)
  const perPageRows = Math.ceil(grid.rows / ny)

  const pages: BlueprintPage[] = []
  const total = nx * ny
  for (let py = 0; py < ny; py += 1) {
    for (let px = 0; px < nx; px += 1) {
      pages.push({
        index: py * nx + px,
        total,
        colStart: px * perPageCols,
        colEnd: Math.min(grid.cols, (px + 1) * perPageCols),
        rowStart: py * perPageRows,
        rowEnd: Math.min(grid.rows, (py + 1) * perPageRows),
      })
    }
  }

  // 网格比可用高度矮时上下居中，别把纸面下半截空成一片
  const offsetY = Math.max(0, (areaH - perPageRows * cellMm) / 2)

  return {
    cellMm,
    perPageCols,
    perPageRows,
    pages,
    gridX: MARGIN + (options.ruler ? RULER_W : 0),
    gridY: MARGIN + HEADER_H + (options.ruler ? RULER_H : 0) + offsetY,
    legendRows,
    legendHeight,
    used,
    total: used.reduce((sum, item) => sum + item.count, 0),
  }
}

export interface RenderArgs {
  grid: Grid
  plan: BlueprintPlan
  page: BlueprintPage
  options: BlueprintOptions
  /** 输出分辨率，打印 / 导出用 300，预览用 110 左右就够 */
  dpi: number
}

const font = (mm: number, weight: number, family = SANS) => `${weight} ${mm}px ${family}`

function cropMark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath()
  ctx.moveTo(x - 2.6, y)
  ctx.lineTo(x + 2.6, y)
  ctx.moveTo(x, y - 2.6)
  ctx.lineTo(x, y + 2.6)
  ctx.stroke()
}

/** 画一页图纸，返回离屏 canvas（调用方决定编码或丢弃） */
export function renderBlueprintPage({ grid, plan, page, options, dpi }: RenderArgs): HTMLCanvasElement {
  const k = dpi / MM_PER_INCH
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(A4.width * k)
  canvas.height = Math.round(A4.height * k)

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.scale(k, k)

  // 纸
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, A4.width, A4.height)

  const cell = plan.cellMm
  const gx = plan.gridX
  const gy = plan.gridY
  const pageCols = page.colEnd - page.colStart
  const pageRows = page.rowEnd - page.rowStart
  const gridW = pageCols * cell
  const gridH = pageRows * cell
  const right = A4.width - MARGIN

  /* ---------- 页眉 ---------- */
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = INK
  ctx.font = font(6.4, 700)
  ctx.fillText('拼豆图纸', MARGIN, MARGIN + 6.6)

  ctx.fillStyle = INK_SOFT
  ctx.font = font(2.3, 500, MONO)
  ctx.fillText(
    `PERLER STUDIO · ${grid.cols} × ${grid.rows} · ${cell.toFixed(1)} MM / 格 · ${options.beads ? 'BEADS' : 'GRID'}`,
    MARGIN,
    MARGIN + 11.8,
  )

  ctx.textAlign = 'right'
  ctx.fillStyle = INK
  ctx.font = font(3, 700)
  ctx.fillText(`第 ${page.index + 1} / ${page.total} 张`, right, MARGIN + 5.4)

  ctx.fillStyle = INK_SOFT
  ctx.font = font(2.4, 500)
  ctx.fillText(
    `列 ${page.colStart + 1}–${page.colEnd} · 行 ${page.rowStart + 1}–${page.rowEnd}`,
    right,
    MARGIN + 10.8,
  )

  /* ---------- 行列编号 ---------- */
  if (options.ruler) {
    const size = Math.min(cell * 0.52, 2.5)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    for (let c = page.colStart; c < page.colEnd; c += 1) {
      const strong = (c + 1) % 5 === 0
      ctx.font = font(size, strong ? 700 : 500, MONO)
      ctx.fillStyle = strong ? INK : INK_SOFT
      ctx.fillText(String(c + 1), gx + (c - page.colStart + 0.5) * cell, gy - 1.5)
    }

    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let r = page.rowStart; r < page.rowEnd; r += 1) {
      const strong = (r + 1) % 5 === 0
      ctx.font = font(size, strong ? 700 : 500, MONO)
      ctx.fillStyle = strong ? INK : INK_SOFT
      ctx.fillText(String(r + 1), gx - 1.7, gy + (r - page.rowStart + 0.5) * cell)
    }
  }

  /* ---------- 格子底色 / 圆豆 ---------- */
  if (options.beads) {
    // 圆豆：直径占约 88%，豆间留缝，看起来更接近画布
    const r = cell * 0.44
    for (let row = page.rowStart; row < page.rowEnd; row += 1) {
      for (let c = page.colStart; c < page.colEnd; c += 1) {
        const value = grid.cells[row * grid.cols + c]
        if (value < 0 || value >= PALETTE.length) continue
        const color = PALETTE[value]
        const [cr, cg, cb] = hexToRgb(color.hex)
        const cx = gx + (c - page.colStart + 0.5) * cell
        const cy = gy + (row - page.rowStart + 0.5) * cell

        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = options.codes ? `rgba(${cr}, ${cg}, ${cb}, 0.34)` : color.hex
        ctx.fill()
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${options.codes ? 0.62 : 0.45})`
        ctx.lineWidth = 0.1
        ctx.stroke()

        // 没有色号时画中心孔，让豆子看起来完整；有色号时孔位留给数字
        if (!options.codes) {
          ctx.beginPath()
          ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2)
          ctx.fillStyle = '#FFFFFF'
          ctx.fill()
        }
      }
    }
  } else {
    const inset = options.codes ? 0.06 : 0.16
    for (let r = page.rowStart; r < page.rowEnd; r += 1) {
      for (let c = page.colStart; c < page.colEnd; c += 1) {
        const value = grid.cells[r * grid.cols + c]
        if (value < 0 || value >= PALETTE.length) continue
        const color = PALETTE[value]
        if (options.codes) {
          const [cr, cg, cb] = hexToRgb(color.hex)
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.3)`
        } else {
          ctx.fillStyle = color.hex
        }
        ctx.fillRect(
          gx + (c - page.colStart) * cell + inset,
          gy + (r - page.rowStart) * cell + inset,
          cell - inset * 2,
          cell - inset * 2,
        )
      }
    }
  }

  /* ---------- 网格线 ---------- */
  ctx.lineCap = 'butt'
  // 圆豆样式下不画逐格线（会把豆子切成方块），只留每 5 格的参考线与外框
  if (!options.beads) {
    ctx.strokeStyle = 'rgba(36, 28, 21, 0.26)'
    ctx.lineWidth = 0.12
    ctx.beginPath()
    for (let c = 1; c < pageCols; c += 1) {
      if ((page.colStart + c) % 5 === 0) continue
      const x = gx + c * cell
      ctx.moveTo(x, gy)
      ctx.lineTo(x, gy + gridH)
    }
    for (let r = 1; r < pageRows; r += 1) {
      if ((page.rowStart + r) % 5 === 0) continue
      const y = gy + r * cell
      ctx.moveTo(gx, y)
      ctx.lineTo(gx + gridW, y)
    }
    ctx.stroke()
  }

  if (!options.beads || options.ruler) {
    // 圆豆样式只留一层很淡的 5 格辅助线，退到背景里，不抢豆子
    ctx.strokeStyle = options.beads ? 'rgba(36, 28, 21, 0.1)' : 'rgba(36, 28, 21, 0.5)'
    ctx.lineWidth = options.beads ? 0.16 : 0.32
    ctx.beginPath()
    for (let c = 1; c < pageCols; c += 1) {
      if ((page.colStart + c) % 5 !== 0) continue
      const x = gx + c * cell
      ctx.moveTo(x, gy)
      ctx.lineTo(x, gy + gridH)
    }
    for (let r = 1; r < pageRows; r += 1) {
      if ((page.rowStart + r) % 5 !== 0) continue
      const y = gy + r * cell
      ctx.moveTo(gx, y)
      ctx.lineTo(gx + gridW, y)
    }
    ctx.stroke()
  }

  ctx.strokeStyle = INK
  ctx.lineWidth = 0.5
  ctx.strokeRect(gx, gy, gridW, gridH)

  /* ---------- 色号数字 ---------- */
  if (options.codes) {
    // 圆豆内部能写字的地方更小，字号收一点避免压到弧边
    const size = options.beads ? Math.min(cell * 0.4, 2.5) : Math.min(cell * 0.46, 2.9)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = font(size, 600, MONO)
    ctx.fillStyle = 'rgba(30, 23, 17, 0.9)'
    for (let r = page.rowStart; r < page.rowEnd; r += 1) {
      for (let c = page.colStart; c < page.colEnd; c += 1) {
        const value = grid.cells[r * grid.cols + c]
        if (value < 0 || value >= PALETTE.length) continue
        ctx.fillText(
          String(value + 1),
          gx + (c - page.colStart + 0.5) * cell,
          gy + (r - page.rowStart + 0.5) * cell + size * 0.04,
        )
      }
    }
  }

  /* ---------- 四角十字：拼页时对齐用 ---------- */
  ctx.strokeStyle = 'rgba(36, 28, 21, 0.55)'
  ctx.lineWidth = 0.22
  cropMark(ctx, gx, gy)
  cropMark(ctx, gx + gridW, gy)
  cropMark(ctx, gx, gy + gridH)
  cropMark(ctx, gx + gridW, gy + gridH)

  /* ---------- 色号对照 ---------- */
  if (plan.legendRows > 0 && plan.used.length > 0) {
    const legendBottom = A4.height - MARGIN - FOOT_H
    const legendTop = legendBottom - plan.legendHeight
    const colWidth = (A4.width - MARGIN * 2) / LEGEND_COLS

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = INK_SOFT
    ctx.font = font(2.4, 700)
    ctx.fillText('色号对照 · 数字 = 图纸上的色号', MARGIN, legendTop + 2.6)

    plan.used.forEach((item, i) => {
      const color = PALETTE[item.index]
      const col = i % LEGEND_COLS
      const row = Math.floor(i / LEGEND_COLS)
      const x = MARGIN + col * colWidth
      const y = legendTop + LEGEND_TITLE_H + row * LEGEND_ROW_H + LEGEND_ROW_H / 2

      ctx.fillStyle = color.hex
      ctx.fillRect(x, y - 1.6, 3.2, 3.2)
      ctx.strokeStyle = 'rgba(36, 28, 21, 0.45)'
      ctx.lineWidth = 0.15
      ctx.strokeRect(x, y - 1.6, 3.2, 3.2)

      ctx.textAlign = 'left'
      ctx.font = font(2.3, 700, MONO)
      ctx.fillStyle = INK
      ctx.fillText(String(item.index + 1), x + 4.6, y)

      ctx.font = font(2.2, 500)
      ctx.fillStyle = INK_SOFT
      ctx.fillText(`${color.name} ×${item.count}`, x + 9.4, y)
    })
  }

  /* ---------- 页脚 ---------- */
  const footY = A4.height - MARGIN - 2
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = font(2.2, 500)
  ctx.fillStyle = INK_SOFT
  ctx.fillText(
    page.total > 1
      ? `空位代表不放豆 · 共 ${page.total} 张，按四角十字对齐拼接 · 请按 100% 实际大小打印`
      : '空位代表不放豆 · 请按 100% 实际大小打印',
    MARGIN,
    footY,
  )

  ctx.textAlign = 'right'
  ctx.font = font(2.2, 500, MONO)
  ctx.fillText(`${plan.total} BEADS · ${page.index + 1}/${page.total}`, right, footY)

  return canvas
}
