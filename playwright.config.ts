import { defineConfig } from '@playwright/test';

const PORT = 3210;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node dist/server/index.js',
    url: `http://127.0.0.1:${PORT}/healthz`,
    reuseExistingServer: !process.env.CI,
    // A fresh in-memory database per run unless E2E_DATABASE_URL points at a real Postgres (CI does).
    // SEED=demo adds a generated cover to board frame 0 so the image path is tested end to end.
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      SITE_URL: `http://127.0.0.1:${PORT}`,
      DATA_DIR: 'test-results/data',
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'memory://',
      SEED: 'demo',
      BRIEF_LIMIT: '1000',
    },
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 1024, height: 1366 }, hasTouch: true } },
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
});
