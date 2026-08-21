import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import type { Logger } from '@/shared/logging/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  logger: Logger
  /** In development the message and stack are shown; in production they are not. */
  showDetails: boolean
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time failures anywhere below it and shows a recoverable
 * screen instead of an unmounted, blank page.
 *
 * Still a class component because React has no hook equivalent — the
 * `getDerivedStateFromError` / `componentDidCatch` pair is the only API
 * for this, and wrapping it in a library would add a dependency to save
 * thirty lines.
 *
 * What the user sees depends on configuration, not on luck: a developer
 * gets the message and the component stack, a visitor to the deployed
 * demo gets a plain apology and a way out. Error text can quote the data
 * that caused it, and that data is somebody's backlog.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.logger.error('ui.render-failed', {
      name: error.name,
      // The message can contain user content, so it is only logged where a
      // developer is the one reading the console.
      message: this.props.showDetails ? error.message : null,
      componentStack: info.componentStack ?? null,
    })
  }

  private readonly handleReload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }

    return (
      <div
        role="alert"
        className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 p-8"
      >
        <h1 className="text-foreground text-lg font-semibold">Something broke</h1>
        <p className="text-muted-foreground text-sm">
          Backlogs hit an unexpected error while rendering. Your data is stored in this
          browser and has not been touched — reloading is safe.
        </p>

        {this.props.showDetails && (
          <pre className="border-border text-muted-foreground max-h-64 overflow-auto rounded-md border p-3 text-xs">
            {error.name}: {error.message}
          </pre>
        )}

        <div>
          <Button size="sm" onClick={this.handleReload}>
            Reload the app
          </Button>
        </div>
      </div>
    )
  }
}
