import { test, expect } from "@playwright/test";

const routes = [
  ["/", "More room"],
  ["/dashboard", "Overview"],
  ["/dashboard/models", "Models & pricing"],
  ["/dashboard/api-keys", "API keys"],
  ["/dashboard/usage", "Usage & requests"],
  ["/dashboard/billing", "Billing"],
  ["/dashboard/settings", "Account settings"],
  ["/models", "Models & pricing"],
] as const;

test("wide layouts use the available screen space", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Wide-screen regression");
  await page.setViewportSize({ width: 2550, height: 1340 });
  await page.goto("/");
  const home = await page.locator(".home-wrap").boundingBox();
  expect(home!.width).toBeGreaterThan(1400);
  expect(home!.width).toBeLessThan(1600);
  expect(Math.abs(home!.x - (2550 - home!.x - home!.width))).toBeLessThan(20);
  await page.screenshot({ path: testInfo.outputPath("homepage-wide.png"), fullPage: true });
  for (const [route] of routes.filter(([route]) => route.startsWith("/dashboard"))) {
    await page.goto(route);
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

test("navigation, history, missing pages and unusual topic names", async ({
  page,
}) => {
  await page.goto("/dashboard");
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
  await page.goto("/dashboard/models");
  await page.getByLabel("Filter provider").selectOption("Gemini");
  await page.getByLabel("Filter capability").selectOption("Image");
  await expect(page.locator(".model-card")).toHaveCount(1);
  const details = page.getByRole("button", { name: "View details" });
  await details.hover();
  expect(
    await details.evaluate((element) => getComputedStyle(element).color),
  ).toBe("rgb(221, 223, 226)");
  await details.click();
  await expect(page.getByRole("dialog")).toContainText("Not confirmed");
  await page.keyboard.press("Escape");
  await expect(details).toBeFocused();
  await page.getByRole("searchbox", { name: "Search models" }).fill("no match");
  await expect(
    page.getByRole("heading", { name: "No matching models" }),
  ).toBeVisible();
  await page.getByLabel("Demo state").selectOption("error");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("request filters combine, details are metadata only, and table scroll stays local", async ({
  page,
}) => {
  await page.goto("/dashboard/usage");
  await page.getByLabel("Filter status").selectOption("Failed");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Details for req_9c10" }).click();
  await expect(page.getByRole("dialog")).toContainText("Illustrative error");
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

test("sample key results retain modal focus and never create or revoke a credential", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") requests.push(request.url());
  });
  await page.goto("/dashboard/api-keys");
  const create = page.getByRole("button", {
    name: "Create API key +",
    exact: true,
  });
  await create.click();
  await page.getByLabel("Key name").fill("Example integration");
  await page.getByRole("button", { name: "Preview creation" }).click();
  await expect(
    page.getByRole("heading", { name: "Sample creation result" }),
  ).toBeFocused();
  await expect(page.getByRole("dialog")).toContainText(
    "DEMO-ONLY-NOT-A-VALID-API-KEY",
  );
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  // Native modal dialogs make the background inert; browsers may still let Tab
  // reach browser chrome, so DOM focus need not remain inside on every keypress.
  expect(
    await page
      .getByRole("dialog")
      .evaluate((element) => element.matches(":modal")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(create).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  const revoke = page.getByRole("button", {
    name: "Revoke Production",
    exact: true,
  });
  await revoke.click();
  await page.getByRole("button", { name: "Simulate revoke" }).click();
  await expect(
    page.getByRole("heading", { name: "Revocation preview" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(revoke).toBeFocused();
  await expect(
    page.locator("tbody .status", { hasText: "Active" }),
  ).toHaveCount(2);
  expect(requests).toEqual([]);
});

test("settings keyboard tabs, recoverable save errors and reset on reload", async ({
  page,
}) => {
  await page.goto("/dashboard/settings");
  await page.getByLabel("Display name").fill("Edited demo");
  await page.getByLabel("Demo state").selectOption("save-error");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Simulated save failure",
  );
  await expect(page.getByLabel("Display name")).toHaveValue("Edited demo");
  await page.getByLabel("Demo state").selectOption("populated");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Nothing was saved to an account",
  );
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
  await expect(page.getByRole("status")).toContainText("Nothing was saved");
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue("Sample account");
});

test("billing cannot accept payments and chart tabs expose updated data", async ({
  page,
}) => {
  await page.goto("/dashboard/billing");
  await page.getByRole("button", { name: "Add credits +" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "cannot accept payments",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Receipt ↗ for order_1028" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No document is generated",
  );
  await page.keyboard.press("Escape");
  await page.goto("/dashboard");
  await page.getByRole("tab", { name: "Requests", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Credits used", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("128.40");
  await expect(
    page.getByRole("img", { name: /Sample daily credits used/ }),
  ).toBeVisible();
});
