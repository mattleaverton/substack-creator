import { existsSync } from "node:fs";
import { defineConfig } from '@playwright/test';

const chromeCandidates = [
  process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter((value): value is string => Boolean(value));

const chromeExecutablePath = chromeCandidates.find((candidate) =>
  existsSync(candidate),
);

export default defineConfig({
  testDir: './src/__tests__/browser',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://app.local',
    viewport: { width: 1366, height: 900 },
    timezoneId: 'UTC',
    locale: 'en-US',
    launchOptions: chromeExecutablePath
      ? { executablePath: chromeExecutablePath }
      : undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
});
