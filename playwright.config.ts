import { defineConfig } from "@playwright/test";

const liveURL = process.env.PLAYWRIGHT_BASE_URL;
const port = Number(process.env.ADP_E2E_PORT || 4311);
if (!Number.isInteger(port) || port < 1024 || port > 65534)
  throw new Error("ADP_E2E_PORT must be an integer from 1024 to 65534.");
const previewURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  projects: [{ name: "production" }],
  use: {
    baseURL: liveURL || previewURL,
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  webServer: liveURL
    ? undefined
    : {
        command: `npm run build && npm run preview -- --port ${port}`,
        url: previewURL,
        reuseExistingServer: false,
        timeout: 120000,
      },
});
