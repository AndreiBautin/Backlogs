import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * The layer rule, enforced rather than documented.
 *
 * docs/ARCHITECTURE.md says dependencies point inward only. A document
 * cannot fail a build, so the same rule lives here too: an import that
 * breaks the layering is a lint error with a message explaining why,
 * caught before it is ever committed.
 */
const layerBoundaries = [
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/application/*',
                '@/infrastructure/*',
                '@/features/*',
                '@/app/*',
                '@/components/*',
                '@/config/*',
                'react',
                'react-*',
                '@tanstack/*',
                'zustand',
              ],
              message:
                'domain/ is the innermost layer: it may not import from any other layer, from React, or from any library. Business rules stay pure so they can be tested by calling them.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/infrastructure/*',
                '@/features/*',
                '@/app/*',
                '@/components/*',
                'react',
                'react-*',
                '@tanstack/*',
                'zustand',
              ],
              message:
                'application/ may depend on domain/ only. If a use-case needs something concrete (a repository, a fixture, a clock), take it as a parameter and let src/app/di.ts wire it in.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/app/*', '@/components/*', 'react', 'react-*'],
              message:
                'infrastructure/ implements domain ports. It may not reach up into the UI or the composition root.',
            },
          ],
        },
      ],
    },
  },
]

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // Logging goes through the structured logger, which filters by level
      // and is built to carry event names and scalars — never item content.
      // A stray console.log bypasses both guarantees.
      'no-console': 'error',

      // Every LocalStorage key must come from config/storage-keys.ts, or the
      // demo and personal datasets can collide. Repositories take their key
      // as a constructor option; nothing else should name one.
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message:
            'Only src/infrastructure/storage/* may touch localStorage, and only via an injected storage key from config/storage-keys.ts.',
        },
        {
          object: 'window',
          property: 'sessionStorage',
          message: 'Persistence belongs behind a repository port, not in a component.',
        },
      ],
    },
  },

  ...layerBoundaries,

  {
    // The one file allowed to write to the console — it is the sink the
    // rest of the app logs through.
    files: ['src/shared/logging/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // The composition root and tests legitimately name concrete storage.
    files: [
      'src/app/di.ts',
      'src/infrastructure/storage/**/*.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
      'src/test/**/*.{ts,tsx}',
    ],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    // The layer rule constrains what *ships*, not what verifies it. A
    // use-case test reaching for InMemoryItemRepository is the intended
    // design — that double exists precisely so application-layer tests
    // need no mocking — so tests are exempt from the import boundaries.
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  eslintConfigPrettier,
])
