import { test, expect, type Page } from "@playwright/test";
import { getSafeNext } from "../src/auth/authUtils";

const email = "fixture@example.com";

test("overview shares periods, recent requests and all-time savings", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard");
  await expect(page.getByLabel("Overview period")).toHaveValue("7d");
  await expect(page.getByTestId("overview-balance")).toContainText("333,000");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  const savings = page.getByRole("region", { name: "All-time savings" });
  await expect(savings).toContainText("You've saved $");
  await expect(savings).toContainText("excluded");
  const saved = await savings.innerText();
  const before = Number(await page.getByTestId("overview-requests").innerText());
  await page.getByLabel("Overview period").selectOption("30d");
  await expect(page.getByTestId("overview-requests")).not.toHaveText(String(before));
  await expect(savings).toHaveText(saved, { useInnerText: true });
  await page.getByRole("tab", { name: "Requests", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tabpanel")).toContainText(await page.getByTestId("overview-credits").innerText());
  await expect(page.getByRole("link", { name: "All updates" })).toBeVisible();
  const requests = await page.getByTestId("overview-requests").innerText();
  const credits = await page.getByTestId("overview-credits").innerText();
  await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "View all requests" }).click();
  await page.getByLabel("Usage period").selectOption("30d");
  await expect(page.getByTestId("usage-totals").locator("strong").nth(0)).toHaveText(requests);
  await expect(page.getByTestId("usage-totals").locator("strong").nth(1)).toHaveText(credits);
});

test("overview refresh retains known data and supports independent unavailable and empty states", async ({ page }) => {
  await signIn(page, "/dashboard");
  const balance = page.getByTestId("overview-balance");
  await expect(balance).toContainText("333,000");
  await page.getByLabel("Overview preview").selectOption("refresh-error");
  await page.getByRole("button", { name: "Refresh overview", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("previous");
  await expect(balance).toContainText("333,000");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByLabel("Overview preview").selectOption("savings-unavailable");
  await page.getByRole("button", { name: "Refresh overview", exact: true }).click();
  await expect(page.getByRole("region", { name: "All-time savings" })).toContainText("unavailable");
  await expect(balance).toContainText("333,000");
  await page.getByLabel("Overview preview").selectOption("wallet-error");
  await page.getByRole("button", { name: "Refresh overview", exact: true }).click();
  await expect(balance).toHaveText("Unavailable");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByLabel("Overview preview").selectOption("empty");
  await page.getByRole("button", { name: "Refresh overview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Make your first API request" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an API key" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Sample daily/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "All-time savings" })).toContainText("No request history");
  await page.getByRole("link", { name: "Create an API key" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("API keys");
});

test("overview loading refresh can be superseded without losing the snapshot", async ({ page }) => {
  await signIn(page, "/dashboard?period=30d");
  await expect(page.getByTestId("overview-balance")).toContainText("333,000");
  const stamp = page.locator(".overview-refresh time");
  const original = await stamp.getAttribute("datetime");
  await page.getByLabel("Overview preview").selectOption("loading");
  await page.getByRole("button", { name: "Refresh overview", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("previous snapshot");
  await expect(stamp).toHaveAttribute("datetime", original!);
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByLabel("Overview preview").selectOption("success");
  await page.getByRole("button", { name: "Refresh overview", exact: true }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(stamp).not.toHaveAttribute("datetime", original!);
  await expect(page.getByLabel("Overview period")).toHaveValue("30d");
});

test("overview qualifies incomplete history separately from comparison exclusions", async ({ page }) => {
  await signIn(page, "/dashboard");
  await page.getByLabel("Overview preview").selectOption("partial-history");
  await page.getByRole("button", { name: "Refresh overview", exact: true }).click();
  const savings = page.getByRole("region", { name: "Savings for available history" });
  await expect(savings).toContainText("History is incomplete");
  await expect(savings).toContainText("Coverage starts");
  await savings.getByText("How this comparison works", { exact: true }).click();
  await expect(savings).toContainText("Excluded by reason");
  await expect(savings).toContainText("Revision");
  await expect(savings).toContainText("Basis version");
  await expect(page.getByRole("heading", { name: "All-time savings", exact: true })).toHaveCount(0);
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
  await expect(page.getByRole("status")).toContainText("demo");
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

test("account preferences retain rejected edits, cancel pending saves and isolate sessions", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Low-balance/ }).check();
  await page.getByLabel("Credit alert threshold", { exact: true }).fill("400000");
  await page.getByLabel("Demo state").selectOption("save-error");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("failure");
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toHaveValue("400000");
  await page.getByLabel("Demo state").selectOption("populated");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("Mock preferences saved");
  await page.getByRole("link", { name: "Billing", exact: true }).click();
  await page.getByRole("link", { name: "Edit billing details in Settings" }).click();
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toHaveValue("400000");
  await page.getByLabel("Credit alert threshold", { exact: true }).fill("500000");
  await page.getByLabel("Preference save preview").selectOption("loading");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel save" }).click();
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toHaveValue("500000");
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toHaveValue("400000");
  await page.locator(".account-trigger").click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  const second = { ...user, id: "00000000-0000-4000-8000-000000000002", email_confirmed_at: null, identities: [{ ...user.identities[0], provider: "google" }], app_metadata: { provider: "google", providers: ["google"] } };
  await page.route("**/auth/v1/token?grant_type=password", route => route.fulfill({ json: { ...session(), user: second } }));
  await page.route("**/auth/v1/user", route => route.fulfill({ json: second }));
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByLabel("Credit alert threshold", { exact: true })).toHaveValue("100000");
  await expect(page.getByRole("checkbox", { name: /^Low-balance/ })).not.toBeChecked();
  await expect(page.getByText("Not verified — low-balance alerts are paused")).toBeVisible();
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await expect(page.getByRole("button", { name: "Change password", exact: true })).toHaveCount(0);
  await expect(page.getByText(/Your credentials are managed by your sign-in provider/)).toBeVisible();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("form", { name: "Billing details" })).toBeVisible();
});

test("account notification cancellation restores keyboard focus", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await page.getByLabel("Preference save preview").selectOption("loading");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.getByRole("button", { name: "Cancel save" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Save preferences" })).toBeFocused();
  await page.getByLabel("Preference save preview").selectOption("success");
  for (const outcome of ["populated", "save-error"]) {
    await page.getByLabel("Demo state").selectOption(outcome);
    await page.getByRole("button", { name: "Save preferences" }).click();
    await page.getByRole("button", { name: "Cancel save" }).focus();
    await expect(page.getByRole("button", { name: "Cancel save" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save preferences" })).toBeFocused();
  }
  await page.getByLabel("Demo state").selectOption("populated");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.getByRole("tab", { name: "Notifications", exact: true }).focus();
  await expect(page.getByRole("button", { name: "Cancel save" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Notifications", exact: true })).toBeFocused();
});

test("account access failures and cancellation never mutate the real account", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  const mutations: string[] = [];
  page.on("request", request => { if (!['GET', 'HEAD'].includes(request.method())) mutations.push(new URL(request.url()).pathname); });
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await page.getByLabel("New email address").fill("failed@example.com");
  await page.getByLabel("Account operation preview").selectOption("error");
  await page.getByRole("button", { name: "Request mock email change" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("retained");
  await expect(page.getByLabel("New email address")).toHaveValue("failed@example.com");
  await page.getByLabel("Account operation preview").selectOption("success");
  await page.getByRole("button", { name: "Request mock email change" }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await expect(page.getByText(/Mock pending verification:/)).toHaveCount(0);
  await page.getByRole("button", { name: "Preview account deletion" }).click();
  await expect(page.getByRole("button", { name: "Continue with simulated identity" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Simulate confirmed identity" }).check();
  await page.getByLabel("Account operation preview").selectOption("error");
  await page.getByRole("button", { name: "Continue with simulated identity" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("identity confirmation failed");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Preview account deletion" })).toBeFocused();
  await page.getByRole("button", { name: "Preview account deletion" }).click();
  await page.getByRole("checkbox", { name: "Simulate confirmed identity" }).check();
  await page.getByRole("button", { name: "Continue with simulated identity" }).click();
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
  await page.getByLabel("Account type (optional)").selectOption("business");
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
  await expect(page.getByTestId("demo-balance")).toHaveText("333,000 credits");
  await expect(page.locator(".package-card")).toHaveCount(7);
  await page.screenshot({ path: testInfo.outputPath("billing-packages.png"), fullPage: true });
  await page.getByLabel("Billing display currency").selectOption("EUR");
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
  await dialog.getByLabel("Simulated provider outcome").selectOption("paid");
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
  await dialog.getByLabel("Simulated provider outcome").selectOption("refund-pending");
  await dialog.getByRole("button", { name: "Apply demo outcome" }).click();
  await expect(dialog).toContainText("Captured funds, credits not delivered");
  await expect(dialog).toContainText("Do not pay again");
  await dialog.getByLabel("Simulated provider outcome").selectOption("refunded");
  await dialog.getByRole("button", { name: "Apply demo outcome" }).click();
  await expect(dialog).toContainText("Sample refund completed");
  await expect(page.getByTestId("demo-balance")).toHaveText("333,000 credits");
  await dialog.getByLabel("Document response preview").selectOption("denied");
  await dialog.getByRole("button", { name: "Request receipt" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Access denied");
  await dialog.getByLabel("Document response preview").selectOption("error");
  await dialog.getByRole("button", { name: "Request invoice" }).click();
  await expect(dialog.getByRole("alert")).toContainText("could not be retrieved");
  await dialog.getByLabel("Document response preview").selectOption("unavailable");
  await dialog.getByRole("button", { name: "Request invoice" }).click();
  await expect(dialog).toContainText("No authentic document exists");
  await expect(dialog.locator("time").first()).toContainText(/UTC|Europe|America|Asia/);
  await expect(dialog.getByRole("link", { name: "Payment support" })).toHaveAttribute("href", "/support");
});

test("billing details preserve failed edits and share successful saves with Settings", async ({ page }) => {
  await signIn(page, "/dashboard/billing");
  const form = page.getByRole("form", { name: "Billing details" });
  await form.getByLabel("Company", { exact: true }).fill("Example studio");
  await form.getByLabel("Billing save preview").selectOption("error");
  await form.getByRole("button", { name: "Save billing details" }).click();
  await expect(form.getByRole("button", { name: "Saving billing details…" })).toBeDisabled();
  await expect(form.getByLabel("Company", { exact: true })).toBeDisabled();
  await expect(form.getByRole("alert")).toContainText("Your edits are still here");
  await expect(form.getByLabel("Company", { exact: true })).toHaveValue("Example studio");
  await form.getByLabel("Billing save preview").selectOption("success");
  await form.getByRole("button", { name: "Save billing details" }).click();
  await expect(form.getByRole("status")).toContainText("saved for this demo session");
  await page.getByRole("link", { name: "Edit billing details in Settings" }).click();
  await expect(page.getByRole("form", { name: "Billing details" }).getByLabel("Company", { exact: true })).toHaveValue("Example studio");
  await page.getByRole("link", { name: "Billing", exact: true }).click();
  await page.getByRole("button", { name: "Details for demo-order-sample-1" }).click();
  await page.getByRole("link", { name: "Payment support" }).click();
  await page.goBack();
  await expect(page.getByRole("form", { name: "Billing details" }).getByLabel("Company", { exact: true })).toHaveValue("Example studio");
});

test("billing aborts closed checkout, keeps first-use packages and reports copy denial", async ({ page }) => {
  await signIn(page, "/dashboard/billing");
  await page.getByLabel("Demo state").selectOption("empty");
  await expect(page.getByRole("heading", { name: "No payment history yet" })).toBeVisible();
  await page.getByRole("button", { name: "Review $5 package", exact: true }).click();
  await page.getByRole("button", { name: "Continue demo checkout" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Review $5 package", exact: true }).click();
  await page.getByRole("button", { name: "Continue demo checkout" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Do not pay again");
  await dialog.getByLabel("Simulated provider outcome").selectOption("failed");
  await dialog.getByRole("button", { name: "Apply demo outcome" }).click();
  await expect(dialog).toContainText("No funds captured, no cash refund required");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
  await dialog.getByRole("button", { name: "Copy safe order details" }).click();
  await expect(dialog).toContainText("Could not copy");
  await page.keyboard.press("Escape");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByLabel("Demo state").selectOption("error");
  await expect(page.getByRole("alert")).toContainText("couldn’t be loaded");
  await page.getByRole("button", { name: "Try again" }).click();
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
  await page.getByRole("link", { name: "Edit billing details in Settings" }).click();
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

test("settings retains failed edits and keyboard tabs; dialogs and tables fit", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  await page.getByLabel("Display name").fill("Retained edit");
  await page.getByLabel("Demo state").selectOption("save-error");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Simulated save failure");
  await expect(page.getByLabel("Display name")).toHaveValue("Retained edit");
  await page.getByRole("tab", { name: "Profile", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Notifications", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByLabel("Display name")).toHaveValue("Retained edit");
  await page.goto("/dashboard/usage");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: /Request/ });
  await table.focus();
  await expect(table).toBeFocused();
  const details = page.getByRole("button", { name: "Details for req_demo_001" });
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
    if (route === "/dashboard") {
      await expect(page.locator("tbody tr")).toHaveCount(5);
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
  await page.getByLabel('Filter model').selectOption('A');
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'Details for req_8f21' }).click();
  await expect(page.getByRole('dialog')).toContainText('Sample model A');
  await expect(page.getByRole('dialog')).toContainText('req_8f21');
});

test("usage composes URL filters, paginates and exports all matching records", async ({ page }, testInfo) => {
  await signIn(page, '/dashboard/usage?period=all');
  await expect(page.getByLabel('Usage period')).toHaveValue('all');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
  await page.getByLabel('Filter key').selectOption('key-revoked');
  await expect(page).not.toHaveURL(/page=2/);
  await page.getByLabel('Filter status').selectOption('failed');
  await page.getByLabel('Search request ID').fill('req_demo');
  await expect(page.getByLabel('Search request ID')).toHaveValue('req_demo');
  await expect(page).toHaveURL(/search=req_demo/);
  await page.goBack();
  await expect(page.getByLabel('Filter status')).toHaveValue('all');
  await page.goto('/dashboard/usage?period=all');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv.split('\r\n').filter(Boolean)).toHaveLength(38);
  for (let id = 1; id <= 32; id++) expect(csv).toContain(`"req_demo_${String(id).padStart(3, '0')}"`);
  for (const id of ['req_8f21', 'req_3b74', 'req_9c10', 'req_4e62', 'req_1d83']) expect(csv).toContain(`"${id}"`);
  await expect(page.getByRole('status').filter({ hasText: /Exported/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('usage-history.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("usage separates unavailable history from zero and cancels failed exports", async ({ page }) => {
  await signIn(page, '/dashboard/usage?period=all');
  await page.getByLabel('History response preview').selectOption('loading');
  await expect(page.getByText('Loading request history...')).toBeVisible();
  await expect(page.getByTestId('usage-totals')).toHaveCount(0);
  await page.getByLabel('History response preview').selectOption('error');
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await page.getByRole('button', { name: 'Reload history' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByLabel('Export response preview').selectOption('loading');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel export' }).click();
  await expect(page.getByText('Export cancelled.')).toBeVisible();
  await page.getByLabel('Export response preview').selectOption('error');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Export failed');
  await page.getByLabel('Usage period').selectOption('custom');
  await page.getByLabel('Start date').fill('2026-09-22');
  await page.getByLabel('End date').fill('2026-09-20');
  await expect(page.getByRole('alert').filter({ hasText: /valid date range/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeDisabled();
  await page.getByLabel('Start date').fill('2000-01-01');
  await page.getByLabel('End date').fill('2000-01-02');
  await expect(page.getByText('No requests match these filters.')).toBeVisible();
  await expect(page.getByTestId('usage-totals')).toContainText('0');
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

test("usage filters preserve focus and scroll, synchronize totals and chart, and cancel stale export", async ({ page }) => {
  await signIn(page, '/dashboard/usage?period=all&page=garbage&status=bad');
  await expect(page.getByLabel('Filter status')).toHaveValue('all');
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
  await expect(page.getByTestId('usage-totals')).toContainText('Settled net credits0.012');
  await expect(page.getByRole('region', { name: 'Spending over time' })).toContainText('0.012 credits');
  const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  await page.getByLabel('Export response preview').selectOption('loading');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await search.fill('req_demo_004');
  await expect(page.getByRole('button', { name: 'Cancel export' })).toHaveCount(0);
  await expect(page.getByTestId('usage-totals')).toContainText('Settled net credits0');
  expect(downloads).toEqual([]);
  await page.getByLabel('History response preview').selectOption('empty');
  await expect(page.getByText('No requests yet.')).toBeVisible();
  await expect(page.getByTestId('usage-totals')).toContainText('Matching requests0');
});

test("usage export returns keyboard focus after terminal success and failure", async ({ page }) => {
  await signIn(page, '/dashboard/usage?period=all');
  const button = page.getByRole('button', { name: 'Export CSV', exact: true });
  for (const outcome of ['success', 'error']) {
    await page.getByLabel('Export response preview').selectOption(outcome);
    await button.click();
    await page.getByRole('button', { name: 'Cancel export' }).focus();
    await expect(button).toBeEnabled();
    await expect(button).toBeFocused();
  }
  await button.click();
  const search = page.getByLabel('Search request ID');
  await search.focus();
  await expect(button).toBeEnabled();
  await expect(search).toBeFocused();
});

test("key lifecycle shows a sample once and preserves revoked history", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/api-keys");
  await expect(page.getByLabel("Key status", { exact: true })).toHaveValue("active");
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
  await expect(row.locator("time").first()).toContainText(/UTC|Europe|America|Asia/);
  await row.getByRole("link", { name: /usage/i }).click();
  await expect(page).toHaveURL(/key=/);
  await expect(page.getByRole("combobox", { name: "Usage period", exact: true })).toHaveValue("all");
  await expect(page.getByRole("combobox", { name: "Filter key", exact: true }).locator("option:checked")).toHaveText("Test integration");
  await expect(page.getByText("No requests match these filters.", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Revoke Test integration", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm demo revocation", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Sample key revoked", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Your API keys", exact: true })).toBeFocused();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Key status", { exact: true }).selectOption("revoked");
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
  await page.getByLabel("Key operation preview").selectOption("error");
  await dialog.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Key name", { exact: true })).toHaveValue("Retained name");
  await page.getByLabel("Key operation preview").selectOption("loading");
  await dialog.getByRole("button", { name: "Create demo key", exact: true }).click();
  await expect(dialog.getByLabel("Key name", { exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  const revoke = page.getByRole("button", { name: "Revoke Production", exact: true });
  await revoke.click();
  await page.getByLabel("Key operation preview").selectOption("error");
  await dialog.getByRole("button", { name: "Confirm demo revocation", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await page.getByLabel("Key operation preview").selectOption("loading");
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
  await page.getByLabel("Key status", { exact: true }).selectOption("revoked");
  await page.locator("tbody tr", { hasText: "Old integration" }).getByRole("link", { name: /usage/i }).click();
  await expect(page.getByRole("combobox", { name: "Filter key", exact: true })).toHaveValue("key-revoked");
  await expect(page.locator("tbody")).toContainText("Old integration (revoked)");
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
  await page.getByLabel("Key operation preview").selectOption("loading");
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
