import type { SVGProps } from 'react'
import type { Tool } from '../lib/types'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function BrushIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.6 20.4l1.1-4.1L16.4 4.6a2.1 2.1 0 0 1 3 3L7.7 19.3l-4.1 1.1z" />
      <path d="M14.4 6.6l3 3" />
      <path d="M5.4 16.2l2.4 2.4" />
    </Svg>
  )
}

export function EraserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.4 20l-4.1-4.1a2 2 0 0 1 0-2.9l7.2-7.2a2 2 0 0 1 2.9 0l3.4 3.4a2 2 0 0 1 0 2.9L13.5 20H9.4z" />
      <path d="M10.3 9l6.3 6.3" />
      <path d="M19.5 20h-8" />
    </Svg>
  )
}

export function FillIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.6 3.8l8.2 8.2-6.3 6.3a2 2 0 0 1-2.8 0l-5.3-5.3a2 2 0 0 1 0-2.8l6.2-6.4z" />
      <path d="M4.6 12.4h13.4" />
      <path d="M18.8 15.4c1 1.3 1.6 2.3 1.6 3a1.6 1.6 0 0 1-3.2 0c0-.7.6-1.7 1.6-3z" />
    </Svg>
  )
}

export function LineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.2 16.8L16.8 7.2" />
      <circle cx="5.6" cy="18.4" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="18.4" cy="5.6" r="1.9" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function RectIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
      <path d="M4.5 9h15M4.5 15h15M9 4.5v15M15 4.5v15" strokeOpacity="0.35" />
    </Svg>
  )
}

export function PickerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16.3 2.9a2.4 2.4 0 0 1 3.4 0l1.4 1.4a2.4 2.4 0 0 1 0 3.4l-1.7 1.7-4.8-4.8 1.7-1.7z" />
      <path d="M14.6 4.6l4.8 4.8" />
      <path d="M13.5 8.3L5 16.8 3.8 21l4.2-1.2 8.5-8.5" />
    </Svg>
  )
}

export function UndoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 9.5h9.2a4.8 4.8 0 0 1 0 9.6H8.4" />
      <path d="M7.8 5.5l-4 4 4 4" />
    </Svg>
  )
}

export function RedoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.5 9.5h-9.2a4.8 4.8 0 0 0 0 9.6h5.3" />
      <path d="M16.2 5.5l4 4-4 4" />
    </Svg>
  )
}

export function SaveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4h11.5L20 7.5V20H5z" />
      <path d="M8.5 4v5.5h7V4" />
      <rect x="8.5" y="13" width="7" height="7" />
    </Svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5v10.5" />
      <path d="M7.8 9.8L12 14l4.2-4.2" />
      <path d="M4 16.5v1.8A3.2 3.2 0 0 0 7.2 21.5h9.6a3.2 3.2 0 0 0 3.2-3.2v-1.8" />
    </Svg>
  )
}

export function ImageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" />
      <circle cx="8.6" cy="9.6" r="1.5" />
      <path d="M20 15.6l-4.6-4.6L6 20" />
    </Svg>
  )
}

export function GridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.6" />
      <path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" />
    </Svg>
  )
}

export function MirrorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5v17" strokeDasharray="2.4 2.6" />
      <path d="M9.4 6.4L4.4 12l5 5.6z" />
      <path d="M14.6 6.4l5 5.6-5 5.6z" />
    </Svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.8h16" />
      <path d="M9.4 6.8V4h5.2v2.8" />
      <path d="M6.4 6.8l.9 13.2h9.4l.9-13.2" />
      <path d="M10.2 10.4v6.4M13.8 10.4v6.4" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}

export function SparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2l1.9 5.7 5.7 1.9-5.7 1.9L12 18.4l-1.9-5.7-5.7-1.9 5.7-1.9z" />
      <path d="M18.6 16.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </Svg>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" />
      <circle cx="4.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function PrinterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.2 9V4h9.6v5" />
      <path d="M7.2 17.5H5.4A1.9 1.9 0 0 1 3.5 15.6v-4.4A2.2 2.2 0 0 1 5.7 9h12.6a2.2 2.2 0 0 1 2.2 2.2v4.4a1.9 1.9 0 0 1-1.9 1.9h-1.8" />
      <rect x="7.2" y="14.2" width="9.6" height="6.3" rx="1" />
      <path d="M17.4 12.1h.01" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5l4.6 4.6L19.5 6.5" />
    </Svg>
  )
}

const TOOL_ICONS = {
  brush: BrushIcon,
  eraser: EraserIcon,
  fill: FillIcon,
  line: LineIcon,
  rect: RectIcon,
  picker: PickerIcon,
}

export function ToolIcon({ tool, size }: { tool: Tool; size?: number }) {
  const Component = TOOL_ICONS[tool]
  return <Component size={size} />
}
