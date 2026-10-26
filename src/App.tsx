import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bead } from './components/BeadSwatch'
import { BeadList, type UsedColor } from './components/BeadList'
import { Board } from './components/Board'
import {
  CheckIcon,
  DownloadIcon,
  GridIcon,
  ImageIcon,
  MirrorIcon,
  PrinterIcon,
  RedoIcon,
  SaveIcon,
  TrashIcon,
  UndoIcon,
} from './components/Icons'
import { ImportModal } from './components/ImportModal'
import { PalettePanel } from './components/PalettePanel'
import { PatternBar } from './components/PatternBar'
import { PrintModal } from './components/PrintModal'
import { ToastStack, type ToastItem } from './components/Toast'
import { ToolRail } from './components/ToolRail'
import { isSameGrid, EMPTY, type Grid } from './lib/board'
import { PALETTE, paletteIndex } from './lib/colors'
import { downloadBlob } from './lib/download'
import { drawBoard } from './lib/draw'
import { buildPattern, PATTERNS, type PatternId } from './lib/patterns'
import { BOARDS, TOOLS, type Point, type Tool } from './lib/types'

const STORAGE_KEY = 'pindou.studio.v1'
const DEFAULT_SIZE = 29
const DEFAULT_COLOR = paletteIndex('P11')
const DEFAULT_TOOL: Tool = 'brush'
const ZOOM_MIN = 50
const ZOOM_MAX = 220
const ZOOM_DEFAULT = 100

interface SavedPrefs {
  /** 存色号而不是下标，将来色卡顺序变了也不会串色 */
  color: string
  tool: Tool
  showGrid: boolean
  mirror: boolean
  zoom: number
}

interface SavedState {
  grid: Grid
  prefs: SavedPrefs
}

const TOOL_IDS = new Set<string>(TOOLS.map((item) => item.id))

function fallbackPrefs(): SavedPrefs {
  return {
    color: PALETTE[DEFAULT_COLOR].id,
    tool: DEFAULT_TOOL,
    showGrid: true,
    mirror: false,
    zoom: ZOOM_DEFAULT,
  }
}

function resolveColorIndex(id: string): number {
  const index = PALETTE.findIndex((color) => color.id === id)
  return index >= 0 ? index : DEFAULT_COLOR
}

function clampZoom(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ZOOM_DEFAULT
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(value)))
}

/** 读回上一次的画布与偏好；任何一项不合法都退回默认，不让坏数据把界面带崩 */
function readSavedState(): SavedState {
  const fallbackGrid: Grid = {
    cols: DEFAULT_SIZE,
    rows: DEFAULT_SIZE,
    cells: buildPattern('heart', DEFAULT_SIZE, DEFAULT_SIZE),
  }
  const fallback: SavedState = { grid: fallbackGrid, prefs: fallbackPrefs() }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback

    const saved = JSON.parse(raw) as {
      cols?: unknown
      rows?: unknown
      cells?: unknown
      prefs?: Partial<SavedPrefs>
    }

    const { cols, rows, cells } = saved
    const grid: Grid =
      Number.isInteger(cols) &&
      Number.isInteger(rows) &&
      Array.isArray(cells) &&
      cells.length === (cols as number) * (rows as number)
        ? {
            cols: cols as number,
            rows: rows as number,
            cells: cells.map((value) =>
              typeof value === 'number' && value >= 0 && value < PALETTE.length ? value : EMPTY,
            ),
          }
        : fallbackGrid

    const prefs = saved.prefs ?? {}
    const base = fallbackPrefs()
    return {
      grid,
      prefs: {
        color: typeof prefs.color === 'string' ? prefs.color : base.color,
        tool: typeof prefs.tool === 'string' && TOOL_IDS.has(prefs.tool) ? prefs.tool : base.tool,
        showGrid: typeof prefs.showGrid === 'boolean' ? prefs.showGrid : base.showGrid,
        mirror: typeof prefs.mirror === 'boolean' ? prefs.mirror : base.mirror,
        zoom: clampZoom(prefs.zoom),
      },
    }
  } catch {
    // 隐私模式下 localStorage 可能不可用，直接用默认图案
    return fallback
  }
}

function BrandMark() {
  const beads: [number, number, string][] = [
    [8, 8, '#E1492F'],
    [24, 8, '#FBBF24'],
    [8, 24, '#4FBEA3'],
    [24, 24, '#5FB6E5'],
  ]
  return (
    <svg viewBox="0 0 32 32" width={26} height={26} aria-hidden="true">
      {beads.map(([x, y, color]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="6.4" fill={color} />
          <circle cx={x} cy={y} r="1.9" fill="#FFFCF5" />
        </g>
      ))}
    </svg>
  )
}

export default function App() {
  const [boot] = useState(readSavedState)
  const [grid, setGridState] = useState<Grid>(boot.grid)
  const gridRef = useRef(grid)
  const strokeRef = useRef<{ base: Grid; pushed: boolean } | null>(null)
  const undoRef = useRef<Grid[]>([])
  const redoRef = useRef<Grid[]>([])
  const [hist, setHist] = useState({ u: 0, r: 0 })

  const [tool, setTool] = useState<Tool>(boot.prefs.tool)
  const [colorIndex, setColorIndex] = useState(() => resolveColorIndex(boot.prefs.color))
  const [zoom, setZoom] = useState(boot.prefs.zoom)
  const [showGrid, setShowGrid] = useState(boot.prefs.showGrid)
  const [mirror, setMirror] = useState(boot.prefs.mirror)
  const [fitCell, setFitCell] = useState(18)
  const [hover, setHover] = useState<Point | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [justSaved, setJustSaved] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const toastTimers = useRef<number[]>([])
  const savedTimer = useRef<number | undefined>(undefined)

  const cell = Math.max(4, Math.min(56, Math.round((fitCell * zoom) / 100)))

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setToasts((items) => [...items.slice(-1), { id, message }])
    const timer = window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id))
    }, 2600)
    toastTimers.current.push(timer)
  }, [])

  useEffect(() => {
    const timers = toastTimers
    const saved = savedTimer
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(saved.current)
    }
  }, [])

  const commitGrid = useCallback((next: Grid) => {
    gridRef.current = next
    setGridState(next)
  }, [])

  const pushHistory = useCallback((snapshot: Grid) => {
    undoRef.current.push({
      cols: snapshot.cols,
      rows: snapshot.rows,
      cells: snapshot.cells.slice(),
    })
    if (undoRef.current.length > 60) undoRef.current.shift()
    redoRef.current = []
    setHist({ u: undoRef.current.length, r: 0 })
  }, [])

  const beginStroke = useCallback(() => {
    strokeRef.current = { base: gridRef.current, pushed: false }
  }, [])

  const endStroke = useCallback(() => {
    strokeRef.current = null
  }, [])

  const applyGrid = useCallback(
    (next: Grid) => {
      const stroke = strokeRef.current
      const current = gridRef.current

      if (stroke) {
        if (!stroke.pushed && !isSameGrid(stroke.base, next)) {
          pushHistory(stroke.base)
          stroke.pushed = true
        }
      } else if (!isSameGrid(current, next)) {
        pushHistory(current)
      }

      commitGrid(next)
    },
    [commitGrid, pushHistory],
  )

  const undo = useCallback(() => {
    const previous = undoRef.current.pop()
    if (!previous) return
    const current = gridRef.current
    redoRef.current.push({
      cols: current.cols,
      rows: current.rows,
      cells: current.cells.slice(),
    })
    setHist({ u: undoRef.current.length, r: redoRef.current.length })
    commitGrid(previous)
    if (current.cols !== previous.cols || current.rows !== previous.rows) setZoom(ZOOM_DEFAULT)
  }, [commitGrid])

  const redo = useCallback(() => {
    const next = redoRef.current.pop()
    if (!next) return
    const current = gridRef.current
    undoRef.current.push({
      cols: current.cols,
      rows: current.rows,
      cells: current.cells.slice(),
    })
    setHist({ u: undoRef.current.length, r: redoRef.current.length })
    commitGrid(next)
    if (current.cols !== next.cols || current.rows !== next.rows) setZoom(ZOOM_DEFAULT)
  }, [commitGrid])

  // 偏好单独放 ref：写入时总是拿到最新值，也让 persistNow 保持稳定引用
  const prefsRef = useRef<SavedPrefs>(boot.prefs)
  useEffect(() => {
    prefsRef.current = {
      color: PALETTE[colorIndex].id,
      tool,
      showGrid,
      mirror,
      zoom,
    }
  }, [colorIndex, tool, showGrid, mirror, zoom])

  const persistNow = useCallback(() => {
    const current = gridRef.current
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          cols: current.cols,
          rows: current.rows,
          cells: current.cells,
          prefs: prefsRef.current,
        }),
      )
      return true
    } catch {
      return false
    }
  }, [])

  const saveNow = useCallback(() => {
    if (!persistNow()) {
      toast('保存失败，浏览器可能禁用了本地存储')
      return
    }
    setJustSaved(true)
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setJustSaved(false), 1800)
    toast('已保存到这台设备')
  }, [persistNow, toast])

  // 停下来 600ms 后落盘
  useEffect(() => {
    const timer = window.setTimeout(persistNow, 600)
    return () => window.clearTimeout(timer)
  }, [grid, tool, colorIndex, showGrid, mirror, zoom, persistNow])

  // 页面被切走 / 关闭时立刻补写一次，避免防抖窗口内丢笔
  useEffect(() => {
    const flush = () => {
      persistNow()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [persistNow])

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const measure = () => {
      const rect = element.getBoundingClientRect()
      const padding = 64
      const byWidth = (rect.width - padding) / grid.cols
      const byHeight = (rect.height - padding) / grid.rows
      const fit = Math.floor(Math.min(byWidth, byHeight))
      setFitCell(Math.max(4, Math.min(44, fit || 4)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [grid.cols, grid.rows])

  const changeSize = useCallback(
    (size: number) => {
      const current = gridRef.current
      if (size === current.cols && size === current.rows) return
      const cells = new Array<number>(size * size).fill(-1)
      const limitX = Math.min(current.cols, size)
      const limitY = Math.min(current.rows, size)
      for (let y = 0; y < limitY; y += 1) {
        for (let x = 0; x < limitX; x += 1) {
          cells[y * size + x] = current.cells[y * current.cols + x]
        }
      }
      beginStroke()
      applyGrid({ cols: size, rows: size, cells })
      endStroke()
      setZoom(ZOOM_DEFAULT)
      toast(`画布已换成 ${size} × ${size}`)
    },
    [applyGrid, beginStroke, endStroke, toast],
  )

  const clearBoard = useCallback(() => {
    const current = gridRef.current
    beginStroke()
    applyGrid({
      cols: current.cols,
      rows: current.rows,
      cells: new Array<number>(current.cols * current.rows).fill(-1),
    })
    endStroke()
    toast('画布已清空 · 可以撤销')
  }, [applyGrid, beginStroke, endStroke, toast])

  const applyPattern = useCallback(
    (id: PatternId) => {
      const current = gridRef.current
      const name = PATTERNS.find((pattern) => pattern.id === id)?.name ?? '图案'
      beginStroke()
      applyGrid({
        cols: current.cols,
        rows: current.rows,
        cells: buildPattern(id, current.cols, current.rows),
      })
      endStroke()
      toast(`已载入「${name}」`)
    },
    [applyGrid, beginStroke, endStroke, toast],
  )

  const handleImportApply = useCallback(
    (cells: number[]) => {
      const current = gridRef.current
      const beads = cells.reduce((sum, value) => (value >= 0 ? sum + 1 : sum), 0)
      beginStroke()
      applyGrid({ cols: current.cols, rows: current.rows, cells })
      endStroke()
      setImportOpen(false)
      toast(`图片已变成 ${beads} 颗豆`)
    },
    [applyGrid, beginStroke, endStroke, toast],
  )

  const handlePick = useCallback(
    (index: number | null) => {
      if (index === null) {
        toast('这一格还是空的，换一格试试')
        return
      }
      setColorIndex(index)
    },
    [toast],
  )

  const exportPng = useCallback(() => {
    const current = gridRef.current
    const cellPx = 24
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = current.cols * cellPx * scale
    canvas.height = current.rows * cellPx * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    drawBoard(ctx, current, cellPx, {
      background: null,
      showGrid: false,
      showPegs: false,
      hole: 'cut',
    })
    canvas.toBlob((blob) => {
      if (!blob) return
      downloadBlob(blob, `pindou-${current.cols}x${current.rows}.png`)
    }, 'image/png')
    toast('PNG 已导出 · 背景透明')
  }, [toast])

  const used = useMemo<UsedColor[]>(() => {
    const counts = new Map<number, number>()
    for (const value of grid.cells) {
      if (value < 0) continue
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([index, count]) => ({ index, count }))
      .sort((a, b) => b.count - a.count)
  }, [grid])

  const total = used.reduce((sum, item) => sum + item.count, 0)

  const exportCsv = useCallback(() => {
    if (used.length === 0) return
    const rows = used.map(({ index, count }) => {
      const color = PALETTE[index]
      return [color.id, color.name, color.hex.toUpperCase(), String(count)]
    })
    const content = ['编号,颜色,色值,数量', ...rows.map((row) => row.join(','))].join('\r\n')
    downloadBlob(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }), '拼豆清单.csv')
    toast('清单已导出，可以照着买豆了')
  }, [toast, used])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target !== null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing) return

      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (mod && key === 's') {
        event.preventDefault()
        saveNow()
        return
      }
      if (mod && key === 'p') {
        // 拦下浏览器的原生打印，否则打出来的是整个工作台界面
        event.preventDefault()
        setPrintOpen(true)
        return
      }
      if (mod && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (mod) return

      if (key === 'b') setTool('brush')
      else if (key === 'e') setTool('eraser')
      else if (key === 'f') setTool('fill')
      else if (key === 'l') setTool('line')
      else if (key === 'r') setTool('rect')
      else if (key === 'i') setTool('picker')
      else if (key === 'm') setMirror((value) => !value)
      else if (key === 'g') setShowGrid((value) => !value)
      else if (key === '[') setZoom((value) => Math.max(ZOOM_MIN, value - 10))
      else if (key === ']') setZoom((value) => Math.min(ZOOM_MAX, value + 10))
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [redo, saveNow, undo])

  const activeTool = TOOLS.find((item) => item.id === tool)
  const hoverLabel = hover ? `R${String(hover.y + 1).padStart(2, '0')} · C${String(hover.x + 1).padStart(2, '0')}` : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <BrandMark />
          </span>
          <div className="brand-text">
            <h1>拼豆工作室</h1>
            <p>PERLER · STUDIO</p>
          </div>
        </div>

        <p className="tagline">
          <span className="tagline-bead" aria-hidden="true" />
          一颗一颗，拼出你想留住的画面
        </p>

        <div className="actions">
          <div className="history">
            <button
              type="button"
              className="icon-btn"
              onClick={undo}
              disabled={hist.u === 0}
              aria-label="撤销"
              title="撤销 ⌘Z"
            >
              <UndoIcon size={18} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={redo}
              disabled={hist.r === 0}
              aria-label="重做"
              title="重做 ⇧⌘Z"
            >
              <RedoIcon size={18} />
            </button>
          </div>
          <span className="action-divider" aria-hidden="true" />
          <button type="button" className="btn ghost" onClick={() => setImportOpen(true)}>
            <ImageIcon size={16} />
            <span className="btn-label">图片转豆</span>
          </button>
          <button type="button" className="btn ghost" onClick={saveNow}>
            {justSaved ? <CheckIcon size={16} /> : <SaveIcon size={16} />}
            <span className="btn-label">{justSaved ? '已保存' : '保存'}</span>
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setPrintOpen(true)}
            title="打印图纸 ⌘P"
          >
            <PrinterIcon size={16} />
            <span className="btn-label">打印图纸</span>
          </button>
          <button type="button" className="btn primary" onClick={exportPng}>
            <DownloadIcon size={16} />
            <span>导出 PNG</span>
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="col-left">
          <PalettePanel selected={colorIndex} onSelect={setColorIndex} />
          <PatternBar onPick={applyPattern} />
        </aside>

        <section className="card stage">
          <div className="stage-toolbar">
            <ToolRail tool={tool} onChange={setTool} />
            <div className="stage-meta">
              <span className="meta-tool">{activeTool?.label}</span>
              <span className="meta-hint">{activeTool?.hint}</span>
            </div>
          </div>

          <div className="board-area" ref={stageRef}>
            <Board
              grid={grid}
              cell={cell}
              showGrid={showGrid}
              tool={tool}
              colorIndex={colorIndex}
              mirror={mirror}
              focusIndex={focusIndex}
              onBegin={beginStroke}
              onApply={applyGrid}
              onEnd={endStroke}
              onPick={handlePick}
              onHover={setHover}
            />
            {total === 0 && (
              <div className="board-hint" aria-hidden="true">
                <span className="hint-beads">
                  <Bead color="#E1492F" size={18} />
                  <Bead color="#FBBF24" size={18} />
                  <Bead color="#4FBEA3" size={18} />
                </span>
                <b>从一颗豆开始</b>
                <span>在左边挑个颜色，点一下画布</span>
              </div>
            )}
          </div>

          <div className="stage-footer">
            <div className={`coord${hoverLabel ? ' is-active' : ''}`}>
              {hoverLabel ? (
                <>
                  <span>坐标</span>
                  <b>{hoverLabel}</b>
                </>
              ) : (
                <span>把鼠标放上画布</span>
              )}
            </div>

            <div className="controls">
              <label className="select-wrap">
                <span className="sr-only">画布尺寸</span>
                <select value={grid.cols} onChange={(event) => changeSize(Number(event.target.value))}>
                  {BOARDS.map((board) => (
                    <option key={board.size} value={board.size}>
                      {board.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="toggle-btn"
                aria-pressed={showGrid}
                onClick={() => setShowGrid((value) => !value)}
                title="显示 / 隐藏网格（G）"
              >
                <GridIcon size={14} />
                网格
              </button>
              <button
                type="button"
                className="toggle-btn"
                aria-pressed={mirror}
                onClick={() => setMirror((value) => !value)}
                title="左右对称（M）"
              >
                <MirrorIcon size={14} />
                对称
              </button>
              <button
                type="button"
                className="icon-btn danger"
                onClick={clearBoard}
                aria-label="清空画布"
                title="清空画布"
              >
                <TrashIcon size={16} />
              </button>

              <div className="zoom">
                <span className="zoom-label">缩放</span>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={5}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  aria-label="缩放画布"
                />
                <span className="zoom-value">{zoom}%</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="col-right">
          <BeadList
            used={used}
            total={total}
            totalCells={grid.cols * grid.rows}
            selected={colorIndex}
            onSelect={setColorIndex}
            onHoverColor={setFocusIndex}
            onExportCsv={exportCsv}
          />
        </aside>
      </main>

      {importOpen && (
        <ImportModal
          cols={grid.cols}
          rows={grid.rows}
          onClose={() => setImportOpen(false)}
          onApply={handleImportApply}
        />
      )}

      {printOpen && (
        <PrintModal grid={grid} onClose={() => setPrintOpen(false)} onToast={toast} />
      )}

      <ToastStack items={toasts} />
    </div>
  )
}
