export interface Grid {
  cols: number
  rows: number
  cells: number[]
}

export const EMPTY = -1

export function sameCells(a: number[], b: number[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function isSameGrid(a: Grid, b: Grid): boolean {
  return a.cols === b.cols && a.rows === b.rows && sameCells(a.cells, b.cells)
}

/** Bresenham，用来补上鼠标快速移动时漏掉的格子 */
export function linePoints(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const points: [number, number][] = []
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  for (let guard = 0; guard < 10000; guard += 1) {
    points.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return points
}

export function rectPoints(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const left = Math.min(x0, x1)
  const right = Math.max(x0, x1)
  const top = Math.min(y0, y1)
  const bottom = Math.max(y0, y1)
  const points: [number, number][] = []

  for (let x = left; x <= right; x += 1) {
    points.push([x, top])
    if (bottom !== top) points.push([x, bottom])
  }
  for (let y = top + 1; y < bottom; y += 1) {
    points.push([left, y])
    if (right !== left) points.push([right, y])
  }

  return points
}

export function floodFill(grid: Grid, x: number, y: number, next: number): number[] {
  const { cols, rows, cells } = grid
  const target = cells[y * cols + x]
  if (target === next) return cells.slice()

  const result = cells.slice()
  const stack: number[] = [y * cols + x]

  while (stack.length > 0) {
    const index = stack.pop() as number
    if (result[index] !== target) continue
    result[index] = next

    const cx = index % cols
    const cy = (index - cx) / cols
    if (cx > 0) stack.push(index - 1)
    if (cx < cols - 1) stack.push(index + 1)
    if (cy > 0) stack.push(index - cols)
    if (cy < rows - 1) stack.push(index + cols)
  }

  return result
}
