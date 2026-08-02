import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  message: string
  icon?: LucideIcon
}

export function EmptyState({ message, icon: Icon }: EmptyStateProps) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{message}</span>
    </div>
  )
}
