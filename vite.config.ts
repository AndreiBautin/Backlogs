/// <reference types="vitest/config" />
import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

import packageJson from './package.json' with { type: 'json' }

/**
 * GitHub Pages has no rewrite rules: a request for `/goals` looks for a
 * file that does not exist and gets the 404 document. Serving a copy of
 * `index.html` as that document is the standard SPA fallback — the app
 * boots and React Router resolves the path client-side.
 *
 * The response still carries HTTP 404. That is a status-code artifact of
 * static hosting rather than a broken page, and it is documented in
 * docs/DEPLOYMENT.md.
 */
function spaFallbackPlugin(): Plugin {
  return {
    name: 'backlogs:spa-fallback',
    apply: 'build',
    closeBundle() {
      const index = fileURLToPath(new URL('./dist/index.html', import.meta.url))
      const fallback = fileURLToPath(new URL('./dist/404.html', import.meta.url))
      if (existsSync(index)) {
        copyFileSync(index, fallback)
      }
    },
  }
}

/**
 * Build metadata, supplied by CI and defaulted for local builds. Surfaced
 * in Settings → About so a deployed page can be tied back to a commit.
 */
const buildEnv = {
  'import.meta.env.VITE_APP_VERSION': JSON.stringify(
    process.env.VITE_APP_VERSION ?? packageJson.version,
  ),
  'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(
    process.env.VITE_COMMIT_SHA ?? 'local',
  ),
  'import.meta.env.VITE_BUILT_AT': JSON.stringify(
    process.env.VITE_BUILT_AT ?? new Date().toISOString(),
  ),
}

// https://vite.dev/config/
export default defineConfig({
  // `/` locally, `/Backlogs/` on GitHub Pages. The router reads the same
  // value back out of `import.meta.env.BASE_URL`, so they cannot drift.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), spaFallbackPlugin()],
  define: buildEnv,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Source maps are shipped deliberately: there is no proprietary logic
    // and no secret in this bundle, and a readable stack trace in a
    // portfolio app is worth more than obscurity that isn't protecting
    // anything.
    sourcemap: true,
    rollupOptions: {
      output: {
        // React and the router change far less often than app code, so
        // keeping them in their own chunk means a normal deploy only
        // invalidates the small half of the bundle.
        manualChunks(id: string) {
          if (/node_modules[\\/](react|react-dom|react-router)/.test(id)) {
            return 'react-vendor'
          }
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      // Coverage is a diagnostic here, not a gate. The interesting number
      // is how well `domain/` and `application/` are covered — presentation
      // code is verified by behaviour in the page tests, not by line count.
      include: ['src/domain/**', 'src/application/**', 'src/infrastructure/**'],
      exclude: ['**/*.test.ts', '**/*.contract.ts'],
    },
  },
})
