import { TOOLS, type Tool } from '../lib/types'
import { ToolIcon } from './Icons'

export function ToolRail({ tool, onChange }: { tool: Tool; onChange: (tool: Tool) => void }) {
  return (
    <div className="tools" role="toolbar" aria-label="绘图工具">
      {TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="tool"
          aria-pressed={tool === item.id}
          aria-label={item.label}
          data-tip={`${item.label} · ${item.key}`}
          onClick={() => onChange(item.id)}
        >
          <ToolIcon tool={item.id} />
        </button>
      ))}
    </div>
  )
}
