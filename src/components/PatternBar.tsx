import { useEffect, useRef } from 'react'
import { drawBoard } from '../lib/draw'
import { buildPattern, PATTERNS, type PatternId } from '../lib/patterns'
import { SparkIcon } from './Icons'

function PatternThumb({ id }: { id: PatternId }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const size = 112
    const cells = 14
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawBoard(
      ctx,
      { cols: cells, rows: cells, cells: buildPattern(id, cells, cells) },
      size / cells,
      {
        background: '#FBF5E7',
        showPegs: false,
        hole: 'fill',
        holeColor: '#FBF5E7',
      },
    )
  }, [id])

  return <canvas ref={ref} style={{ width: '100%', height: 'auto' }} aria-hidden="true" />
}

export function PatternBar({ onPick }: { onPick: (id: PatternId) => void }) {
  return (
    <section className="card templates-card">
      <header className="panel-head">
        <div>
          <span className="eyebrow">STARTER / 灵感</span>
          <h2>从一个图案开始</h2>
        </div>
        <SparkIcon size={16} />
      </header>
      <div className="pattern-grid">
        {PATTERNS.map((pattern) => (
          <button
            key={pattern.id}
            type="button"
            className="pattern-btn"
            onClick={() => onPick(pattern.id)}
            title={`载入「${pattern.name}」`}
          >
            <PatternThumb id={pattern.id} />
            <span>{pattern.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
