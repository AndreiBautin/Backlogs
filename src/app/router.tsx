import { createBrowserRouter } from 'react-router-dom'

import { appConfig } from '@/config/app-config'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DiscoveryPage } from '@/features/discovery/DiscoveryPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

import { AppShell } from './layout/AppShell'

/**
 * Built from configuration rather than hardcoded, because the same bundle
 * is served from `/` locally and from `/Backlogs/` on GitHub Pages. The
 * basename comes from Vite's `BASE_URL`, so the router and the asset
 * paths can never disagree about where the app lives.
 */
export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { path: '/', element: <DashboardPage /> },
        { path: '/discovery', element: <DiscoveryPage /> },
        { path: '/goals', element: <GoalsPage /> },
        { path: '/settings', element: <SettingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  appConfig.routerBasename === '' ? undefined : { basename: appConfig.routerBasename },
)
