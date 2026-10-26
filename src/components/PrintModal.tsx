import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Grid } from '../lib/board'
import {
  DEFAULT_BLUEPRINT,
  renderBlueprintPage,
  planBlueprint,
  type BlueprintOptions,
} from '../lib/blueprint'
import { downloadBlob } from '../lib/download'
import { CloseIcon, DownloadIcon, PrinterIcon } from './Icons'

interface PrintModalProps {
  grid: Grid
  onClose: () => void
  onToast: (message: string) => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const PREVIEW_DPI = 104
const EXPORT_DPI = 300
const PRINT_DPI = 300

function focusablesIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
}

const TOGGLES: { key: keyof BlueprintOptions; label: string; hint: string }[] = [
  { key: 'codes', label: '色号数字', hint: '每格印上色号，黑白打印也能照着拼' },
  { key: 'ruler', label: '行列编号', hint: '顶部和左侧标出行列号，方便报位置' },
  { key: 'legend', label: '色号对照表', hint: '底部列出用到的颜色、名称与数量' },
  { key: 'beads', label: '圆豆外观', hint: '用圆豆代替方格，更像画布；对比度和对齐性会下降' },
]

export function PrintModal({ grid, onClose, onToast }: PrintModalProps) {
  const [options, setOptions] = useState<BlueprintOptions>(DEFAULT_BLUEPRINT)
  const [selected, setSelected] = useState(0)
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  const plan = useMemo(() => planBlueprint(grid, options), [grid, options])
  const current = Math.min(selected, plan.pages.length - 1)

  const previews = useMemo(
    () =>
      plan.pages.map((page) =>
        renderBlueprintPage({ grid, plan, page, options, dpi: PREVIEW_DPI }),
      ),
    [grid, plan, options],
  )

  // 打开时锁滚动、把焦点移进弹窗；关闭时还给触发它的按钮
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const items = focusablesIn(dialogRef.current)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (event.shiftKey) {
      if (active === first || !dialogRef.current?.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const renderPage = useCallback(
    (index: number, dpi: number) =>
      renderBlueprintPage({ grid, plan, page: plan.pages[index], options, dpi }),
    [grid, options, plan],
  )

  const attachPreview = (element: HTMLSpanElement | null, canvas: HTMLCanvasElement) => {
    if (!element) return
    if (element.firstChild === canvas) return
    canvas.className = 'bp-canvas'
    element.replaceChildren(canvas)
  }

  const exportPng = useCallback(() => {
    const canvas = renderPage(current, EXPORT_DPI)
    const page = plan.pages[current]
    const suffix = page.total > 1 ? `-${page.index + 1}of${page.total}` : ''
    const filename = `拼豆图纸-${grid.cols}x${grid.rows}${suffix}.png`
    canvas.toBlob((blob) => {
      if (!blob) {
        onToast('导出失败，换一个浏览器再试')
        return
      }
      downloadBlob(blob, filename)
      onToast(page.total > 1 ? `已导出第 ${page.index + 1} 张图纸` : '图纸已导出 · 300dpi')
    }, 'image/png')
  }, [current, grid.cols, grid.rows, onToast, plan.pages, renderPage])

  const doPrint = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const sheets = document.createElement('div')
      sheets.className = 'print-root'
      for (const page of plan.pages) {
        const canvas = renderBlueprintPage({ grid, plan, page, options, dpi: PRINT_DPI })
        const url = canvas.toDataURL('image/png')
        // 立刻释放大画布，多页时内存压力小很多
        canvas.width = 0
        canvas.height = 0
        const sheet = document.createElement('div')
        sheet.className = 'print-sheet'
        const img = new Image()
        img.alt = ''
        img.src = url
        sheet.appendChild(img)
        sheets.appendChild(sheet)
        await img.decode().catch(() => undefined)
      }

      document.body.appendChild(sheets)
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      const cleanup = () => {
        sheets.remove()
        window.clearTimeout(guard)
        window.removeEventListener('afterprint', cleanup)
      }
      // 打印对话框在部分浏览器不会触发 afterprint，留一个兜底计时器
      const guard = window.setTimeout(cleanup, 180_000)
      window.addEventListener('afterprint', cleanup)

      window.print()
    } finally {
      setBusy(false)
    }
  }, [busy, grid, options, plan])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="modal print-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        <header className="modal-head">
          <div>
            <span className="eyebrow">PRINT SHEET</span>
            <h2 id={titleId}>打印图纸</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="bp-summary">
          <span>
            A4 · 每格 <b>{plan.cellMm.toFixed(1)}</b> mm
          </span>
          <span>
            共 <b>{plan.pages.length}</b> 张
          </span>
          <span>
            {grid.cols} × {grid.rows}
          </span>
          <span>
            <b>{plan.total}</b> 颗豆
          </span>
        </div>

        <div className="bp-options" role="group" aria-label="图纸内容">
          {TOGGLES.map((item) => (
            <button
              key={item.key}
              type="button"
              className="toggle-btn"
              aria-pressed={options[item.key]}
              title={item.hint}
              onClick={() => setOptions((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={`bp-pages${plan.pages.length === 1 ? ' is-single' : ''}`}>
          {plan.pages.map((page, index) => (
            <button
              key={page.index}
              type="button"
              className="bp-page"
              aria-pressed={index === current}
              onClick={() => setSelected(index)}
            >
              <span className="bp-frame" ref={(el) => attachPreview(el, previews[index])} />
              <span className="bp-page-label">
                第 {index + 1} / {page.total} 张 · 列 {page.colStart + 1}–{page.colEnd}
              </span>
            </button>
          ))}
        </div>

        <p className="bp-note">
          打印时把缩放设为「100% / 实际大小」，关掉页眉页脚；想留档就选「另存为 PDF」。
          {plan.pages.length > 1 && ' 多张时按四角十字对齐拼接。'}
          {options.beads && ' 圆豆外观更接近实物，但纯色块在黑白打印时不易区分，建议彩色输出。'}
        </p>

        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>
            关闭
          </button>
          <button type="button" className="btn ghost" onClick={exportPng} disabled={busy}>
            <DownloadIcon size={16} />
            {plan.pages.length > 1 ? '导出本页 PNG' : '导出 PNG'}
          </button>
          <button type="button" className="btn primary" onClick={doPrint} disabled={busy}>
            <PrinterIcon size={16} />
            {busy ? '正在排版…' : '打印 / 存 PDF'}
          </button>
        </footer>
      </div>
    </div>
  )
}
