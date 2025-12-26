import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',

  // Global timeout for each test (30 seconds)
  timeout: 30000,

  // Timeout for expect() assertions (5 seconds)
  expect: {
    timeout: 5000,
  },

  // Run tests sequentially since they share user state and database
  // Tests run against a single test user and shared PostgreSQL instance
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Use 1 worker to avoid race conditions with shared auth state and database
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Reduce default action timeout from 30s to 10s
    actionTimeout: 10000,

    // Reduce navigation timeout from 30s to 15s
    navigationTimeout: 15000,
  },

  // Configure projects for major browsers
  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Authenticated tests - depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },

    // Only run Firefox and Safari locally, not in CI (saves ~66% test time)
    ...(process.env.CI
      ? []
      : [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              storageState: 'tests/e2e/.auth/user.json',
            },
            dependencies: ['setup'],
            testIgnore: /auth\.setup\.ts/,
          },

          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              storageState: 'tests/e2e/.auth/user.json',
            },
            dependencies: ['setup'],
            testIgnore: /auth\.setup\.ts/,
          },
        ]),
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for Next.js to start
    stdout: 'ignore', // Don't log server output (reduces noise)
    stderr: 'pipe', // Only show errors
  },
})
