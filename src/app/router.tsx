import { createBrowserRouter } from 'react-router-dom'

import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DiscoveryPage } from '@/features/discovery/DiscoveryPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

import { AppShell } from './layout/AppShell'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/discovery', element: <DiscoveryPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
