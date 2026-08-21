import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createTestLogger } from '@/test/test-logger'

import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('Reading list for "Something Private" blew up')
}

/**
 * React logs caught errors to console.error itself. Silencing that keeps
 * the suite's output honest — the noise is React's, not a real failure.
 */
function renderBoundary(showDetails: boolean) {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const { logger, records } = createTestLogger()

  render(
    <ErrorBoundary logger={logger} showDetails={showDetails}>
      <Boom />
    </ErrorBoundary>,
  )

  consoleError.mockRestore()
  return records
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    const { logger } = createTestLogger()

    render(
      <ErrorBoundary logger={logger} showDetails={false}>
        <p>All fine</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('All fine')).toBeInTheDocument()
  })

  it('shows a recoverable screen instead of unmounting the tree', () => {
    renderBoundary(false)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })

  it('reassures the user that their data survived', () => {
    renderBoundary(false)

    expect(screen.getByText(/has not been touched/i)).toBeInTheDocument()
  })

  it('shows the error detail to a developer', () => {
    renderBoundary(true)

    expect(screen.getByText(/blew up/)).toBeInTheDocument()
  })

  /**
   * The privacy-relevant half. An error message can quote the item that
   * caused it, so the deployed build shows an apology and nothing else.
   */
  it('hides the error detail in production', () => {
    renderBoundary(false)

    expect(screen.queryByText(/Something Private/)).not.toBeInTheDocument()
  })

  it('logs the failure as a structured event', () => {
    const records = renderBoundary(true)

    expect(records[0]?.level).toBe('error')
    expect(records[0]?.event).toBe('ui.render-failed')
    expect(records[0]?.context.name).toBe('Error')
  })

  it('omits the message from the log when details are hidden', () => {
    const records = renderBoundary(false)

    expect(records[0]?.context.message).toBeNull()
    expect(JSON.stringify(records)).not.toContain('Something Private')
  })
})
