import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render-with-providers'

import { NotFoundPage } from './NotFoundPage'

function renderAt(path: string) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Dashboard stand-in</p>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('NotFoundPage', () => {
  it('is what an unknown route resolves to', () => {
    renderAt('/nothing-here')

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('names the routes that do exist', () => {
    renderAt('/nothing-here')

    expect(
      screen.getByText(/dashboard, discovery, goals, or settings/i),
    ).toBeInTheDocument()
  })

  it('offers a way back that actually works', async () => {
    const user = userEvent.setup()
    renderAt('/nothing-here')

    await user.click(screen.getByRole('link', { name: /back to the dashboard/i }))

    expect(screen.getByText('Dashboard stand-in')).toBeInTheDocument()
  })

  it('does not hijack a route that does exist', () => {
    renderAt('/')

    expect(screen.getByText('Dashboard stand-in')).toBeInTheDocument()
    expect(screen.queryByText('404')).not.toBeInTheDocument()
  })
})
