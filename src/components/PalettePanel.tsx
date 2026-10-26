import { GROUPS, PALETTE } from '../lib/colors'
import { Bead } from './BeadSwatch'

interface PalettePanelProps {
  selected: number
  onSelect: (index: number) => void
}

const GROUPED = GROUPS.map((group) => ({
  ...group,
  colors: PALETTE.map((color, index) => ({ color, index })).filter(
    (item) => item.color.group === group.key,
  ),
}))

export function PalettePanel({ selected, onSelect }: PalettePanelProps) {
  const current = PALETTE[selected]

  return (
    <section className="card palette-card">
      <header className="panel-head">
        <div>
          <span className="eyebrow">PALETTE / 色卡</span>
          <h2>挑一颗颜色</h2>
        </div>
        <span className="panel-badge">{PALETTE.length} 色</span>
      </header>

      <div className="current-color">
        <Bead color={current.hex} size={36} />
        <div className="cc-text">
          <b>{current.name}</b>
          <span>
            {current.hex.toUpperCase()} · {current.id}
          </span>
        </div>
        <span className="cc-tag">当前</span>
      </div>

      <div className="palette-scroll">
        {GROUPED.map((group) => (
          <div className="palette-group" key={group.key}>
            <div className="group-label">
              <span>{group.label}</span>
              <span className="group-en">{group.en}</span>
              <i />
            </div>
            <div className="chips">
              {group.colors.map(({ color, index }) => (
                <button
                  key={color.id}
                  type="button"
                  className="chip"
                  aria-pressed={selected === index}
                  aria-label={`${color.name} ${color.id}`}
                  title={`${color.name} · ${color.id}`}
                  onClick={() => onSelect(index)}
                >
                  <Bead color={color.hex} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
