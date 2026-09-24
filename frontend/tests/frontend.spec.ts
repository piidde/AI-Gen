import { test, expect, type Page } from "@playwright/test";

const routes = [
  ["/", "Leading AI models."],
  ["/models", "Great models."],
  ["/login", "Sign in to Takewing AI"],
  ["/signup", "Create your account"],
  ["/forgot-password", "Reset your password"],
] as const;

const e2eEmail = process.env.E2E_EMAIL;
const e2ePassword = process.env.E2E_PASSWORD;

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
  const home = await page.locator(".home-wrap").boundingBox();
  expect(home!.width).toBeGreaterThan(1400);
  expect(home!.width).toBeLessThan(1600);
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
    ).toBe("rgb(16, 17, 18)");
    expect(await page.evaluate(() => document.fonts.check("15px Geist"))).toBe(
      true,
    );
  }
  expect(errors).toEqual([]);
});

test("dashboard routes require an authenticated session", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sign in to Takewing AI",
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
  ).toBe("rgb(221, 223, 226)");
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

test("request filters combine, details are metadata only, and table scroll stays local", async ({
  page,
}) => {
  await signIn(page, "/dashboard/usage?period=all&model=A");
  await page.getByLabel("Filter status").selectOption("failed");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Details for req_9c10" }).click();
  await expect(page.getByRole("dialog")).toContainText("Awaiting billing confirmation");
  await expect(page.getByRole("dialog")).toContainText(
    "No prompt or generated output",
  );
  await page.keyboard.press("Escape");
  await page.getByLabel("Filter model").selectOption("B");
  await expect(page.locator("tbody")).toContainText("No requests match");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("sample key results retain modal focus and update only demo metadata", async ({ page }) => {
  await signIn(page, "/dashboard/api-keys");
  const requests: string[] = [];
  page.on("request", request => { if (request.method() !== "GET") requests.push(request.url()); });
  const create = page.getByRole("button", { name: "Create API key +", exact: true });
  await create.click();
  await page.getByLabel("Key name", { exact: true }).fill("Example integration");
  await page.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  await expect(page.getByRole("dialog").getByRole("heading")).toBeFocused();
  expect(await page.getByRole("dialog").evaluate(element => element.matches(":modal"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(create).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Revoke Production", exact: true }).click();
  await page.getByRole("button", { name: "Confirm demo revocation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sample key revoked", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Your API keys", exact: true })).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  expect(requests).toEqual([]);
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
  await page.getByLabel("Display name").fill("Edited demo");
  await page.getByLabel("Demo state").selectOption("save-error");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Simulated save failure",
  );
  await expect(page.getByLabel("Display name")).toHaveValue("Edited demo");
  await page.getByLabel("Demo state").selectOption("populated");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved.");
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue("Edited demo");
  await page.getByLabel("Display name").fill(originalName);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved.");
  await page.getByRole("tab", { name: "Profile", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Notifications", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAccessibleName(
    "Notifications",
  );
  await page.getByRole("checkbox", { name: "Product updates" }).uncheck();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("Mock preferences saved");
});

test("billing cannot accept payments and chart tabs expose updated data", async ({
  page,
}) => {
  await signIn(page, "/dashboard/billing");
  await page.getByRole("button", { name: "Review $5 package", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No charge will be made",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Details for demo-order-sample-1" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "no real payment, refund or document",
  );
  await page.keyboard.press("Escape");
  await signIn(page, "/dashboard");
  await page.getByRole("tab", { name: "Requests", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Credits used", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText(await page.getByTestId("overview-credits").innerText());
  await expect(
    page.getByRole("img", { name: /Sample daily credits used/ }),
  ).toBeVisible();
});
