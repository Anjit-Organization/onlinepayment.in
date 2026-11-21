import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Module boundaries are enforced here, not by convention. TECHNICAL.md §2.
 * Architecture docs rot in month three; lint rules do not.
 */
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'drizzle/**', 'next-env.d.ts'] },

  // Node scripts: real Node globals, and they are allowed to use console.
  {
    files: ['scripts/**/*.{mjs,js,ts}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
      },
    },
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'off', // the logger is the only intended caller
    },
  },

  // Modules may only be imported through their public barrel.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // `@/modules/<name>/client` is a deliberate second entry point:
              // a client-safe surface with no node: imports. Everything else
              // inside a module stays private.
              group: ['@/modules/*/*', '!@/modules/*/client'],
              message:
                'Import from the module barrel (@/modules/<name>) or its client entry (@/modules/<name>/client).',
            },
          ],
        },
      ],
    },
  },

  // common/ must never depend on features.
  {
    files: ['src/common/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/modules/*'], message: 'common/ cannot depend on modules/' }] },
      ],
    },
  },

  // domain/ must stay pure: no DB, no framework, no env.
  {
    files: ['src/modules/*/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/common/db*', 'next/*', 'next'], message: 'domain/ must stay pure' },
          ],
        },
      ],
    },
  },

  // process.env is read in exactly one place.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/common/config/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read validated config from @/common/config instead of process.env.',
        },
      ],
    },
  },
)
