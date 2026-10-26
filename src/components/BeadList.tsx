import { PALETTE } from '../lib/colors'
import { Bead } from './BeadSwatch'
import { DownloadIcon, ListIcon } from './Icons'

export interface UsedColor {
  index: number
  count: number
}

interface BeadListProps {
  used: UsedColor[]
  total: number
  totalCells: number
  selected: number
  onSelect: (index: number) => void
  onHoverColor: (index: number | null) => void
  onExportCsv: () => void
}

export function BeadList({
  used,
  total,
  totalCells,
  selected,
  onSelect,
  onHoverColor,
  onExportCsv,
}: BeadListProps) {
  const max = used.length > 0 ? used[0].count : 1
  const coverage = totalCells > 0 ? Math.round((total / totalCells) * 100) : 0

  return (
    <section className="card list-card">
      <header className="panel-head">
        <div>
          <span className="eyebrow">INVENTORY / 清单</span>
          <h2>珠子清单</h2>
        </div>
        <ListIcon size={16} />
      </header>

      <div className="stat-strip">
        <div className="stat">
          <span>豆子总数</span>
          <strong>{total}</strong>
        </div>
        <div className="stat">
          <span>用色</span>
          <strong>{used.length}</strong>
        </div>
        <div className="stat">
          <span>铺满画布</span>
          <strong>
            {coverage}
            <i>%</i>
          </strong>
        </div>
      </div>

      <div className="bead-list-scroll">
        {used.length === 0 ? (
          <div className="list-empty">
            <div className="empty-beads" aria-hidden="true">
              <Bead color="#E1492F" size={26} />
              <Bead color="#FBBF24" size={26} />
              <Bead color="#4FBEA3" size={26} />
            </div>
            <p>画布还空着</p>
            <span>选一颗颜色，在左边画布上开始拼吧。</span>
          </div>
        ) : (
          used.map(({ index, count }) => {
            const color = PALETTE[index]
            const percent = Math.max(4, Math.round((count / max) * 100))
            return (
              <button
                key={color.id}
                type="button"
                className="bead-row"
                aria-pressed={selected === index}
                onClick={() => onSelect(index)}
                onMouseEnter={() => onHoverColor(index)}
                onMouseLeave={() => onHoverColor(null)}
                title={`${color.name} ${color.id}`}
              >
                <span
                  className="row-fill"
                  style={{ width: `${percent}%`, background: `${color.hex}2e` }}
                  aria-hidden="true"
                />
                <Bead color={color.hex} size={20} />
                <span className="row-name">
                  {color.name}
                  <em>{color.id}</em>
                </span>
                <span className="row-count">{count}</span>
              </button>
            )
          })
        )}
      </div>

      <footer className="list-foot">
        <span className="mono">
          {total > 0
            ? `≈ ${(total * 0.026).toFixed(1)} g · ${Math.max(1, Math.ceil(total / 841))} 块标准板`
            : '等待第一颗豆子'}
        </span>
        <button type="button" className="link-btn" onClick={onExportCsv} disabled={used.length === 0}>
          <DownloadIcon size={13} />
          导出清单
        </button>
      </footer>
    </section>
  )
}
