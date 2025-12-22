import nextConfig from 'eslint-config-next'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import vitestPlugin from 'eslint-plugin-vitest'

export default [
  ...nextConfig,
  eslintConfigPrettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Vitest test quality rules (US3 - Test Quality Audit)
  {
    files: ['tests/**/*.{test,spec}.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      'vitest/expect-expect': 'error',
      'vitest/valid-expect': 'error',
      'vitest/no-focused-tests': 'error',
    },
  },
]
