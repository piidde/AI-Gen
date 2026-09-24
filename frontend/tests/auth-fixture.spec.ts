import { test, expect, type Locator, type Page } from "@playwright/test";
import { getSafeNext } from "../src/auth/authUtils";

const email = "fixture@example.com";

async function selectDropdown(scope: Page | Locator, label: string, option: string) {
  await scope.getByRole("combobox", { name: label, exact: true }).click();
  await scope.getByRole("option", { name: option, exact: true }).click();
}

test("overview shares periods, top models and all-time savings", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard");
  await expect(page.getByRole("combobox", { name: "Overview period" })).toContainText("7 days");
  await expect(page.getByTestId("overview-balance")).toContainText("333,000");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Top models by credits" })).toBeVisible();
  const savings = page.getByRole("region", { name: "All-time savings" });
  await expect(savings).toContainText("You saved");
  await expect(savings).toContainText("excluded");
  const saved = await savings.innerText();
  const before = Number(await page.getByTestId("overview-requests").innerText());
  await page.getByRole("combobox", { name: "Overview period" }).click();
  await page.getByRole("option", { name: "30 days" }).click();
  await expect(page.getByTestId("overview-requests")).not.toHaveText(String(before));
  await expect(savings).toHaveText(saved, { useInnerText: true });
  await page.getByRole("tab", { name: "Requests", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tabpanel")).toContainText(await page.getByTestId("overview-credits").innerText());
  await expect(page.getByRole("link", { name: "All updates" })).toBeVisible();
  const chart = page.getByRole("img", { name: /Sample daily/ });
  await chart.focus();
  await chart.press("Home");
  await expect(page.locator(".usage-chart__tooltip")).toBeVisible();
  await expect(page.locator(".usage-chart__tooltip")).toContainText("credits used");
  await chart.press("End");
  await expect(page.locator(".usage-chart__active-point")).toHaveCount(1);
  await chart.press("Escape");
  await expect(page.locator(".usage-chart__tooltip")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  const notice = await page.getByRole("complementary", { name: "Service status notice" }).boundingBox();
  expect(notice!.y).toBeGreaterThan(0);
  const requests = await page.getByTestId("overview-requests").innerText();
  await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: /View usage details/ }).click();
  await expect(page.getByRole("combobox", { name: "Request period" })).toContainText("30 days");
  await expect(page.getByTestId("request-count")).toHaveText(requests);
});

test("overview longer periods preserve URL state, monthly totals and a clean header", async ({ page }) => {
  await signIn(page, "/dashboard");
  await expect(page.getByText("Choose a fictional scenario", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Overview preview")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh overview" })).toHaveCount(0);
  const shortTotal = Number(await page.getByTestId("overview-requests").innerText());
  for (const [label, value] of [["6 months", "6m"], ["1 year", "1y"], ["All time", "all"]]) {
    await page.getByRole("combobox", { name: "Overview period" }).click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp("period=" + value));
    await expect(page.getByRole("img", { name: /Sample monthly/ })).toBeVisible();
    expect(Number(await page.getByTestId("overview-requests").innerText())).toBeGreaterThan(shortTotal);
  }
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Overview period" })).toContainText("All time");
  await expect(page.getByRole("region", { name: "Top models by credits used" }).locator("li")).toHaveCount(4);
  await page.getByRole("link", { name: /View usage details/ }).click();
  await expect(page.getByRole("combobox", { name: "Request period" })).toContainText("All time");
});

test("dashboard bottom dividers and Overview columns align across desktop widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop fixed sidebar geometry");
  await signIn(page, "/dashboard");
  for (const width of [2560, 1440, 900, 721]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/dashboard", "/dashboard/api-keys"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (route === "/dashboard") await expect(page.locator(".overview-chart-card")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(async () => page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const account = document.querySelector(".sidebar .account-menu")!.getBoundingClientRect();
        const footer = document.querySelector(".dashboard-main .public-footer")!.getBoundingClientRect();
        return Math.abs(account.top - footer.top);
      })).toBeLessThan(1);
      if (route === "/dashboard" && width >= 1440) {
        const gap = await page.evaluate(() => Math.abs(document.querySelector(".overview-chart-card")!.getBoundingClientRect().bottom - document.querySelector(".overview-side")!.getBoundingClientRect().bottom));
        expect(gap).toBeLessThan(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

const user = {
  id: "00000000-0000-4000-8000-000000000001", aud: "authenticated",
  role: "authenticated", email, created_at: "2026-09-20T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Fixture user" },
  email_confirmed_at: "2026-09-20T00:00:00Z",
  identities: [{ id: "fixture-email", provider: "email", user_id: "00000000-0000-4000-8000-000000000001", identity_data: { email } }],
};

test("dashboard shares incident notices with public status without leaking account context", async ({ page }) => {
  await signIn(page, "/dashboard?statusPreview=incident");
  const notice = page.getByRole("complementary", { name: "Service status notice" });
  await expect(notice).toContainText("Sample service disruption");
  await notice.getByRole("link").click();
  await expect(page).toHaveURL(/\/status\?statusPreview=incident$/);
  await expect(page.locator("main")).not.toContainText(email);
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("Sample service disruption");
  await page.goBack();
  await expect(notice).toContainText("Sample service disruption");
  await page.getByRole("link", { name: "Cookie preferences", exact: true }).click();
  await expect(page.locator("#cookie-preferences")).toBeInViewport();
});

test("account settings save notification drafts and preview safe access changes", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /^Product updates/ })).not.toBeChecked();
  await page.getByRole("checkbox", { name: /^Low-balance email alerts/ }).check();
  await page.getByLabel("Credit alert threshold", { exact: true }).fill("400000");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("saved for this session");
  await page.screenshot({ path: testInfo.outputPath("account-notifications.png"), fullPage: true });
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await page.getByLabel("New email address").fill("new@example.com");
  await page.getByRole("button", { name: "Request mock email change" }).click();
  await expect(page.getByRole("dialog")).toContainText("Mock email change pending verification");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Change email", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await page.getByLabel("Sample new password", { exact: true }).fill("sample-only-password");
  await page.getByLabel("Confirm sample password", { exact: true }).fill("sample-only-password");
  await page.getByRole("button", { name: "Save mock password" }).click();
  await expect(page.getByRole("dialog")).toContainText("unchanged");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Preview account deletion" }).click();
  await expect(page.getByRole("dialog")).toContainText("333,000");
  await page.getByRole("checkbox", { name: "Simulate confirmed identity" }).check();
  await page.getByRole("button", { name: "Continue with simulated identity" }).click();
  await page.getByRole("checkbox", { name: "I understand credit forfeiture and API-access termination" }).check();
  await page.getByRole("button", { name: "Confirm mock deletion" }).click();
  await expect(page.getByRole("dialog")).toContainText("not deleted");
  await page.screenshot({ path: testInfo.outputPath("account-deletion.png") });
  await page.keyboard.press("Escape");
  await expect(page.locator(".dashboard-main")).toBeVisible();
});

test("settings keeps unsaved edits when navigation is dismissed and discards them on acceptance", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  const displayName = page.getByLabel("Display name");
  const originalName = await displayName.inputValue();
  await displayName.fill("Unsent profile edit");
  page.once("dialog", async dialog => {
    expect(dialog.message()).toBe("Discard your unsaved changes?");
    await dialog.dismiss();
  });
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await expect(displayName).toHaveValue("Unsent profile edit");
  await expect(page.getByRole("tab", { name: "Profile", exact: true })).toHaveAttribute("aria-selected", "true");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(displayName).toHaveValue(originalName);

  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Product updates/ }).check();
  page.once("dialog", async dialog => {
    expect(dialog.message()).toBe("Discard your unsaved changes?");
    await dialog.dismiss();
  });
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  await expect(page.getByRole("checkbox", { name: /^Product updates/ })).toBeChecked();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("notification threshold is conditional and unchanged preferences cannot be saved", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  const save = page.getByRole("button", { name: "Save preferences" });
  const threshold = page.getByLabel("Credit alert threshold", { exact: true });
  await expect(threshold).toHaveCount(0);
  await expect(save).toBeDisabled();
  await page.getByRole("checkbox", { name: /^Low-balance/ }).check();
  await expect(threshold).toHaveValue("100000");
  await threshold.fill("400000");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled();
  await page.getByRole("checkbox", { name: /^Low-balance/ }).uncheck();
  await expect(threshold).toHaveCount(0);
  await expect(save).toBeEnabled();
});

test("account preferences persist within one session and isolate signed-in accounts", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save preferences" })).toBeDisabled();
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: /^Low-balance/ }).check();
  await page.getByLabel("Credit alert threshold", { exact: true }).fill("400000");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  await expect(page.getByRole("button", { name: "Save preferences" })).toBeDisabled();
  await page.getByRole("link", { name: "Billing", exact: true }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toHaveValue("400000");
  await page.locator(".account-trigger").click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  const second = { ...user, id: "00000000-0000-4000-8000-000000000002", email_confirmed_at: null, identities: [{ ...user.identities[0], provider: "google" }], app_metadata: { provider: "google", providers: ["google"] } };
  await page.route("**/auth/v1/token?grant_type=password", route => route.fulfill({ json: { ...session(), user: second } }));
  await page.route("**/auth/v1/user", route => route.fulfill({ json: second }));
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /^Low-balance/ })).not.toBeChecked();
  await expect(page.getByText("Not verified — low-balance alerts are paused")).toBeVisible();
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await expect(page.getByRole("button", { name: "Change password", exact: true })).toHaveCount(0);
  await expect(page.getByText(/Your sign-in provider manages your password/)).toBeVisible();
  await page.getByRole("tab", { name: "Billing", exact: true }).click();
  await expect(page.getByRole("form", { name: "Billing details" })).toBeVisible();
});

test("account notification cancellation restores keyboard focus", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Product updates/ }).check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.getByRole("button", { name: "Cancel save" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Save preferences" })).toBeFocused();
  await expect(page.getByRole("checkbox", { name: /^Product updates/ })).toBeChecked();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.getByRole("tab", { name: "Notifications", exact: true }).focus();
  await expect(page.getByRole("button", { name: "Cancel save" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Notifications", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Save preferences" })).toBeDisabled();
});

test("account access cancellation never mutates the real account", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  const mutations: string[] = [];
  page.on("request", request => { if (!['GET', 'HEAD'].includes(request.method())) mutations.push(new URL(request.url()).pathname); });
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await page.getByLabel("New email address").fill("failed@example.com");
  await page.getByRole("button", { name: "Request mock email change" }).click();
  await expect(page.getByRole("button", { name: /Pending/ })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await expect(page.getByText(/Mock pending verification:/)).toHaveCount(0);
  await page.getByRole("button", { name: "Preview account deletion" }).click();
  await expect(page.getByRole("button", { name: "Continue with simulated identity" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Simulate confirmed identity" }).check();
  await page.getByRole("button", { name: "Continue with simulated identity" }).click();
  await expect(page.getByRole("dialog")).toContainText("Identity confirmation simulated");
  await page.getByRole("checkbox", { name: "I understand credit forfeiture and API-access termination" }).check();
  await page.getByRole("button", { name: "Confirm mock deletion" }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await expect(page.locator(".dashboard-main")).toBeVisible();
  expect(mutations).toEqual([]);
});
function session(expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  return { access_token: "fixture-access-not-a-credential", refresh_token: "fixture-refresh-not-a-credential",
    token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user };
}

test.beforeEach(async ({ context }) => {
  // Deny unexpected network access; the fixture must never contact a real service.
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:4174") return route.continue();
    if (url.origin === "https://auth.takewing.invalid") {
      if (url.pathname.endsWith("/token")) return route.fulfill({ json: session() });
      if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
      if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204 });
    }
    await route.abort("blockedbyclient");
    throw new Error(`Unexpected fixture request: ${url.origin}${url.pathname}`);
  });
});

async function signIn(page: Page, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".dashboard-main")).toBeVisible();
}

test("account signup details are optional samples and do not leak into real auth", async ({ page }, testInfo) => {
  let payload: Record<string, unknown> = {};
  await page.route("**/auth/v1/signup**", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { user, session: null } });
  });
  await page.goto("/signup?next=%2Fdashboard%2Fusage%3Fperiod%3D7d");
  await page.getByText("Optional billing details", { exact: true }).click();
  await selectDropdown(page, "Account type (optional)", "Business");
  await page.getByLabel("Company", { exact: true }).fill("Sample signup company");
  await page.getByLabel("VAT ID", { exact: true }).fill("SAMPLE-VAT");
  expect(await page.locator(".signup-billing [required]").count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("signup-optional-details.png"), fullPage: true });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByLabel("Confirm password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(JSON.stringify(payload)).not.toContain("Sample signup company");
  expect(JSON.stringify(payload)).not.toContain("SAMPLE-VAT");
  await expect(page.getByLabel("Company", { exact: true })).toHaveValue("Sample signup company");
  await expect(page.getByRole("link", { name: "Complete billing details after sign-in" })).toHaveAttribute("href", "/dashboard/settings");
});

test("account expired auth links offer safe recovery and preserve reset destination", async ({ page }) => {
  const next = "/dashboard/usage?period=7d";
  await page.goto(`/auth/callback?error=access_denied&error_code=otp_expired&next=${encodeURIComponent(next)}`);
  await expect(page.getByRole("alert")).toContainText("expired");
  await expect(page.getByRole("link", { name: "Return to sign in" })).toHaveAttribute("href", `/login?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Request a new confirmation email" }).click();
  await page.route("**/auth/v1/resend**", route => route.fulfill({ json: {} }));
  await page.getByLabel("Confirmation email").fill(email);
  await page.getByRole("button", { name: "Resend confirmation" }).click();
  await expect(page.getByRole("status")).toContainText("If confirmation is needed");
  await page.goto(`/update-password?next=${encodeURIComponent(next)}#error=access_denied&error_code=otp_expired`);
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Request a new reset link" }).click();
  let redirect = "";
  await page.route("**/auth/v1/recover**", route => {
    redirect = new URL(route.request().url()).searchParams.get("redirect_to") ?? "";
    return route.fulfill({ json: {} });
  });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  expect(redirect).toBe(`http://127.0.0.1:4174/update-password?next=${encodeURIComponent(next)}`);
});

test("billing reviews packages, survives pending reload and credits only explicit demo confirmation", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/billing?payment=success");
  await expect(page.getByRole("combobox", { name: "Demo state" })).toHaveCount(0);
  await expect(page.getByTestId("demo-balance")).toHaveText("333,000 credits");
  await expect(page.locator(".package-card")).toHaveCount(7);
  await expect(page.locator(".package-card").first()).toContainText("Base credits");
  await expect(page.locator(".package-card").first()).toContainText("Total credits");
  await page.screenshot({ path: testInfo.outputPath("billing-packages.png"), fullPage: true });
  await selectDropdown(page, "Billing display currency", "EUR");
  await expect(page.locator(".package-card").first()).toContainText("EUR estimate unavailable");
  const choose = page.getByRole("button", { name: "Review $10 package", exact: true });
  await choose.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("$10.00 USD");
  await expect(dialog).toContainText("732,600");
  await page.screenshot({ path: testInfo.outputPath("billing-review.png") });
  await page.keyboard.press("Escape");
  await expect(choose).toBeFocused();
  await choose.click();
  await dialog.getByRole("button", { name: "Continue demo checkout" }).click();
  await expect(dialog.getByRole("button", { name: "Starting demo…" })).toBeDisabled();
  await expect(dialog).toContainText("Do not pay again");
  await expect(page.getByTestId("demo-balance")).toHaveText("333,000 credits");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Review pending order" })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("button", { name: "Review $5 package", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Review pending order" }).click();
  await expect(dialog).toContainText("Do not pay again");
  await selectDropdown(dialog, "Simulated provider outcome", "Confirmed and credited (demo)");
  await dialog.getByRole("button", { name: "Apply demo outcome" }).click();
  await expect(dialog).toContainText("Simulated confirmation");
  await expect(page.getByTestId("demo-balance")).toHaveText("1,065,600 credits");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Payment history", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByTestId("overview-balance")).toContainText("1,065,600");
});

test("billing explains captured failure, refund and document failures without retrying payment", async ({ page }) => {
  await signIn(page, "/dashboard/billing");
  await page.getByRole("button", { name: "Review $5 package", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Continue demo checkout" }).click();
  await selectDropdown(dialog, "Simulated provider outcome", "Captured, unfulfilled · refund pending");
  await dialog.getByRole("button", { name: "Apply demo outcome" }).click();
  await expect(dialog).toContainText("Captured funds, credits not delivered");
  await expect(dialog).toContainText("Do not pay again");
  await selectDropdown(dialog, "Simulated provider outcome", "Captured funds refunded");
  await dialog.getByRole("button", { name: "Apply demo outcome" }).click();
  await expect(dialog).toContainText("Sample refund completed");
  await expect(page.getByTestId("demo-balance")).toHaveText("333,000 credits");
  await selectDropdown(dialog, "Document response preview", "Access denied");
  await dialog.getByRole("button", { name: "Request receipt" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Access denied");
  await selectDropdown(dialog, "Document response preview", "Download failed");
  await dialog.getByRole("button", { name: "Request invoice" }).click();
  await expect(dialog.getByRole("alert")).toContainText("could not be retrieved");
  await selectDropdown(dialog, "Document response preview", "Current availability");
  await dialog.getByRole("button", { name: "Request invoice" }).click();
  await expect(dialog).toContainText("No authentic document exists");
  await expect(dialog.locator("time").first()).toContainText(/UTC|Europe|America|Asia/);
  await expect(dialog.getByRole("link", { name: "Payment support" })).toHaveAttribute("href", "/support");
});

test("billing details are directly editable and share session saves with Settings", async ({ page }) => {
  await signIn(page, "/dashboard/billing");
  const form = page.getByRole("form", { name: "Billing details" });
  await expect(form.getByRole("combobox", { name: "Billing save preview" })).toHaveCount(0);
  await form.getByLabel("Company", { exact: true }).fill("Example studio");
  await form.getByRole("button", { name: "Save billing details" }).click();
  await expect(form.getByRole("button", { name: "Saving billing details…" })).toBeDisabled();
  await expect(form.getByLabel("Company", { exact: true })).toBeDisabled();
  await expect(form.getByRole("status")).toContainText("saved for this demo session");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Billing", exact: true }).click();
  await expect(page.getByRole("form", { name: "Billing details" }).getByLabel("Company", { exact: true })).toHaveValue("Example studio");
  await page.getByRole("link", { name: "Billing", exact: true }).click();
  await page.getByRole("button", { name: "Details for demo-order-sample-1" }).click();
  await page.getByRole("link", { name: "Payment support" }).click();
  await page.goBack();
  await expect(page.getByRole("form", { name: "Billing details" }).getByLabel("Company", { exact: true })).toHaveValue("Example studio");
});

test("billing aborts closed checkout and reports copy denial", async ({ page }) => {
  await signIn(page, "/dashboard/billing");
  await page.getByRole("button", { name: "Review $5 package", exact: true }).click();
  await page.getByRole("button", { name: "Continue demo checkout" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Review $5 package", exact: true }).click();
  await page.getByRole("button", { name: "Continue demo checkout" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Do not pay again");
  await selectDropdown(dialog, "Simulated provider outcome", "Failed before capture");
  await dialog.getByRole("button", { name: "Apply demo outcome" }).click();
  await expect(dialog).toContainText("No funds captured, no cash refund required");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
  await dialog.getByRole("button", { name: "Copy safe order details" }).click();
  await expect(dialog).toContainText("Could not copy");
  await page.keyboard.press("Escape");
  await expect(page.locator("tbody tr")).toHaveCount(5);
});

test("billing storage denial is explicit and cannot confirm payment", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith("takewing-demo-pending-order")) throw new DOMException("Denied", "SecurityError");
      return original.call(this, key, value);
    };
  });
  await signIn(page, "/dashboard/billing?status=paid");
  await page.getByRole("button", { name: "Review $5 package", exact: true }).click();
  await page.getByRole("button", { name: "Continue demo checkout" }).click();
  await expect(page.getByRole("dialog")).toContainText("Do not pay again");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alert")).toContainText("Tab storage unavailable");
  await expect(page.getByTestId("demo-balance")).toHaveText("333,000 credits");
});

test("billing cancels a departing profile save and isolates another signed-in account", async ({ page }) => {
  await signIn(page, "/dashboard/billing");
  const company = page.getByRole("form", { name: "Billing details" }).getByLabel("Company", { exact: true });
  await company.fill("Cancelled edit");
  await page.getByRole("button", { name: "Save billing details" }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Billing", exact: true }).click();
  await expect(company).toHaveValue("");
  await company.fill("First account only");
  await page.getByRole("button", { name: "Save billing details" }).click();
  await expect(page.getByRole("form", { name: "Billing details" }).getByRole("status")).toContainText("saved for this demo session");
  await page.getByRole("link", { name: "Billing", exact: true }).click();
  await page.getByRole("button", { name: "Review $5 package", exact: true }).click();
  await page.getByRole("button", { name: "Continue demo checkout" }).click();
  await expect(page.getByRole("dialog")).toContainText("Do not pay again");
  await page.keyboard.press("Escape");
  await page.locator(".account-trigger").click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.locator(".dashboard-main")).toHaveCount(0);
  const second = { ...user, id: "00000000-0000-4000-8000-000000000002" };
  await page.route("**/auth/v1/token?grant_type=password", route => route.fulfill({ json: { ...session(), user: second } }));
  await page.route("**/auth/v1/user", route => route.fulfill({ json: second }));
  await signIn(page, "/dashboard/billing");
  await expect(company).toHaveValue("");
  await expect(page.getByRole("button", { name: "Review pending order" })).toHaveCount(0);
  await expect(page.getByTestId("demo-balance")).toHaveText("333,000 credits");
});

test("return paths preserve local filters and reject external/control-character destinations", () => {
  expect(getSafeNext("/dashboard/usage?status=Failed")).toBe("/dashboard/usage?status=Failed");
  for (const unsafe of ["https://example.com", "//example.com", "/\\example.com", "/\t/example.com", "/\n/example.com", "/\r/example.com"]) {
    expect(getSafeNext(unsafe), JSON.stringify(unsafe)).toBe("/dashboard");
  }
});

test("expired session redirects with filters and returns after sign-in", async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem("sb-auth-auth-token", JSON.stringify(value)), session(1));
  await page.route("**/auth/v1/token?grant_type=refresh_token", route => route.fulfill({
    status: 400, json: { code: "refresh_token_not_found", message: "Fixture session expired" },
  }));
  const next = "/dashboard/models?provider=Gemini&capability=Image";
  await page.goto(next);
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(next);
  await expect(page.locator(".model-card")).toHaveCount(10);
});

test("login keeps edits and prevents repeat submission while a failure is pending", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  await page.route("**/auth/v1/token?grant_type=password", async route => {
    calls++;
    await held;
    await route.fulfill({ status: 400, json: { code: "invalid_credentials", message: "Fixture sign-in rejected" } });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  try {
    await expect(page.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    await page.getByLabel("Password", { exact: true }).press("Enter");
    expect(calls).toBe(1);
  } finally { release(); }
  await expect(page.getByRole("alert")).toContainText("Fixture sign-in rejected");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("fixture-password");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

test("settings keyboard tabs and usage dialogs fit the viewport", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Profile", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Billing", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Profile", exact: true })).toBeFocused();
  await page.goto("/dashboard/usage");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Request log table" });
  await table.focus();
  await expect(table).toBeFocused();
  const details = page.getByRole("button", { name: /Details for req_/ }).first();
  await details.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.matches(":modal"))).toBe(true);
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.keyboard.press("Escape");
  await expect(details).toBeFocused();
});

test("profile submission stays pending once and retains edits after server rejection", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let saves = 0;
  await page.route("**/auth/v1/user", async route => {
    if (route.request().method() !== "PUT") return route.fulfill({ json: user });
    saves++;
    await held;
    await route.fulfill({ status: 422, json: { message: "Fixture profile rejected" } });
  });
  await page.getByLabel("Display name").fill("Unsaved profile");
  await page.getByRole("button", { name: "Save changes" }).click();
  try {
    await expect(page.getByRole("button", { name: "Saving...", exact: true })).toBeDisabled();
    await expect(page.getByLabel("Display name")).toBeDisabled();
    await expect.poll(() => saves).toBe(1);
  } finally { release(); }
  await expect(page.getByRole("status")).toContainText("Fixture profile rejected");
  await expect(page.getByLabel("Display name")).toHaveValue("Unsaved profile");
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
});

test("sign-out in another tab removes protected content and retains the return URL", async ({ page, context }, testInfo) => {
  const next = "/dashboard/models?provider=Gemini";
  await signIn(page, next);
  const other = await context.newPage();
  await other.goto("/dashboard");
  await other.locator(".account-trigger").click();
  const popover = await other.locator(".account-popover").boundingBox();
  expect(popover!.x).toBeGreaterThanOrEqual(0);
  expect(popover!.x + popover!.width).toBeLessThanOrEqual(other.viewportSize()!.width);
  await other.screenshot({ path: testInfo.outputPath("account-menu.png") });
  await other.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(next)}`);
  await expect(page.locator(".dashboard-main")).toHaveCount(0);
  await other.close();
});

test("all dashboard routes use the wide viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Wide desktop coverage");
  await page.setViewportSize({ width: 2550, height: 1340 });
  await signIn(page, "/dashboard");
  for (const route of ["/dashboard", "/dashboard/models", "/dashboard/usage", "/dashboard/billing", "/dashboard/api-keys", "/dashboard/settings"]) {
    await page.goto(route);
    const main = page.locator(".dashboard-main");
    await expect(main).toBeVisible();
    await expect(main.locator("select")).toHaveCount(0);
    if (route === "/dashboard") {
      await expect(page.locator(".overview-metrics > *")).toHaveCount(4);
      await page.screenshot({ path: testInfo.outputPath("overview-wide.png"), fullPage: true });
    }
    expect(await main.evaluate(el => Math.abs(document.documentElement.clientWidth - el.getBoundingClientRect().right))).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("public and authenticated catalogue use identical reference rates and filter behavior", async ({ page }) => {
  const query = "?provider=OpenAI&capability=Text&q=gpt-5.6&currency=EUR";
  await page.goto(`/models${query}`);
  const publicCards = await page.locator('.model-card').allTextContents();
  expect(publicCards).toHaveLength(2);
  await signIn(page, `/dashboard/models${query}`);
  await expect(page.locator('.model-card')).toHaveCount(2);
  expect(await page.locator('.model-card').allTextContents()).toEqual(publicCards);
  await expect(page.getByLabel('Display currency')).toHaveText('EUR');
  await expect(page.getByRole('status').filter({ hasText: 'EUR estimate unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'View details for gpt-5.6-terra', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('0.162162 USD');
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('searchbox').fill('missing');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No matching models' })).toBeVisible();
});

test("legacy request history stays readable after catalogue replacement", async ({ page }) => {
  await signIn(page, '/dashboard/usage?period=all');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('combobox', { name: 'Filter model' }).click();
  await page.getByRole('option', { name: 'Sample model A', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'Details for req_8f21' }).click();
  await expect(page.getByRole('dialog')).toContainText('Sample model A');
  await expect(page.getByRole('dialog')).toContainText('req_8f21');
});

test("requests compose URL filters, paginate and export all matching records", async ({ page }, testInfo) => {
  await signIn(page, '/dashboard/usage?period=all');
  await expect(page.getByRole('combobox', { name: 'Request period' })).toContainText('All time');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter key' }).click();
  await page.getByRole('option', { name: 'Old integration (revoked)' }).click();
  await expect(page).not.toHaveURL(/page=2/);
  await page.getByRole('combobox', { name: 'Filter status' }).click();
  await page.getByRole('option', { name: 'Failed', exact: true }).click();
  await page.getByLabel('Search request ID').fill('req_demo');
  await expect(page.getByLabel('Search request ID')).toHaveValue('req_demo');
  await expect(page).toHaveURL(/search=req_demo/);
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Filter status' })).toContainText('All statuses');
  await page.goto('/dashboard/usage?period=all');
  await expect(page.getByTestId('request-count')).toBeVisible();
  const expectedExportRows = Number(await page.getByTestId('request-count').innerText());
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv.split('\r\n').filter(Boolean)).toHaveLength(expectedExportRows + 1);
  expect(expectedExportRows).toBeGreaterThan(5000);
  for (let id = 1; id <= 32; id++) expect(csv).toContain(`"req_demo_${String(id).padStart(3, '0')}"`);
  for (const id of ['req_8f21', 'req_3b74', 'req_9c10', 'req_4e62', 'req_1d83']) expect(csv).toContain(`"${id}"`);
  await expect(page.getByRole('status').filter({ hasText: /Exported/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('usage-history.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("requests validate custom dates and show empty filter results", async ({ page }) => {
  await signIn(page, '/dashboard/usage?period=all');
  await expect(page.getByRole('heading', { name: 'Requests', level: 1 })).toBeVisible();
  await expect(page.getByLabel('History response preview')).toHaveCount(0);
  await expect(page.getByLabel('Export response preview')).toHaveCount(0);
  await expect(page.getByTestId('request-count')).toBeVisible();
  await page.getByRole('combobox', { name: 'Request period' }).click();
  await page.getByRole('option', { name: 'Custom dates' }).click();
  await page.getByLabel('Start date').fill('2026-09-22');
  await page.getByLabel('End date').fill('2026-09-20');
  await expect(page.getByRole('alert').filter({ hasText: /valid date range/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeDisabled();
  await page.getByLabel('Start date').fill('2000-01-01');
  await page.getByLabel('End date').fill('2000-01-02');
  await expect(page.getByText('No requests match these filters.')).toBeVisible();
  await expect(page.getByTestId('request-count')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeEnabled();
});

test("request table shows six summary columns and keeps identifiers in details", async ({ page }) => {
  await signIn(page, '/dashboard/usage?period=all&search=req_demo_003');
  const table = page.getByRole('region', { name: 'Request log table' }).getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveText([
    'Model', 'Credits used', 'Duration', 'Status', 'Date and time', 'Details',
  ]);
  await expect(table.getByRole('row')).toHaveCount(2);
  const row = table.getByRole('row').nth(1);
  await expect(row.getByRole('cell')).toHaveCount(6);
  await expect(row).not.toContainText('req_demo_003');
  await expect(row).not.toContainText('Production');
  await row.getByRole('button', { name: 'Details for req_demo_003' }).click();
  const dialog = page.getByRole('dialog', { name: 'Request details' });
  await expect(dialog.locator('dl')).toContainText('Request IDreq_demo_003');
  await expect(dialog.locator('dl')).toContainText('API keyProduction');
  await page.keyboard.press('Escape');
  await expect(row.getByRole('button', { name: 'Details for req_demo_003' })).toBeFocused();
});

test("usage details distinguish charged failures, refunds, tokens and safe support copy", async ({ page }, testInfo) => {
  await signIn(page, '/dashboard/usage?period=all&search=req_demo_003');
  const open = page.getByRole('button', { name: 'Details for req_demo_003' });
  await open.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('failed');
  await expect(dialog).toContainText('Charged 0.012 credits');
  await expect(dialog).toContainText('POLICY_REJECTED');
  await expect(dialog).toContainText('Not applicable / unavailable');
  await expect(dialog.getByRole('link', { name: 'Get help' })).toHaveAttribute('href', '/support');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text; } } }));
  await dialog.getByRole('button', { name: 'Copy support details' }).click();
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied).toContain('req_demo_003');
  expect(copied).toContain('POLICY_REJECTED');
  expect(copied).not.toMatch(/prompt|output|credential|fixture-access/);
  await page.screenshot({ path: testInfo.outputPath('usage-detail.png') });
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await page.getByLabel('Search request ID').fill('req_demo_004');
  await page.getByRole('button', { name: 'Details for req_demo_004' }).click();
  await expect(dialog).toContainText('Refunded 0.024');
  await expect(dialog).toContainText('net 0 credits');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } }));
  await dialog.getByRole('button', { name: 'Copy support details' }).click();
  await expect(dialog).toContainText('Could not copy');
  await page.keyboard.press('Escape');
  await page.getByLabel('Search request ID').fill('req_demo_006');
  await page.getByRole('button', { name: 'Details for req_demo_006' }).click();
  await expect(dialog).toContainText('Do not resubmit automatically');
  await expect(dialog).toContainText('Awaiting billing confirmation');
  await page.keyboard.press('Escape');
  await page.getByLabel('Search request ID').fill('req_demo_001');
  await page.getByRole('button', { name: 'Details for req_demo_001' }).click();
  await expect(dialog.locator('dl')).toContainText('Input tokens120');
  await expect(dialog.locator('dl')).toContainText('Output tokens60');
  await expect(dialog.locator('dl')).toContainText('Cached input tokens0');
  await page.keyboard.press('Escape');
  await page.getByLabel('Search request ID').fill('req_demo_002');
  await page.getByRole('button', { name: 'Details for req_demo_002' }).click();
  await expect(dialog.locator('dl')).toContainText('Images1');
  await expect(dialog.locator('dl')).toContainText('Input tokensNot applicable / unavailable');
});

test("request filters preserve focus and scroll, and cancel stale export", async ({ page }) => {
  await signIn(page, '/dashboard/usage?period=all&page=garbage&status=bad');
  await expect(page.getByRole('combobox', { name: 'Filter status' })).toContainText('All statuses');
  await expect(page.getByText(/Page 1 of/)).toBeVisible();
  const search = page.getByLabel('Search request ID');
  await search.evaluate(el => (el as HTMLElement).focus({ preventScroll: true }));
  // Keep the focused field visible before typing; mobile banners/sidebar can
  // move it beyond a fixed offset and Chrome then legitimately scrolls to it.
  await search.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await expect(search).toBeInViewport();
  const before = await page.evaluate(() => scrollY);
  await search.pressSequentially('req_demo_003');
  await expect(search).toHaveValue('req_demo_003');
  await expect(search).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await expect(page.getByTestId('request-count')).toHaveText('1');
  const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel export' })).toBeVisible();
  await search.fill('req_demo_004');
  await expect(page.getByRole('button', { name: 'Cancel export' })).toHaveCount(0);
  await expect(page.getByTestId('request-count')).toHaveText('1');
  await page.waitForTimeout(500);
  expect(downloads).toEqual([]);
  await search.fill('no_such_request');
  await expect(page.getByTestId('request-count')).toHaveText('0');
  await expect(page.getByText('No requests match these filters.')).toBeVisible();
});

test("request export returns keyboard focus after completion and cancellation", async ({ page }) => {
  await signIn(page, '/dashboard/usage?period=all');
  const button = page.getByRole('button', { name: 'Export CSV', exact: true });
  await button.click();
  await page.getByRole('button', { name: 'Cancel export' }).focus();
  await expect(button).toBeEnabled();
  await expect(button).toBeFocused();
  await button.click();
  await page.getByRole('button', { name: 'Cancel export' }).focus();
  await page.getByRole('button', { name: 'Cancel export' }).click();
  await expect(button).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'Export cancelled.' })).toBeVisible();
  await button.click();
  const search = page.getByLabel('Search request ID');
  await search.focus();
  await expect(button).toBeEnabled();
  await expect(search).toBeFocused();
});

test("key lifecycle shows a sample once and preserves revoked history", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/api-keys");
  await expect(page.getByRole("combobox", { name: "Demo state" })).toHaveCount(0);
  await expect(page.locator(".demo-bar")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Key status", exact: true })).toContainText("Active");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Create API key +", exact: true }).click();
  await page.getByLabel("Key name", { exact: true }).fill("Test integration");
  await page.getByRole("button", { name: "Create demo key", exact: true }).dblclick();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  await expect(dialog.getByRole("heading")).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("key-show-once.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Create API key +", exact: true })).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.locator("body")).not.toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  const row = page.locator("tbody tr", { hasText: "Test integration" });
  await expect(row).toContainText("Never used");
  const timezone = await page.evaluate(() => new Intl.DateTimeFormat().resolvedOptions().timeZone);
  await expect(page.locator("#key-timezone")).toHaveText(`Times shown in ${timezone}`);
  await expect(row.locator("time").first()).not.toContainText(timezone);
  await row.getByRole("link", { name: /View requests/i }).click();
  await expect(page).toHaveURL(/key=/);
  await expect(page.getByRole("combobox", { name: "Request period", exact: true })).toContainText("All time");
  await expect(page.getByRole("combobox", { name: "Filter key", exact: true })).toContainText("Test integration");
  await expect(page.getByText("No requests match these filters.", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Revoke Test integration", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm demo revocation", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Sample key revoked", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Your API keys", exact: true })).toBeFocused();
  await expect(row).toHaveCount(0);
  await selectDropdown(page, "Key status", "Revoked");
  await expect(row).toContainText(/revoked/i);
  await expect(row.getByRole("button", { name: /revoke/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === "desktop") {
    expect(await page.getByRole("region", { name: "API keys table" }).evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("keys-revoked.png"), fullPage: true });
  await page.reload();
  await expect(page.locator("body")).not.toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("DEMO-ONLY-NOT-A-VALID-API-KEY");
});

test("key failures retain edits and pending cancellation leaves metadata unchanged", async ({ page }) => {
  await signIn(page, "/dashboard/api-keys");
  await page.getByRole("button", { name: "Create API key +", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await page.getByLabel("Key name", { exact: true }).fill("Retained name");
  await selectDropdown(dialog, "Key operation preview", "Operation error");
  await dialog.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Key name", { exact: true })).toHaveValue("Retained name");
  const preview = dialog.getByRole("combobox", { name: "Key operation preview" });
  await preview.click();
  await expect(preview).toHaveAttribute("aria-expanded", "true");
  await preview.press("Escape");
  await expect(preview).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toBeVisible();
  await selectDropdown(dialog, "Key operation preview", "Keep pending");
  await dialog.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(dialog.getByLabel("Key name", { exact: true })).toBeDisabled();
  await expect(preview).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  const revoke = page.getByRole("button", { name: "Revoke Production", exact: true });
  await revoke.click();
  await selectDropdown(dialog, "Key operation preview", "Operation error");
  await dialog.getByRole("button", { name: "Confirm demo revocation", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await selectDropdown(dialog, "Key operation preview", "Keep pending");
  await dialog.getByRole("button", { name: "Confirm demo revocation", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(revoke).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await revoke.click();
  await page.keyboard.press("Escape");
  await expect(revoke).toBeVisible();
});

test("key sample copy denial, navigation and reload cannot reveal an old sample", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("denied"); } }, configurable: true }));
  await signIn(page, "/dashboard/api-keys");
  await page.getByRole("button", { name: "Create API key +", exact: true }).click();
  await page.getByLabel("Key name", { exact: true }).fill("One time");
  await page.getByRole("button", { name: "Create demo key", exact: true }).click();
  await page.getByRole("button", { name: "Copy sample key", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(/copy|clipboard/i);
  await expect(page.getByRole("dialog")).toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  await page.locator('a[href="/dashboard/usage"]').first().evaluate((link: HTMLAnchorElement) => link.click());
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  await page.getByRole("button", { name: "Create API key +", exact: true }).click();
  await page.getByLabel("Key name", { exact: true }).fill("Reload sample");
  await page.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
});

test("key metadata is isolated after sign-out and revoked usage retains historical labels", async ({ page }) => {
  await signIn(page, "/dashboard/api-keys");
  await selectDropdown(page, "Key status", "Revoked");
  await page.locator("tbody tr", { hasText: "Old integration" }).getByRole("link", { name: /View requests/i }).click();
  await expect(page.getByRole("combobox", { name: "Filter key", exact: true })).toContainText("Old integration (revoked)");
  await page.getByRole("button", { name: /Details for req_/ }).first().click();
  await expect(page.getByRole("dialog").locator("dl")).toContainText("API keyOld integration (revoked)");
  await page.keyboard.press("Escape");
  await page.goBack();
  await page.getByRole("button", { name: "Create API key +", exact: true }).click();
  await page.getByLabel("Key name", { exact: true }).fill("First account only");
  await page.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  await page.keyboard.press("Escape");
  await page.locator(".account-trigger").click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.locator(".dashboard-main")).toHaveCount(0);
  const second = { ...user, id: "00000000-0000-4000-8000-000000000002" };
  await page.route("**/auth/v1/token?grant_type=password", route => route.fulfill({ json: { ...session(), user: second } }));
  await page.route("**/auth/v1/user", route => route.fulfill({ json: second }));
  await signIn(page, "/dashboard/api-keys");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator("tbody")).not.toContainText("First account only");
});

test("key creation copies only by request and a departing operation is cancelled", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => { (window as unknown as { copiedSample: string }).copiedSample = text; } }, configurable: true }));
  await signIn(page, "/dashboard/api-keys");
  const create = page.getByRole("button", { name: "Create API key +", exact: true });
  await create.click();
  await page.getByLabel("Key name", { exact: true }).fill("Cancel navigation");
  await selectDropdown(page.getByRole("dialog"), "Key operation preview", "Keep pending");
  await page.getByRole("button", { name: "Create demo key", exact: true }).click();
  await page.locator('a[href="/dashboard/usage"]').first().evaluate((link: HTMLAnchorElement) => link.click());
  await page.goBack();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await create.click();
  await page.getByLabel("Key name", { exact: true }).fill("Copy example");
  await page.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("DEMO-ONLY-NOT-A-VALID-API-KEY");
  expect(await page.evaluate(() => (window as unknown as { copiedSample?: string }).copiedSample)).toBeUndefined();
  await page.getByRole("button", { name: "Copy sample key", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText("Copied");
  expect(await page.evaluate(() => (window as unknown as { copiedSample: string }).copiedSample)).toContain("DEMO-ONLY-NOT-A-VALID-API-KEY");
});

test("key finite operations cannot complete after their dialog is closed", async ({ page }) => {
  await signIn(page, "/dashboard/api-keys");
  await page.getByRole("button", { name: "Create API key +", exact: true }).click();
  await page.getByLabel("Key name", { exact: true }).fill("Cancelled finite creation");
  await page.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(page.getByRole("button", { name: "Creating…", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  // Deliberately pass the demo's finite 500ms completion deadline.
  await page.waitForTimeout(650);
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator("tbody")).not.toContainText("Cancelled finite creation");
  await page.getByRole("button", { name: "Revoke Production", exact: true }).click();
  await page.getByRole("button", { name: "Confirm demo revocation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Revoking…", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(650);
  await expect(page.getByRole("button", { name: "Revoke Production", exact: true })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
