export const THEMES = ['light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

export const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
}

export function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value)
}
