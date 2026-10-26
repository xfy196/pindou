import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { EMPTY, floodFill, linePoints, rectPoints, type Grid } from '../lib/board'
import { PALETTE } from '../lib/colors'
import { drawBead, drawBoard } from '../lib/draw'
import type { Point, Tool } from '../lib/types'

interface BoardProps {
  grid: Grid
  cell: number
  showGrid: boolean
  tool: Tool
  colorIndex: number
  mirror: boolean
  focusIndex: number | null
  onBegin: () => void
  onApply: (grid: Grid) => void
  onEnd: () => void
  onPick: (index: number | null) => void
  onHover: (point: Point | null) => void
}

interface DragState {
  mode: 'paint' | 'shape'
  start: Point
  last: Point
  working: number[] | null
}

export function Board({
  grid,
  cell,
  showGrid,
  tool,
  colorIndex,
  mirror,
  focusIndex,
  onBegin,
  onApply,
  onEnd,
  onPick,
  onHover,
}: BoardProps) {
  const baseRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const hoverRef = useRef<Point | null>(null)
  const rafRef = useRef<number | null>(null)
  const dimsRef = useRef({ cols: grid.cols, rows: grid.rows })
  const [hover, setHover] = useState<Point | null>(null)
  const [shape, setShape] = useState<{ start: Point; end: Point } | null>(null)

  useLayoutEffect(() => {
    dimsRef.current = { cols: grid.cols, rows: grid.rows }
  }, [grid.cols, grid.rows])

  const width = grid.cols * cell
  const height = grid.rows * cell
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  useEffect(() => {
    const canvas = baseRef.current
    if (!canvas) return
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawBoard(ctx, grid, cell, {
      background: '#FBF5E7',
      vignette: true,
      showGrid,
      showPegs: true,
      hole: 'fill',
      holeColor: '#FBF5E7',
    })
  }, [grid, cell, showGrid, width, height, dpr])

  useEffect(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const outline = (x: number, y: number, dashed: boolean) => {
      const pad = Math.max(1, cell * 0.05)
      ctx.lineWidth = Math.max(1.2, cell * 0.055)
      ctx.strokeStyle = 'rgba(36, 28, 21, 0.58)'
      ctx.setLineDash(dashed ? [Math.max(2, cell * 0.18), Math.max(2, cell * 0.16)] : [])
      ctx.strokeRect(x * cell + pad, y * cell + pad, cell - pad * 2, cell - pad * 2)
      ctx.setLineDash([])
    }

    if (focusIndex !== null && PALETTE[focusIndex]) {
      const focus = PALETTE[focusIndex]
      ctx.fillStyle = 'rgba(251, 245, 231, 0.7)'
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(36, 28, 21, 0.55)'
      ctx.lineWidth = Math.max(1, cell * 0.05)
      for (let y = 0; y < grid.rows; y += 1) {
        for (let x = 0; x < grid.cols; x += 1) {
          if (grid.cells[y * grid.cols + x] !== focusIndex) continue
          const cx = (x + 0.5) * cell
          const cy = (y + 0.5) * cell
          drawBead(ctx, cx, cy, cell, focus.hex, { hole: 'fill', holeColor: '#FBF5E7' })
          ctx.beginPath()
          ctx.arc(cx, cy, cell * 0.475, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    if (shape) {
      const points =
        tool === 'rect'
          ? rectPoints(shape.start.x, shape.start.y, shape.end.x, shape.end.y)
          : linePoints(shape.start.x, shape.start.y, shape.end.x, shape.end.y)
      ctx.globalAlpha = 0.66
      for (const [x, y] of points) {
        drawBead(ctx, (x + 0.5) * cell, (y + 0.5) * cell, cell, PALETTE[colorIndex].hex, {
          hole: 'fill',
          holeColor: '#FBF5E7',
        })
        if (mirror) {
          drawBead(ctx, (grid.cols - 1 - x + 0.5) * cell, (y + 0.5) * cell, cell, PALETTE[colorIndex].hex, {
            hole: 'fill',
            holeColor: '#FBF5E7',
          })
        }
      }
      ctx.globalAlpha = 1
      const last = points[points.length - 1]
      if (last) outline(last[0], last[1], false)
    } else if (hover) {
      const canPaint = tool === 'brush' || tool === 'fill'
      if (canPaint) {
        ctx.globalAlpha = 0.5
        drawBead(ctx, (hover.x + 0.5) * cell, (hover.y + 0.5) * cell, cell, PALETTE[colorIndex].hex, {
          hole: 'fill',
          holeColor: '#FBF5E7',
        })
        ctx.globalAlpha = 1
      }
      outline(hover.x, hover.y, tool === 'eraser' || tool === 'picker')
      if (mirror && hover.x !== grid.cols - 1 - hover.x) {
        outline(grid.cols - 1 - hover.x, hover.y, true)
      }
    }
  }, [grid, cell, dpr, hover, shape, tool, colorIndex, mirror, focusIndex, width, height])

  const scheduleFrame = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const drag = dragRef.current
      if (!drag?.working) return
      onApply({
        cols: dimsRef.current.cols,
        rows: dimsRef.current.rows,
        cells: drag.working.slice(),
      })
    })
  }, [onApply])

  const flush = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const drag = dragRef.current
    if (!drag?.working) return
    onApply({
      cols: dimsRef.current.cols,
      rows: dimsRef.current.rows,
      cells: drag.working.slice(),
    })
  }, [onApply])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>, clamp = false): Point | null => {
    const canvas = overlayRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    let x = Math.floor((event.clientX - rect.left) / cell)
    let y = Math.floor((event.clientY - rect.top) / cell)
    if (clamp) {
      x = Math.max(0, Math.min(grid.cols - 1, x))
      y = Math.max(0, Math.min(grid.rows - 1, y))
    } else if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) {
      return null
    }
    return { x, y }
  }

  const paintAt = (working: number[], x: number, y: number, value: number) => {
    working[y * grid.cols + x] = value
    if (mirror) working[y * grid.cols + (grid.cols - 1 - x)] = value
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const point = pointFromEvent(event)
    if (!point) return
    event.preventDefault()
    overlayRef.current?.setPointerCapture(event.pointerId)

    if (tool === 'picker') {
      const value = grid.cells[point.y * grid.cols + point.x]
      onPick(value >= 0 ? value : null)
      return
    }

    if (tool === 'fill') {
      const next = floodFill(grid, point.x, point.y, colorIndex)
      onBegin()
      onApply({ cols: grid.cols, rows: grid.rows, cells: next })
      onEnd()
      return
    }

    if (tool === 'line' || tool === 'rect') {
      dragRef.current = { mode: 'shape', start: point, last: point, working: null }
      setShape({ start: point, end: point })
      return
    }

    const working = grid.cells.slice()
    paintAt(working, point.x, point.y, tool === 'eraser' ? EMPTY : colorIndex)
    dragRef.current = { mode: 'paint', start: point, last: point, working }
    onBegin()
    onApply({ cols: grid.cols, rows: grid.rows, cells: working.slice() })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event)
    const previous = hoverRef.current
    if (!point) {
      if (previous) {
        hoverRef.current = null
        setHover(null)
        onHover(null)
      }
    } else if (!previous || previous.x !== point.x || previous.y !== point.y) {
      hoverRef.current = point
      setHover(point)
      onHover(point)
    }

    const drag = dragRef.current
    if (!drag) return

    if (drag.mode === 'shape') {
      const clamped = pointFromEvent(event, true)
      if (!clamped) return
      if (drag.last.x === clamped.x && drag.last.y === clamped.y) return
      drag.last = clamped
      setShape({ start: drag.start, end: clamped })
      return
    }

    if (!point || !drag.working) return
    if (drag.last.x === point.x && drag.last.y === point.y) return
    const value = tool === 'eraser' ? EMPTY : colorIndex
    for (const [x, y] of linePoints(drag.last.x, drag.last.y, point.x, point.y)) {
      paintAt(drag.working, x, y, value)
    }
    drag.last = point
    scheduleFrame()
  }

  const finish = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag) return

    if (drag.mode === 'shape' && (tool === 'line' || tool === 'rect')) {
      const point = pointFromEvent(event, true) ?? drag.last
      const points =
        tool === 'rect'
          ? rectPoints(drag.start.x, drag.start.y, point.x, point.y)
          : linePoints(drag.start.x, drag.start.y, point.x, point.y)
      const cells = grid.cells.slice()
      for (const [x, y] of points) {
        cells[y * grid.cols + x] = colorIndex
        if (mirror) cells[y * grid.cols + (grid.cols - 1 - x)] = colorIndex
      }
      onBegin()
      onApply({ cols: grid.cols, rows: grid.rows, cells })
      onEnd()
      setShape(null)
    } else if (drag.mode === 'paint') {
      flush()
      onEnd()
    }

    dragRef.current = null
    setShape(null)
    if (overlayRef.current?.hasPointerCapture(event.pointerId)) {
      overlayRef.current.releasePointerCapture(event.pointerId)
    }
  }

  const handlePointerLeave = () => {
    if (dragRef.current) return
    if (!hoverRef.current) return
    hoverRef.current = null
    setHover(null)
    onHover(null)
  }

  const handlePointerCancel = () => {
    if (dragRef.current?.mode === 'paint') {
      flush()
      onEnd()
    }
    dragRef.current = null
    setShape(null)
  }

  return (
    <div className="board-frame">
      <div className="board-surface" style={{ width, height }}>
        <canvas ref={baseRef} className="board-canvas" aria-label="拼豆画布" role="img" />
        <canvas
          ref={overlayRef}
          className="board-overlay"
          style={{ width, height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finish}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(event) => event.preventDefault()}
        />
      </div>
    </div>
  )
}
