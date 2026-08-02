import '@testing-library/jest-dom/vitest'

import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

import { useItemUiStore } from '@/features/items/store/use-item-ui-store'

// Pages now chain a settings query before their content (and its own
// items/etc. query) mounts, so async UI updates take a couple of extra
// microtask hops. The default 1000ms findBy*/waitFor timeout is fine in
// isolation but gets tight under this machine's full 37-file parallel
// suite; raise it once here instead of bumping individual tests.
configure({ asyncUtilTimeout: 5000 })

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
// jsdom doesn't implement the Blob/File download URL APIs either, needed
// by the Settings page's "Export backup" button.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock'
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => undefined
}
/* eslint-enable @typescript-eslint/no-unnecessary-condition */

afterEach(() => {
  cleanup()
  useItemUiStore.setState({ isQuickCaptureOpen: false, selectedItemId: null })
})
