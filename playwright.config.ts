import { defineConfig } from "@playwright/test"

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3044"

export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  retries: 0,
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npx next dev -p 3044 -H 127.0.0.1",
    port: 3044,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
