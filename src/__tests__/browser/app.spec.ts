import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const INDEX_PATH = path.join(DIST_DIR, "index.html");

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const getContentType = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
};

const resolveDistPath = (requestPath: string): string | null => {
  const normalizedPath = requestPath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(DIST_DIR, normalizedPath);
  if (
    resolvedPath !== DIST_DIR &&
    !resolvedPath.startsWith(`${DIST_DIR}${path.sep}`)
  ) {
    return null;
  }
  return resolvedPath;
};

test.beforeEach(async ({ context }) => {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(
      "dist/index.html is missing. Run `npm run build` before browser tests.",
    );
  }

  await context.route("http://app.local/**", async (route) => {
    const url = new URL(route.request().url());
    const requestPath = decodeURIComponent(url.pathname);

    if (
      requestPath === "/" ||
      requestPath === "/index.html" ||
      path.extname(requestPath) === ""
    ) {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: fs.readFileSync(INDEX_PATH),
      });
      return;
    }

    const assetPath = resolveDistPath(requestPath);
    if (
      !assetPath ||
      !fs.existsSync(assetPath) ||
      !fs.statSync(assetPath).isFile()
    ) {
      await route.fulfill({
        status: 404,
        contentType: "text/plain; charset=utf-8",
        body: "Not found",
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: getContentType(assetPath),
      body: fs.readFileSync(assetPath),
    });
  });
});

test("IT-2 first run routes to settings", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.screenshot({
    path: ".ai/test-evidence/latest/browser/it-2-settings.png",
    fullPage: true,
  });
});

test("IT-5 new post route renders step indicator", async ({ page }) => {
  await page.goto("/new-post");
  await expect(page.getByTestId("step-indicator")).toBeVisible();
  await page.screenshot({
    path: ".ai/test-evidence/latest/browser/it-5-new-post.png",
    fullPage: true,
  });
});

test("IT-12 dashboard has primary actions", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-new-post")).toBeVisible();
  await expect(page.getByTestId("dashboard-trending-topics")).toBeVisible();
  await page.screenshot({
    path: ".ai/test-evidence/latest/browser/it-12-dashboard.png",
    fullPage: true,
  });
});
