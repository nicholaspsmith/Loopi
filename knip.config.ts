import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // Next.js project detection
  next: true,

  // Entry points for the application
  entry: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.ts',
    'components/**/*.{ts,tsx}',
    'scripts/**/*.ts',
    // Test entry points for orphaned test detection
    'tests/**/*.{ts,tsx}',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
  ],

  // All project files to analyze
  project: ['**/*.{ts,tsx}'],

  // Test file patterns for Vitest/Playwright
  vitest: {
    entry: ['tests/**/*.{test,spec}.{ts,tsx}', 'vitest.config.ts'],
  },

  playwright: {
    entry: [
      'tests/e2e/**/*.spec.ts',
      'tests/e2e/**/*.setup.ts', // Playwright setup projects (e.g., auth.setup.ts)
      'playwright.config.ts',
    ],
  },

  // Files and directories to ignore
  ignore: [
    // Build outputs
    '.next/**',
    'dist/**',
    'build/**',

    // Dependencies
    'node_modules/**',

    // Database migrations (intentionally versioned)
    'drizzle/**',

    // Static assets
    'public/**',

    // External MCP servers (separate repos)
    'lance-context/**',

    // Serena configuration
    '.serena/**',

    // Generated files
    'next-env.d.ts',
    '*.d.ts',
  ],

  // Dependencies to ignore (peer deps, optional deps)
  ignoreDependencies: [
    // Peer dependencies that are used transitively
    '@types/node',
    '@types/react',
    '@types/react-dom',

    // Optional/peer dependencies for next-auth
    'nodemailer',
  ],

  // Binaries to ignore (used in npm scripts)
  ignoreBinaries: ['drizzle-kit', 'playwright', 'vitest'],

  // Workspaces (if applicable)
  workspaces: {
    '.': {
      entry: ['app/**/*.{ts,tsx}', 'lib/**/*.ts', 'components/**/*.{ts,tsx}', 'scripts/**/*.ts'],
      project: ['**/*.{ts,tsx}'],
    },
  },
}

export default config
