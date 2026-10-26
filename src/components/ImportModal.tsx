import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { imageToBeads, type ConvertOptions } from '../lib/convert'
import { drawBoard } from '../lib/draw'
import { CheckIcon, CloseIcon, ImageIcon } from './Icons'

interface ImportModalProps {
  cols: number
  rows: number
  onClose: () => void
  onApply: (cells: number[]) => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 只在弹窗内部拿可聚焦元素，隐藏的 file input 会被 offsetParent 过滤掉 */
function focusablesIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
}

export function ImportModal({ cols, rows, onClose, onApply }: ImportModalProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState('')
  const [options, setOptions] = useState<ConvertOptions>({
    dither: false,
    dropLight: false,
    fit: 'cover',
  })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  const result = useMemo(
    () => (image ? imageToBeads(image, cols, rows, options) : null),
    [image, cols, rows, options],
  )

  const loadFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    const next = new Image()
    next.onload = () => {
      setImage(next)
      setFileName(file.name)
    }
    next.src = url
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  // 打开时锁住背景滚动，焦点移进弹窗；关闭时把焦点还给触发它的按钮
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [])

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas || !result) return
    const cell = Math.max(2, Math.floor(232 / Math.max(cols, rows)))
    const width = cols * cell
    const height = rows * cell
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawBoard(
      ctx,
      { cols, rows, cells: result.cells },
      cell,
      { background: '#FBF5E7', showPegs: false, hole: 'fill', holeColor: '#FBF5E7' },
    )
  }, [result, cols, rows])

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    loadFile(event.dataTransfer.files?.[0])
  }

  const ready = result !== null && result.beads > 0

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
        className="modal import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        <header className="modal-head">
          <div>
            <span className="eyebrow">IMAGE → BEADS</span>
            <h2 id={titleId}>把图片变成拼豆</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            <CloseIcon size={18} />
          </button>
        </header>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            loadFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />

        {image === null ? (
          <div
            className={`dropzone${dragging ? ' is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
            }}
          >
            <span className="drop-icon">
              <ImageIcon size={26} />
            </span>
            <b>把图片拖进来</b>
            <span>或者点击选择一张照片 / 插画 / 表情包</span>
            <em>会按 {cols} × {rows} 的格子重新上豆</em>
          </div>
        ) : (
          <>
            <div className="import-preview">
              <figure>
                <div className="figure-box">
                  <img src={image.src} alt="待转换的原图" />
                </div>
                <figcaption>原图 · {fileName}</figcaption>
              </figure>
              <span className="preview-arrow" aria-hidden="true">
                →
              </span>
              <figure>
                <div className="figure-box bead-box">
                  <canvas ref={previewRef} aria-label="拼豆预览" />
                </div>
                <figcaption>
                  拼豆预览 · {cols} × {rows}
                </figcaption>
              </figure>
            </div>

            <div className="import-stats">
              <span>
                <b>{result?.beads ?? 0}</b> 颗豆
              </span>
              <span>
                <b>{result?.colors ?? 0}</b> 种颜色
              </span>
              <button type="button" className="link-btn" onClick={() => inputRef.current?.click()}>
                重新选择
              </button>
            </div>

            <div className="import-options">
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={options.dither}
                  onChange={(event) =>
                    setOptions((prev) => ({ ...prev, dither: event.target.checked }))
                  }
                />
                <span className="switch" aria-hidden="true" />
                <span>
                  抖动混色
                  <em>用豆子的疏密模拟更多层次，图案更细腻</em>
                </span>
              </label>
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={options.dropLight}
                  onChange={(event) =>
                    setOptions((prev) => ({ ...prev, dropLight: event.target.checked }))
                  }
                />
                <span className="switch" aria-hidden="true" />
                <span>
                  去掉白色背景
                  <em>纯白像素会留空，适合白底素材</em>
                </span>
              </label>

              <div className="segmented" role="group" aria-label="图片适配方式">
                <span className="seg-label">画面适配</span>
                <button
                  type="button"
                  aria-pressed={options.fit === 'cover'}
                  onClick={() => setOptions((prev) => ({ ...prev, fit: 'cover' }))}
                >
                  裁剪铺满
                </button>
                <button
                  type="button"
                  aria-pressed={options.fit === 'contain'}
                  onClick={() => setOptions((prev) => ({ ...prev, fit: 'contain' }))}
                >
                  完整留白
                </button>
              </div>
            </div>
          </>
        )}

        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!ready}
            onClick={() => result && onApply(result.cells)}
          >
            <CheckIcon size={16} />
            生成到画布
          </button>
        </footer>
      </div>
    </div>
  )
}
