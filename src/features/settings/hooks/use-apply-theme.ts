import { useEffect } from 'react'

import { useSettingsQuery } from './use-settings'

/** Keeps <html>'s "dark" class in sync with the persisted theme setting. */
export function useApplyTheme(): void {
  const { data: settings } = useSettingsQuery()
  const theme = settings?.theme

  useEffect(() => {
    if (theme) {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])
}
