import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { appLogger } from '@/app/app-logger'
import { appConfig } from '@/config/app-config'

import './index.css'
import App from './App.tsx'

// Configuration problems degrade to defaults rather than throwing, so the
// only way to notice one is for the bootstrap to say so.
for (const warning of appConfig.warnings) {
  appLogger.warn('config.invalid', { detail: warning })
}

appLogger.info('app.start', {
  mode: appConfig.mode,
  version: appConfig.build.version,
  commit: appConfig.build.commit,
  basePath: appConfig.basePath,
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element with id "root" was not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
