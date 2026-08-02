import { LayoutDashboard, Search, Settings as SettingsIcon, Target } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useItemUiStore } from '@/features/items/store/use-item-ui-store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/discovery', label: 'Discovery', icon: Search, end: false },
  { to: '/goals', label: 'Goals', icon: Target, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
] as const

export function AppShell() {
  const openQuickCapture = useItemUiStore((state) => state.openQuickCapture)

  return (
    <div className="flex min-h-svh">
      <nav
        aria-label="Primary"
        className="border-border flex w-56 shrink-0 flex-col border-r p-4"
      >
        <span className="text-foreground mb-6 px-2 text-sm font-semibold">Backlogs</span>

        <Button onClick={openQuickCapture} className="mb-4 justify-start" size="sm">
          New
          <kbd className="border-border/60 ml-auto rounded border px-1.5 py-0.5 text-xs opacity-70">
            N
          </kbd>
        </Button>

        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
