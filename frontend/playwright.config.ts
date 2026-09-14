import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: ".venv\\Scripts\\python -m uvicorn app.main:app --port 8000 --log-level warning",
      cwd: path.resolve(__dirname, "../backend"),
      url: "http://localhost:8000/health",
      timeout: 120_000,
      reuseExistingServer: !isCI,
    },
    {
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      timeout: 240_000,
      reuseExistingServer: !isCI,
    },
  ],
});
