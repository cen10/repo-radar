import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
  globalIgnores(['dist', '.next', 'src/types/*.generated.ts', 'next-env.d.ts']),

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,

  // Shared rules for all TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Source files: React, browser globals, type-aware linting
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Shared components: ban direct react-router-dom imports to prevent Next.js runtime crashes
  // Use LinkAdapter/NavLinkAdapter/useAppRouter from src/hooks/routing instead
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-router-dom',
              message:
                'Use routing adapters from @/hooks/routing (LinkAdapter, NavLinkAdapter, useAppRouter) instead. Direct react-router-dom imports break the Next.js build.',
            },
          ],
        },
      ],
    },
  },

  // Next.js app directory: ban react-router-dom entirely (Next.js uses next/navigation)
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-router-dom',
              message:
                'Next.js uses next/navigation for routing. Use useRouter from next/navigation or routing adapters from @/hooks/routing.',
            },
          ],
        },
      ],
    },
  },

  // Node config files
  {
    files: ['vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
  },

  // E2E test files: Playwright, Node globals, type-aware linting
  {
    files: ['tests/e2e/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  }
);
