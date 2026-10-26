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
  RedoIcon,
  SaveIcon,
  TrashIcon,
  UndoIcon,
} from './components/Icons'
import { ImportModal } from './components/ImportModal'
import { PalettePanel } from './components/PalettePanel'
import { PatternBar } from './components/PatternBar'
import { ToastStack, type ToastItem } from './components/Toast'
import { ToolRail } from './components/ToolRail'
import { isSameGrid, type Grid } from './lib/board'
import { PALETTE, paletteIndex } from './lib/colors'
import { drawBoard } from './lib/draw'
import { buildPattern, PATTERNS, type PatternId } from './lib/patterns'
import { BOARDS, TOOLS, type Point, type Tool } from './lib/types'

const STORAGE_KEY = 'pindou.studio.v1'
const DEFAULT_SIZE = 29
const DEFAULT_COLOR = paletteIndex('P11')

function loadInitialGrid(): Grid {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Grid>
      if (
        Number.isInteger(saved.cols) &&
        Number.isInteger(saved.rows) &&
        Array.isArray(saved.cells) &&
        saved.cells.length === (saved.cols as number) * (saved.rows as number)
      ) {
        const cols = saved.cols as number
        const rows = saved.rows as number
        const cells = saved.cells.map((value) =>
          typeof value === 'number' && value >= 0 && value < PALETTE.length ? value : -1,
        )
        return { cols, rows, cells }
      }
    }
  } catch {
    // 隐私模式下 localStorage 可能不可用，直接使用默认图案
  }
  return { cols: DEFAULT_SIZE, rows: DEFAULT_SIZE, cells: buildPattern('heart', DEFAULT_SIZE, DEFAULT_SIZE) }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
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
  const [grid, setGridState] = useState<Grid>(loadInitialGrid)
  const gridRef = useRef(grid)
  const strokeRef = useRef<{ base: Grid; pushed: boolean } | null>(null)
  const undoRef = useRef<Grid[]>([])
  const redoRef = useRef<Grid[]>([])
  const [hist, setHist] = useState({ u: 0, r: 0 })

  const [tool, setTool] = useState<Tool>('brush')
  const [colorIndex, setColorIndex] = useState(DEFAULT_COLOR)
  const [zoom, setZoom] = useState(100)
  const [showGrid, setShowGrid] = useState(true)
  const [mirror, setMirror] = useState(false)
  const [fitCell, setFitCell] = useState(18)
  const [hover, setHover] = useState<Point | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)
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
    if (current.cols !== previous.cols || current.rows !== previous.rows) setZoom(100)
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
    if (current.cols !== next.cols || current.rows !== next.rows) setZoom(100)
  }, [commitGrid])

  const saveNow = useCallback(() => {
    const current = gridRef.current
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cols: current.cols, rows: current.rows, cells: current.cells }),
      )
    } catch {
      toast('保存失败，浏览器可能禁用了本地存储')
      return
    }
    setJustSaved(true)
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setJustSaved(false), 1800)
    toast('已保存到这台设备')
  }, [toast])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = gridRef.current
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ cols: current.cols, rows: current.rows, cells: current.cells }),
        )
      } catch {
        // 忽略自动保存失败
      }
    }, 600)
    return () => window.clearTimeout(timer)
  }, [grid])

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
      setZoom(100)
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
      else if (key === '[') setZoom((value) => Math.max(50, value - 10))
      else if (key === ']') setZoom((value) => Math.min(220, value + 10))
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
                  min={50}
                  max={220}
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

      <ToastStack items={toasts} />
    </div>
  )
}
