import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { useKeyboardShortcut } from './use-keyboard-shortcut'

function ShortcutHarness({ onTrigger }: { onTrigger: () => void }) {
  useKeyboardShortcut('n', onTrigger)
  return (
    <div>
      <input aria-label="some text field" />
    </div>
  )
}

describe('useKeyboardShortcut', () => {
  it('invokes the handler when the key is pressed', async () => {
    const user = userEvent.setup()
    const onTrigger = vi.fn()
    render(<ShortcutHarness onTrigger={onTrigger} />)

    await user.keyboard('n')

    expect(onTrigger).toHaveBeenCalledOnce()
  })

  it('is case-insensitive', async () => {
    const user = userEvent.setup()
    const onTrigger = vi.fn()
    render(<ShortcutHarness onTrigger={onTrigger} />)

    await user.keyboard('N')

    expect(onTrigger).toHaveBeenCalledOnce()
  })

  it('does not trigger while typing in a text field', async () => {
    const user = userEvent.setup()
    const onTrigger = vi.fn()
    render(<ShortcutHarness onTrigger={onTrigger} />)

    await user.click(screen.getByLabelText('some text field'))
    await user.keyboard('n')

    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('ignores the key when a modifier is held', async () => {
    const user = userEvent.setup()
    const onTrigger = vi.fn()
    render(<ShortcutHarness onTrigger={onTrigger} />)

    await user.keyboard('{Meta>}n{/Meta}')

    expect(onTrigger).not.toHaveBeenCalled()
  })
})
