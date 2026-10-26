export interface ToastItem {
  id: number
  message: string
}

export function ToastStack({ items }: { items: ToastItem[] }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => (
        <div className="toast" key={item.id}>
          <span className="toast-dot" aria-hidden="true" />
          {item.message}
        </div>
      ))}
    </div>
  )
}
