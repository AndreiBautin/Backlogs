import { useEffect, useState, type ReactNode } from 'react'

import { useAppConfig } from '@/app/config-context'
import { useUseCases } from '@/app/use-cases-context'

/**
 * Seeds the demo backlog before the app renders, but only in demo mode.
 *
 * Blocking the first paint is deliberate: letting the dashboard render
 * empty and then repopulate makes a working demo look broken for a
 * frame. The seed itself is a no-op against non-empty storage, so a
 * returning visitor pays one `getAll()` and nothing else.
 *
 * In personal mode this component is inert — `ready` starts true and no
 * effect ever fires.
 */
export function DemoBootstrap({ children }: { children: ReactNode }) {
  const { isDemo } = useAppConfig()
  const { seedDemoData } = useUseCases()
  const [ready, setReady] = useState(!isDemo)

  useEffect(() => {
    if (!isDemo) {
      return
    }
    let cancelled = false
    void seedDemoData().finally(() => {
      if (!cancelled) {
        setReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isDemo, seedDemoData])

  if (!ready) {
    return (
      <div className="text-muted-foreground flex min-h-svh items-center justify-center p-8 text-sm">
        Preparing the demo backlog…
      </div>
    )
  }

  return children
}
