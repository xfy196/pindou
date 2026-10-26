import type { CSSProperties } from 'react'

interface BeadProps {
  color: string
  size?: number
  className?: string
  title?: string
}

export function Bead({ color, size, className = '', title }: BeadProps) {
  const style: CSSProperties = { '--c': color } as CSSProperties
  if (size !== undefined) {
    style.width = size
    style.height = size
  }

  return <span className={`bead ${className}`} style={style} title={title} aria-hidden="true" />
}
