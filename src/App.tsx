import { RouterProvider } from 'react-router-dom'

import { appLogger } from '@/app/app-logger'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { appConfig } from '@/config/app-config'

function App() {
  return (
    // Outside the providers on purpose: a failure while constructing the
    // query client or the repositories has to be caught too.
    <ErrorBoundary logger={appLogger} showDetails={!appConfig.isProduction}>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
