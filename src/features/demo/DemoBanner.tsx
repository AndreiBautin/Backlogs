import { Info } from 'lucide-react'

import { useAppConfig } from '@/app/config-context'

/**
 * Tells a visitor what they are looking at. Two claims matter and both
 * are true: the backlog on screen is invented, and anything they change
 * stays in their own browser. Renders nothing outside demo mode.
 */
export function DemoBanner() {
  const { isDemo } = useAppConfig()
  if (!isDemo) {
    return null
  }

  return (
    <div
      role="status"
      className="border-border bg-accent/40 text-muted-foreground flex items-start gap-2 border-b px-6 py-2 text-xs"
    >
      <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <p>
        <span className="text-foreground font-medium">Demo mode.</span> This backlog is
        sample data. Edit anything you like — changes are saved only in your own browser,
        and Settings can reset it.
      </p>
    </div>
  )
}
