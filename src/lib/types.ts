export type Tool = 'brush' | 'eraser' | 'fill' | 'line' | 'rect' | 'picker'

export interface ToolMeta {
  id: Tool
  label: string
  hint: string
  key: string
}

export const TOOLS: ToolMeta[] = [
  { id: 'brush', label: '画笔', hint: '按住拖动，连续放豆', key: 'B' },
  { id: 'eraser', label: '橡皮', hint: '擦掉画布上的豆子', key: 'E' },
  { id: 'fill', label: '填充', hint: '一次填满同色区域', key: 'F' },
  { id: 'line', label: '直线', hint: '拖出一条笔直的豆线', key: 'L' },
  { id: 'rect', label: '方框', hint: '拖出一个矩形边框', key: 'R' },
  { id: 'picker', label: '吸管', hint: '从画布上吸取颜色', key: 'I' },
]

export interface Point {
  x: number
  y: number
}

export const BOARDS = [
  { size: 16, label: '16 × 16 · 迷你' },
  { size: 24, label: '24 × 24 · 小号' },
  { size: 29, label: '29 × 29 · 标准板' },
  { size: 32, label: '32 × 32 · 方形' },
  { size: 48, label: '48 × 48 · 大号' },
  { size: 64, label: '64 × 64 · 大幅' },
]
