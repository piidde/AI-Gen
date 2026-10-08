import { test, expect, type Page } from "@playwright/test";

const routes = [
  ["/", "Official AI."],
  ["/models", "Great models."],
  ["/login", "Sign in to AIAPI.deals"],
  ["/signup", "Create your account"],
  ["/forgot-password", "Reset your password"],
] as const;

const e2eEmail = process.env.E2E_EMAIL;
const e2ePassword = process.env.E2E_PASSWORD;

test("public layouts fit tablet and narrow phone widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Explicit responsive viewport checks");
  for (const [path, width] of [["/docs", 900], ["/docs", 320], ["/", 320]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true);
  }
});

async function signIn(page: Page, route: string) {
  if (!e2eEmail || !e2ePassword) {
    test.skip(true, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated dashboard tests.");
    return;
  }
  await page.goto(`/login?next=${encodeURIComponent(route)}`);
  await page.getByLabel("Email").fill(e2eEmail);
  await page.getByLabel("Password").fill(e2ePassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".dashboard-main")).toBeVisible();
}

test("wide homepage preserves its reviewed composition", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Wide-screen regression");
  await page.setViewportSize({ width: 2550, height: 1340 });
  await page.goto("/");
  const home = await page.locator(".home-wrap").first().boundingBox();
  expect(home!.width).toBeGreaterThan(1200);
  expect(home!.width).toBeLessThan(1280);
  expect(Math.abs(home!.x - (2550 - home!.x - home!.width))).toBeLessThan(20);
  await page.screenshot({ path: testInfo.outputPath("homepage-wide.png"), fullPage: true });
});

test("wide dashboard routes use the available screen space", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Wide-screen regression");
  await page.setViewportSize({ width: 2550, height: 1340 });
  await signIn(page, "/dashboard");
  for (const route of [
    "/dashboard", "/dashboard/models", "/dashboard/usage",
    "/dashboard/billing", "/dashboard/api-keys", "/dashboard/settings",
  ]) {
    await page.goto(route);
    await expect(page.locator(".dashboard-main")).toBeVisible();
    const remainingSpace = await page.locator(".dashboard-main").evaluate(element =>
      document.documentElement.clientWidth - element.getBoundingClientRect().right,
    );
    expect(Math.abs(remainingSpace)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (route === "/dashboard") {
      await page.screenshot({ path: testInfo.outputPath("dashboard-wide.png"), fullPage: true });
    }
  }
});

test("reviewed routes load directly without runtime errors or document overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      heading,
    );
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
    ).toBe("rgb(241, 241, 236)");
    expect(await page.evaluate(() => document.fonts.check('15px "Archivo Variable"'))).toBe(
      true,
    );
  }
  expect(errors).toEqual([]);
});

test("dashboard routes require an authenticated session", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sign in to AIAPI.deals",
  );
});

test("dashboard navigation and history", async ({
  page,
}) => {
  await signIn(page, "/dashboard");
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Models", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/models$/);
  await expect(
    page.getByRole("link", { name: "Models", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
});

test("public missing pages and unusual topic names", async ({ page }) => {
  for (const path of [
    "/missing",
    "/information?topic=toString",
    "/information?topic=constructor",
    "/information?topic=__proto__",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Page not found",
    );
  }
});

test("catalogue filters, neutral detail links, modal Escape and focus return", async ({
  page,
}) => {
  await page.goto("/models");
  await page.getByLabel("Filter provider").click();
  await page.getByRole("option", { name: "Google", exact: true }).click();
  await page.getByLabel("Filter capability").click();
  await page.getByRole("option", { name: "Image", exact: true }).click();
  await expect(page.locator(".model-card")).toHaveCount(10);
  const details = page.getByRole("button", { name: /View details/ }).first();
  await details.hover();
  expect(
    await details.evaluate((element) => getComputedStyle(element).color),
  ).toBe("rgb(17, 17, 17)");
  await details.click();
  await expect(page.getByRole("dialog")).toContainText("Availability not verified");
  await page.keyboard.press("Escape");
  await expect(details).toBeFocused();
  await page.getByRole("searchbox", { name: "Search models" }).fill("no match");
  await expect(
    page.getByRole("heading", { name: "No matching models" }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Search models" }).fill("");
  await expect(page.locator(".model-card")).toHaveCount(10);
});

test("live request history loads from the backend and filters through the URL", async ({ page }) => {
  await signIn(page, "/dashboard/usage?period=all");
  await expect(page.getByTestId("request-count")).toBeVisible();
  await page.getByRole("combobox", { name: "Filter status" }).click();
  await page.getByRole("option", { name: "Failed", exact: true }).click();
  await expect(page).toHaveURL(/status=failed/);
  await expect(page.getByTestId("request-count")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("live API keys page lists metadata without revealing secrets", async ({ page }) => {
  await signIn(page, "/dashboard/api-keys");
  await expect(page.getByRole("heading", { name: /Your API keys|Create your first API key/ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/tw_live_[A-Za-z0-9_-]{20,}/);
});
test("account menu stays in the viewport and settings use the live profile", async ({
  page,
}) => {
  await signIn(page, "/dashboard");
  const accountTrigger = page.locator(".account-trigger");
  await accountTrigger.click();
  const accountPopover = page.locator(".account-popover");
  await expect(accountPopover).toBeVisible();
  const popoverBox = await accountPopover.boundingBox();
  const viewport = page.viewportSize();
  expect(popoverBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(popoverBox!.x).toBeGreaterThanOrEqual(0);
  expect(popoverBox!.x + popoverBox!.width).toBeLessThanOrEqual(viewport!.width);

  await accountPopover.getByRole("menuitem", { name: "Account settings" }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  await expect(page.getByLabel("Email address")).toHaveValue(e2eEmail!);
  const originalName = await page.getByLabel("Display name").inputValue();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  await page.getByLabel("Display name").fill("Edited demo");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved.");
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue("Edited demo");
  await page.getByLabel("Display name").fill(originalName);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved.");
  await page.getByRole("tab", { name: "Profile", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Billing", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAccessibleName(
    "Billing",
  );
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await page.getByRole("checkbox", { name: "Product updates" }).check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText(/saved/i);
});

test("live billing shows the server balance and overview chart exposes charged amounts", async ({ page }) => {
  await signIn(page, "/dashboard/billing");
  await expect(page.getByTestId("billing-balance")).toContainText("$");
  await signIn(page, "/dashboard");
  await expect(page.getByTestId("overview-balance")).toContainText("$");
});
