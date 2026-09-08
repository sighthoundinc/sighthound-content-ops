import { defineConfig } from "@playwright/test";

const baseURL = process.env.WORKFLOW_UI_BASE_URL;
const storageState = process.env.WORKFLOW_UI_STORAGE_STATE;
if (!baseURL || !storageState) {
  throw new Error("BLOCKED: set WORKFLOW_UI_BASE_URL and WORKFLOW_UI_STORAGE_STATE for a disposable test environment.");
}
const target = new URL(baseURL);
if (
  target.username || target.password || target.search || target.hash ||
  !["http:", "https:"].includes(target.protocol) || target.pathname !== "/" ||
  (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) &&
    (target.protocol !== "https:" || process.env.WORKFLOW_UI_ALLOWED_ORIGIN !== target.origin))
) {
  throw new Error("BLOCKED: target must be local or an explicitly allowlisted HTTPS staging origin.");
}

export default defineConfig({
  testDir: "./tests/workflow-ui",
  timeout: 20_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "./test-results/workflow",
  use: {
    baseURL, storageState,
    trace: "off", screenshot: "off", video: "off",
    serviceWorkers: "block",
    browserName: "chromium",
  },
});
