import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import { useItemUiStore } from '@/features/items/store/use-item-ui-store'

// jsdom doesn't implement the Pointer Events capture API or scrollIntoView,
// both of which Radix UI's Select/Dialog primitives rely on. @types/dom
// declares these as always present, so the guards are "unnecessary" by the
// type checker even though they're required at runtime under jsdom.
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => undefined
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => undefined
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined
}
/* eslint-enable @typescript-eslint/no-unnecessary-condition */

afterEach(() => {
  cleanup()
  useItemUiStore.setState({ isQuickCaptureOpen: false, selectedItemId: null })
})
