import { test, expect, type BrowserContext, type Locator, type Page, type Route } from "@playwright/test";
import { getSafeNext } from "../src/auth/authUtils";

const email = "fixture@example.com";
const ORIGIN = "http://127.0.0.1:4174";

async function selectDropdown(scope: Page | Locator, label: string, option: string) {
  await scope.getByRole("combobox", { name: label, exact: true }).click();
  await scope.getByRole("option", { name: option, exact: true }).click();
}

const user = {
  id: "00000000-0000-4000-8000-000000000001", aud: "authenticated",
  role: "authenticated", email, created_at: "2026-09-20T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Fixture user" },
  email_confirmed_at: "2026-09-20T00:00:00Z",
  identities: [{ id: "fixture-email", provider: "email", user_id: "00000000-0000-4000-8000-000000000001", identity_data: { email } }],
};
const second = { ...user, id: "00000000-0000-4000-8000-000000000002", email: "second@example.com", email_confirmed_at: null,
  identities: [{ ...user.identities[0]!, provider: "google" }], app_metadata: { provider: "google", providers: ["google"] } };

function session(expiresAt = Math.floor(Date.now() / 1000) + 3600, account: typeof user | typeof second = user) {
  return { access_token: `fixture-access-${account.id}`, refresh_token: "fixture-refresh-not-a-credential",
    token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user: account };
}

// --- In-memory backend with the real /v1 response shapes (see ../../src/openapi.ts) ---

type Usage = { id: string; model: string; model_name: string; capability: "text" | "image"; status: string; outcome: "completed" | "failed" | "pending" | "unknown";
  created_at: string; completed_at: string | null; credits_micros: string | null; price_version: number; error: string | null;
  api_key_id: string | null; api_key_name: string | null; input_tokens: number | null; output_tokens: number | null; units: number | null };
type Key = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
type Payment = { id: string; offer_id: string; currency: "eur" | "usd"; amount_minor: number; credits_micros: string; status: string; created_at: string };
type Account = { balance: bigint; usage: Usage[]; keys: Key[]; payments: Payment[]; preferences: Record<string, unknown>; profile: Record<string, unknown> };

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const HOUR = 3_600_000;

function history(now: number): Usage[] {
  const rows: Usage[] = [];
  const at = (offset: number) => new Date(now - offset).toISOString();
  for (let i = 0; i < 30; i += 1) {
    const older = i >= 25;
    const created = older ? (40 + (i - 25) * 45) * 24 * HOUR : i * 5 * HOUR + 60_000;
    const image = i % 3 === 0;
    const outcome = i === 1 ? "pending" : i % 7 === 3 ? "failed" : i % 11 === 5 ? "unknown" : "completed";
    const revoked = i % 4 === 0;
    rows.push({
      id: uuid(0x100 + i), model: image ? "nano-banana-2" : "gpt-5.5", model_name: image ? "Nano Banana 2" : "GPT 5.5", capability: image ? "image" : "text",
      status: { completed: "succeeded", failed: "failed", pending: "provider_pending", unknown: "unknown" }[outcome], outcome,
      created_at: at(created), completed_at: outcome === "completed" || outcome === "failed" ? at(created - 1250) : null,
      credits_micros: outcome === "completed" ? image ? "80000" : "1200" : null, price_version: 2,
      error: outcome === "failed" ? "provider_rejected" : outcome === "unknown" ? "provider_submit_ambiguous" : null,
      api_key_id: revoked ? uuid(0xa3) : uuid(0xa1), api_key_name: revoked ? "Old integration" : "Production",
      input_tokens: !image && outcome === "completed" ? 400 : null, output_tokens: !image && outcome === "completed" ? 100 : null,
      units: image && outcome === "completed" ? 1 : null,
    });
  }
  return rows;
}

function freshAccount(populated: boolean): Account {
  const now = Date.now();
  return {
    balance: populated ? 25_000_000n : 0n,
    usage: populated ? history(now) : [],
    keys: populated ? [
      { id: uuid(0xa1), name: "Production", prefix: "tw_live_prod1234…", created_at: "2026-08-20T10:00:00Z", last_used_at: new Date(now - HOUR).toISOString(), revoked_at: null },
      { id: uuid(0xa2), name: "Internal", prefix: "tw_live_int05678…", created_at: "2026-09-01T10:00:00Z", last_used_at: null, revoked_at: null },
      { id: uuid(0xa3), name: "Old integration", prefix: "tw_live_old09876…", created_at: "2026-07-01T10:00:00Z", last_used_at: "2026-09-15T09:00:00Z", revoked_at: "2026-09-16T10:00:00Z" },
    ] : [],
    payments: populated ? [{ id: uuid(0xb1), offer_id: "pack-10", currency: "eur", amount_minor: 1000, credits_micros: "10000000", status: "paid", created_at: "2026-09-10T10:00:00Z" }] : [],
    preferences: { low_balance_enabled: false, threshold_micros: null, product_updates: false, last_alert_at: null },
    profile: { kind: null, name: null, company: null, address_line1: null, address_line2: null, city: null, postal_code: null, region: null, country_code: null, vat_id: null },
  };
}

const offers = [
  { id: "pack-5", currency: "eur", amount_minor: 500, credits_micros: "5000000", price_version: 1 },
  { id: "pack-10", currency: "eur", amount_minor: 1000, credits_micros: "10000000", price_version: 1 },
  { id: "pack-10", currency: "usd", amount_minor: 1100, credits_micros: "10000000", price_version: 1 },
];
const models = [
  { id: "gpt-5.5", name: "GPT 5.5", capability: "text", price_version: 2, pricing: { unit: "tokens", input_per_million: "$1", output_per_million: "$2", per_unit: null }, parameters: {} },
  { id: "nano-banana-2", name: "Nano Banana 2", capability: "image", price_version: 2, pricing: { unit: "request", input_per_million: null, output_per_million: null, per_unit: "$0.08" }, parameters: {} },
];

type Backend = {
  accounts: Map<string, Account>; calls: { method: string; path: string; headers: Record<string, string>; body: unknown }[];
  incidents: unknown[]; failures: Map<string, { status: number; code: string; message: string }>; hold: Set<string>;
};

const periodDays: Record<string, number | null> = { today: 0, "7d": 7, "30d": 30, "6m": 183, "1y": 365, all: null };
function periodFrom(period: string): number | null {
  const days = periodDays[period];
  if (days === null || days === undefined) return null;
  const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - days);
  return start.getTime();
}
const sum = (rows: Usage[]) => rows.reduce((total, row) => total + BigInt(row.outcome === "completed" ? row.credits_micros ?? "0" : "0"), 0n).toString();

async function installBackend(context: BrowserContext, backend: Backend) {
  await context.route(`${ORIGIN}/v1/**`, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const headers = request.headers();
    const body = request.postData() ? request.postDataJSON() : undefined;
    backend.calls.push({ method, path: path + url.search, headers, body });
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    const fail = (status: number, code: string, message: string) => json({ error: { message, type: status >= 500 ? "server_error" : "invalid_request_error", code, request_id: uuid(0xfff) } }, status);
    if (backend.hold.has(`${method} ${path}`)) return; // Never answered: simulates an in-flight request.
    const failure = backend.failures.get(`${method} ${path}`);
    if (failure) return fail(failure.status, failure.code, failure.message);
    if (path === "/v1/status") return json({ checked_at: new Date().toISOString(), updated_at: null, incidents: backend.incidents });
    if (path === "/v1/models") return json({ object: "list", data: models });
    const token = headers.authorization?.replace(/^Bearer /, "") ?? "";
    const accountId = token.replace("fixture-access-", "");
    if (!token.startsWith("fixture-access-")) return fail(401, "authentication_required", "A valid API key or Supabase access token is required.");
    if (!backend.accounts.has(accountId)) backend.accounts.set(accountId, freshAccount(accountId === user.id));
    const account = backend.accounts.get(accountId)!;
    const q = url.searchParams;
    const summary = () => ({ available_credits_micros: account.balance.toString(), reserved_credits_micros: "0", used_credits_micros: sum(account.usage), suspended: false,
      request_count: account.usage.length, completed_count: account.usage.filter(r => r.outcome === "completed").length, failed_count: account.usage.filter(r => r.outcome === "failed").length });
    if (path === "/v1/dashboard/summary") return json(summary());
    if (path === "/v1/credits") return json({ available_credits_micros: account.balance.toString(), reserved_credits_micros: "0", suspended: false });
    if (path === "/v1/usage" || path === "/v1/usage/export.csv") {
      const from = q.get("from"), to = q.get("to"), search = (q.get("search") ?? "").toLowerCase();
      const rows = account.usage.filter(row => (!from || row.created_at >= new Date(from).toISOString()) && (!to || row.created_at < new Date(to).toISOString())
        && (!q.get("model") || row.model === q.get("model")) && (!q.get("key") || row.api_key_id === q.get("key"))
        && (!q.get("outcome") || row.outcome === q.get("outcome")) && (!search || row.id.startsWith(search) || row.model.includes(search)))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (path.endsWith(".csv")) {
        return route.fulfill({ status: 200, headers: { "content-type": "text/csv", "x-export-rows": String(rows.length), "x-export-truncated": "false" },
          body: ["id,model,outcome", ...rows.map(row => `${row.id},${row.model},${row.outcome}`)].join("\r\n") + "\r\n" });
      }
      const limit = Number(q.get("limit") ?? 100), offset = Number(q.get("offset") ?? 0);
      return json({ summary: summary(), total: rows.length, limit, offset, data: rows.slice(offset, offset + limit) });
    }
    if (path === "/v1/usage/overview") {
      const from = periodFrom(q.get("period") ?? "30d");
      const rows = account.usage.filter(row => from === null || Date.parse(row.created_at) >= from);
      const days = new Map<string, Usage[]>();
      for (const row of rows) days.set(row.created_at.slice(0, 10), [...(days.get(row.created_at.slice(0, 10)) ?? []), row]);
      const byModel = new Map<string, Usage[]>();
      for (const row of rows) byModel.set(row.model, [...(byModel.get(row.model) ?? []), row]);
      return json({ from: from === null ? null : new Date(from).toISOString(), timezone: "UTC",
        totals: { requests: rows.length, completed: rows.filter(r => r.outcome === "completed").length, failed: rows.filter(r => r.outcome === "failed").length,
          pending: rows.filter(r => r.outcome === "pending").length, unknown: rows.filter(r => r.outcome === "unknown").length, credits_micros: sum(rows) },
        daily: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, group]) => ({ day, requests: group.length, completed: group.filter(r => r.outcome === "completed").length, failed: group.filter(r => r.outcome === "failed").length, credits_micros: sum(group) })),
        models: [...byModel].map(([model, group]) => ({ model, name: group[0]!.model_name, requests: group.length, credits_micros: sum(group) })).sort((a, b) => Number(BigInt(b.credits_micros) - BigInt(a.credits_micros))) });
    }
    if (path === "/v1/dashboard/savings") {
      const compared = account.usage.filter(r => r.outcome === "completed" && r.capability === "text");
      return json({ from: null, currency: "USD", compared_requests: compared.length, excluded_not_settled: account.usage.filter(r => r.outcome !== "completed").length,
        excluded_no_reference: account.usage.filter(r => r.outcome === "completed" && r.capability === "image").length,
        official_micros: String(compared.length * 3000), charged_micros: String(compared.length * 1200), saved_micros: String(compared.length * 1800) });
    }
    if (path === "/v1/api-keys" && method === "GET") return json({ data: account.keys });
    if (path === "/v1/api-keys" && method === "POST") {
      const name = String((body as { name?: string }).name ?? "").trim();
      if (!name || name.length > 60) return fail(400, "invalid_key_name", "Key name must be between 1 and 60 characters.");
      const secret = `tw_live_fixture${backend.calls.length}SECRETVALUE0123456789`;
      const key = { id: uuid(0xc00 + backend.calls.length), name, prefix: `${secret.slice(0, 16)}…`, created_at: new Date().toISOString(), last_used_at: null, revoked_at: null };
      account.keys.unshift(key);
      return json({ id: key.id, name, prefix: key.prefix, created_at: key.created_at, secret }, 201);
    }
    const keyMatch = /^\/v1\/api-keys\/([^/]+)$/.exec(path);
    if (keyMatch && method === "DELETE") {
      const key = account.keys.find(item => item.id === keyMatch[1]);
      if (!key) return fail(404, "api_key_not_found", "The API key was not found.");
      key.revoked_at ??= new Date().toISOString();
      return json({ id: key.id, revoked: true });
    }
    if (path === "/v1/billing/offers") return json({ data: offers });
    if (path === "/v1/billing/payments") {
      // The signed webhook "arrives" on the second confirmation poll.
      for (const payment of account.payments) if (payment.status === "checkout_open" && backend.calls.filter(call => call.path === "/v1/billing/payments").length > 2) {
        payment.status = "paid"; account.balance += BigInt(payment.credits_micros);
      }
      return json({ data: account.payments });
    }
    if (path === "/v1/billing/checkout") {
      const offer = offers.find(item => item.id === (body as { offer_id: string }).offer_id && item.currency === (body as { currency: string }).currency)!;
      account.payments.unshift({ id: uuid(0xd00 + backend.calls.length), offer_id: offer.id, currency: offer.currency as "eur", amount_minor: offer.amount_minor, credits_micros: offer.credits_micros, status: "checkout_open", created_at: new Date().toISOString() });
      return json({ checkout_url: `${ORIGIN}/dashboard/billing?checkout=success&session_id=cs_fixture`, quote_id: account.payments[0]!.id }, 201);
    }
    const receipt = /^\/v1\/billing\/payments\/([^/]+)\/receipt$/.exec(path);
    if (receipt) {
      const payment = account.payments.find(item => item.id === receipt[1]);
      if (!payment) return fail(404, "payment_not_found", "The payment was not found.");
      return json({ receipt_url: `https://pay.stripe.com/receipts/fixture/${payment.id}` });
    }
    if (path === "/v1/account/preferences") {
      if (method === "PUT") account.preferences = { ...(body as object), last_alert_at: null };
      return json(account.preferences);
    }
    if (path === "/v1/account/billing-profile") {
      if (method === "PUT") {
        const profile = body as Record<string, string | null>;
        if (profile.country_code && !/^[A-Za-z]{2}$/.test(profile.country_code)) return fail(400, "invalid_billing_profile", "The billing details are invalid.");
        account.profile = { ...profile, country_code: profile.country_code?.toUpperCase() ?? null };
      }
      return json(account.profile);
    }
    return fail(404, "not_found", "The requested route was not found.");
  });
}

let backend: Backend;

test.beforeEach(async ({ context }) => {
  backend = { accounts: new Map(), calls: [], incidents: [], failures: new Map(), hold: new Set() };
  // Deny unexpected network access; the fixture must never contact a real service.
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === ORIGIN) return route.continue();
    if (url.origin === "https://auth.takewing.invalid") {
      if (url.pathname.endsWith("/token")) return route.fulfill({ json: session() });
      if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
      if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204 });
    }
    await route.abort("blockedbyclient");
    throw new Error(`Unexpected fixture request: ${url.origin}${url.pathname}`);
  });
  await installBackend(context, backend);
});

async function signIn(page: Page, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".dashboard-main")).toBeVisible();
}

async function switchToSecondAccount(page: Page) {
  await page.locator(".account-trigger").click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.locator(".dashboard-main")).toHaveCount(0);
  await page.route("**/auth/v1/token?grant_type=password", route => route.fulfill({ json: session(undefined, second) }));
  await page.route("**/auth/v1/user", route => route.fulfill({ json: second }));
}

test("overview shows server balance, period totals, savings and chart from the API", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard");
  await expect(page.getByRole("combobox", { name: "Overview period" })).toContainText("7 days");
  await expect(page.getByTestId("overview-balance")).toHaveText("$25.00");
  await expect(page.getByTestId("overview-requests")).toHaveText("25");
  const savings = page.getByRole("region", { name: "All-time savings" });
  await expect(savings).toContainText("You saved");
  await expect(page.getByTestId("overview-savings")).toHaveText(/^\$0\.0\d+$/);
  await expect(savings).toContainText("without an official reference price");
  const saved = await savings.innerText();
  await expect(page.getByRole("heading", { name: "Top models by spend" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Top models by amount charged" }).locator("li").first()).toContainText("Nano Banana 2");
  await page.getByRole("tab", { name: "Requests", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tabpanel")).toContainText(await page.getByTestId("overview-credits").innerText());
  const chart = page.getByRole("img", { name: /^Daily charged/ });
  await chart.focus();
  await chart.press("Home");
  await expect(page.locator(".usage-chart__tooltip")).toContainText("charged");
  await chart.press("Escape");
  await expect(page.locator(".usage-chart__tooltip")).toHaveCount(0);
  await expect(page.locator(".usage-chart .legend")).toContainText("UTC");
  await selectDropdown(page, "Overview period", "All time");
  await expect(page.getByTestId("overview-requests")).toHaveText("30");
  await expect(page.getByRole("img", { name: /^Monthly/ })).toBeVisible();
  await expect(savings).toHaveText(saved, { useInnerText: true });
  await expect(page.locator("main")).not.toContainText(/sample|fictional|demo/i);
  await expect(page.getByRole("complementary", { name: "Service status notice" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await selectDropdown(page, "Overview period", "30 days");
  const requests = await page.getByTestId("overview-requests").innerText();
  await page.getByRole("link", { name: /View usage details/ }).click();
  await expect(page.getByRole("combobox", { name: "Request period" })).toContainText("30 days");
  await expect(page.getByTestId("request-count")).toHaveText(requests);
});

test("overview reports API failures, retries and shows an onboarding path for new accounts", async ({ page }) => {
  backend.failures.set("GET /v1/usage/overview", { status: 503, code: "database_unavailable", message: "The service could not complete this request." });
  await signIn(page, "/dashboard");
  await expect(page.getByRole("alert")).toContainText("The service could not complete this request.");
  backend.failures.clear();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("overview-requests")).toHaveText("25");
  await switchToSecondAccount(page);
  await signIn(page, "/dashboard");
  await expect(page.getByTestId("overview-balance")).toHaveText("$0.00");
  await expect(page.getByRole("heading", { name: "Make your first API request" })).toBeVisible();
  await expect(page.getByRole("region", { name: "All-time savings" })).toContainText("No request history yet");
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
      else await expect(page.locator("tbody tr").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(async () => page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const account = document.querySelector(".sidebar .account-menu")!.getBoundingClientRect();
        const footer = document.querySelector(".dashboard-main .public-footer")!.getBoundingClientRect();
        return Math.abs(account.top - footer.top);
      })).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("published incidents appear in the dashboard and on the public status page", async ({ page }) => {
  backend.incidents = [{ id: uuid(0xe1), title: "Image delays", impact: "Image requests are slower than usual.", service: "Image generation", model_ids: ["nano-banana-2"],
    timeline: [{ at: "2026-10-08T08:00:00Z", message: "Investigating." }], started_at: "2026-10-08T08:00:00Z", updated_at: "2026-10-08T08:00:00Z", resolved_at: null }];
  await signIn(page, "/dashboard");
  const notice = page.getByRole("complementary", { name: "Service status notice" });
  await expect(notice).toContainText("Image delays");
  await notice.getByRole("link").click();
  await expect(page).toHaveURL(/\/status$/);
  await expect(page.locator("main")).not.toContainText(email);
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("Active incident");
  await expect(page.locator(".incident-record")).toContainText("Investigating.");
  await expect(page.locator("main")).not.toContainText(/sample|fictional/i);
});

test("status page never claims health when the feed is unavailable", async ({ page }) => {
  backend.failures.set("GET /v1/status", { status: 503, code: "database_unavailable", message: "The service could not complete this request." });
  await page.goto("/status");
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("Status feed unavailable");
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("Current health is unknown");
  backend.failures.clear();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("No active incidents reported");
});

test("notification preferences save exact USD thresholds to the server and persist", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  const save = page.getByRole("button", { name: "Save preferences" });
  const toggle = page.getByRole("checkbox", { name: /^Low-balance email alerts/ });
  await expect(toggle).toBeEnabled();
  await expect(save).toBeDisabled();
  await toggle.check();
  const threshold = page.getByLabel("Alert threshold (USD)", { exact: true });
  await threshold.fill("abc");
  await save.click();
  await expect(page.getByRole("status").filter({ hasText: "positive USD amount" })).toBeVisible();
  await threshold.fill("2.50");
  await save.click();
  await expect(page.getByRole("status").filter({ hasText: "Preferences saved." })).toBeVisible();
  await expect(save).toBeDisabled();
  expect(backend.calls.find(call => call.method === "PUT" && call.path === "/v1/account/preferences")?.body)
    .toEqual({ low_balance_enabled: true, threshold_micros: "2500000", product_updates: false });
  await page.screenshot({ path: testInfo.outputPath("account-notifications.png"), fullPage: true });
  await page.reload();
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByLabel("Alert threshold (USD)", { exact: true })).toHaveValue("2.5");
  await expect(page.locator("main")).not.toContainText(/session only|not connected/i);
});

test("notification save failures keep edits and preferences are isolated per account", async ({ page }) => {
  backend.failures.set("PUT /v1/account/preferences", { status: 400, code: "invalid_preferences", message: "Enter a positive alert threshold to enable low-balance emails." });
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Product updates/ }).check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your edits are retained." })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^Product updates/ })).toBeChecked();
  backend.failures.clear();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preferences saved." })).toBeVisible();
  await switchToSecondAccount(page);
  await signIn(page, "/dashboard/settings");
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /^Product updates/ })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: /^Product updates/ })).not.toBeChecked();
  await expect(page.getByText(/Not verified, low-balance alerts are paused/)).toBeVisible();
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await expect(page.getByRole("button", { name: "Change password", exact: true })).toHaveCount(0);
  await expect(page.getByText(/Your sign-in provider manages your password/)).toBeVisible();
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
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(displayName).toHaveValue(originalName);
  await page.getByRole("tab", { name: "Notifications", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /^Product updates/ })).toBeEnabled();
  await page.getByRole("checkbox", { name: /^Product updates/ }).check();
  page.once("dialog", async dialog => { await dialog.dismiss(); });
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  await expect(page.getByRole("checkbox", { name: /^Product updates/ })).toBeChecked();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("account access changes email and password through Supabase and offers no fake deletion", async ({ page }) => {
  await signIn(page, "/dashboard/settings");
  const updates: Record<string, unknown>[] = [];
  await page.route("**/auth/v1/user**", async route => {
    if (route.request().method() !== "PUT") return route.fulfill({ json: user });
    updates.push(route.request().postDataJSON());
    await route.fulfill({ json: { ...user, new_email: updates.at(-1)?.email ?? null } });
  });
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await expect(page.getByRole("button", { name: /deletion/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "contact support" })).toHaveAttribute("href", "/support");
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await page.getByLabel("New email address").fill(email);
  await page.getByRole("button", { name: "Send confirmation" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("different email");
  await page.getByLabel("New email address").fill("new@example.com");
  await page.getByRole("button", { name: "Send confirmation" }).click();
  await expect(page.getByRole("dialog")).toContainText("Check new@example.com");
  expect(updates[0]).toMatchObject({ email: "new@example.com" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await page.getByLabel("New password", { exact: true }).fill("a-new-password");
  await page.getByLabel("Confirm new password", { exact: true }).fill("different-password");
  await page.getByRole("button", { name: "Change password", exact: true }).last().click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("do not match");
  await page.getByLabel("Confirm new password", { exact: true }).fill("a-new-password");
  await page.getByRole("button", { name: "Change password", exact: true }).last().click();
  await expect(page.getByRole("dialog")).toContainText("Your password has been changed.");
  expect(updates[1]).toMatchObject({ password: "a-new-password" });
});

test("signup has no unsaved billing fields", async ({ page }) => {
  let payload: Record<string, unknown> = {};
  await page.route("**/auth/v1/signup**", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { user, session: null } });
  });
  await page.goto("/signup?next=%2Fdashboard%2Fusage%3Fperiod%3D7d");
  await expect(page.getByText("Optional billing details")).toHaveCount(0);
  await expect(page.getByText("Billing details are optional and can be added later in Settings.")).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByLabel("Confirm password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(payload.email).toBe(email);
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
  expect(redirect).toBe(`${ORIGIN}/update-password?next=${encodeURIComponent(next)}`);
});

test("billing buys credits through Stripe checkout and credits only after server confirmation", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/billing");
  await expect(page.getByTestId("billing-balance")).toHaveText("$25.00");
  await expect(page.locator(".package-card")).toHaveCount(2);
  await selectDropdown(page, "Checkout currency", "USD");
  await expect(page.locator(".package-card")).toHaveCount(1);
  await selectDropdown(page, "Checkout currency", "EUR");
  await page.screenshot({ path: testInfo.outputPath("billing-packages.png"), fullPage: true });
  const buy = page.getByRole("button", { name: "Buy for €10.00", exact: true });
  await buy.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("€10.00");
  await expect(dialog).toContainText("$10.00 USD-value credits");
  await page.keyboard.press("Escape");
  await expect(buy).toBeFocused();
  await buy.click();
  await dialog.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/checkout=success/);
  const checkout = backend.calls.find(call => call.path === "/v1/billing/checkout")!;
  expect(checkout.body).toEqual({ offer_id: "pack-10", currency: "eur" });
  expect(checkout.headers["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
  await expect(page.getByTestId("billing-balance")).toHaveText("$25.00");
  await expect(page.getByRole("heading", { name: "Payment complete" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("billing-balance")).toHaveText("$35.00");
  await expect(page.locator("tbody tr").first()).toContainText("Paid");
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page).not.toHaveURL(/checkout=/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("billing explains cancelled checkout, opens Stripe receipts and keeps checkout errors visible", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { opened: string[] }).opened = [];
    window.open = () => {
      const tab = { opener: null as unknown, location: { set href(value: string) { (window as unknown as { opened: string[] }).opened.push(value); } }, close() {} };
      return tab as unknown as Window;
    };
  });
  await signIn(page, "/dashboard/billing?checkout=cancelled");
  await expect(page.getByRole("heading", { name: "Checkout cancelled" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "No payment was taken" })).toBeVisible();
  await page.getByRole("button", { name: /^Receipt/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { opened: string[] }).opened)).toEqual([`https://pay.stripe.com/receipts/fixture/${uuid(0xb1)}`]);
  backend.failures.set("POST /v1/billing/checkout", { status: 503, code: "payments_not_configured", message: "Payments are not configured." });
  await page.getByRole("button", { name: "Buy for €5.00", exact: true }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Payments are not configured.");
  await expect(page.getByRole("button", { name: "Continue to payment" })).toBeEnabled();
});

test("billing details save to the account and are shared with Settings", async ({ page }) => {
  await signIn(page, "/dashboard/billing");
  const form = page.getByRole("form", { name: "Billing details" });
  await expect(form.getByLabel("Company", { exact: true })).toBeEnabled();
  await form.getByLabel("Company", { exact: true }).fill("Example studio");
  await form.getByLabel("Country code", { exact: true }).fill("1A");
  await form.getByRole("button", { name: "Save billing details" }).click();
  await expect(form.getByRole("alert")).toContainText("two-letter country code");
  await form.getByLabel("Country code", { exact: true }).fill("de");
  await form.getByRole("button", { name: "Save billing details" }).click();
  await expect(form.getByRole("status")).toContainText("Billing details saved.");
  await expect(form.getByLabel("Country code", { exact: true })).toHaveValue("DE");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Billing", exact: true }).click();
  await expect(page.getByRole("form", { name: "Billing details" }).getByLabel("Company", { exact: true })).toHaveValue("Example studio");
  await expect(page.locator("main")).not.toContainText(/demo session|session only/i);
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
  const next = "/dashboard/usage?period=all&status=failed";
  await page.goto(next);
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(next);
  await expect(page.getByTestId("request-count")).toHaveText("4");
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
    await page.getByLabel("Password", { exact: true }).press("Enter");
    expect(calls).toBe(1);
  } finally { release(); }
  await expect(page.getByRole("alert")).toContainText("Fixture sign-in rejected");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
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
  const details = page.getByRole("button", { name: /Details for / }).first();
  await details.click();
  const dialog = page.getByRole("dialog");
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
    await expect.poll(() => saves).toBe(1);
  } finally { release(); }
  await expect(page.getByRole("status")).toContainText("Fixture profile rejected");
  await expect(page.getByLabel("Display name")).toHaveValue("Unsaved profile");
});

test("sign-out in another tab removes protected content and retains the return URL", async ({ page, context }) => {
  const next = "/dashboard/models";
  await signIn(page, next);
  const other = await context.newPage();
  await other.goto("/dashboard");
  await other.locator(".account-trigger").click();
  const popover = await other.locator(".account-popover").boundingBox();
  expect(popover!.x).toBeGreaterThanOrEqual(0);
  expect(popover!.x + popover!.width).toBeLessThanOrEqual(other.viewportSize()!.width);
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
    if (route === "/dashboard") await expect(page.locator(".overview-metrics > *")).toHaveCount(4);
    expect(await main.evaluate(el => Math.abs(document.documentElement.clientWidth - el.getBoundingClientRect().right))).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("dashboard models list only the live, priced models from the API", async ({ page }) => {
  await signIn(page, "/dashboard/models");
  const rows = page.getByRole("region", { name: "Available models table" }).locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("$1");
  await selectDropdown(page, "Filter capability", "Image");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("$0.08 per image");
  await page.getByRole("searchbox", { name: "Search models" }).fill("nothing");
  await expect(page.getByText("No models match these filters.")).toBeVisible();
  await expect(page.locator(".demo-bar")).toHaveCount(0);
});

test("requests paginate on the server and compose filters into the API query", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/usage?period=all");
  await expect(page.getByTestId("request-count")).toHaveText("30");
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  expect(backend.calls.some(call => call.path.startsWith("/v1/usage?") && call.path.includes("offset=10") && call.path.includes("limit=10"))).toBe(true);
  await selectDropdown(page, "Filter key", "Old integration (revoked)");
  await expect(page).not.toHaveURL(/page=2/);
  await selectDropdown(page, "Filter status", "Succeeded");
  const last = backend.calls.filter(call => call.path.startsWith("/v1/usage?")).at(-1)!.path;
  expect(last).toContain(`key=${uuid(0xa3)}`);
  expect(last).toContain("outcome=completed");
  await expect(page.getByTestId("request-count")).toHaveText("6");
  await page.getByLabel("Search request ID").fill("no_such_request");
  await expect(page.getByTestId("request-count")).toHaveText("0");
  await expect(page.getByText("No requests match these filters.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("usage-history.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("requests export downloads the server CSV for the visible filters", async ({ page }) => {
  await signIn(page, "/dashboard/usage?period=all&status=failed");
  await expect(page.getByTestId("request-count")).toHaveText("4");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("aiapi-deals-usage.csv");
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv.split("\r\n").filter(Boolean)).toHaveLength(5);
  expect(backend.calls.find(call => call.path.startsWith("/v1/usage/export.csv"))!.path).toContain("outcome=failed");
  await expect(page.getByRole("status").filter({ hasText: "Exported 4 matching records." })).toBeVisible();
});

test("requests validate custom dates and report load failures", async ({ page }) => {
  backend.failures.set("GET /v1/usage", { status: 503, code: "database_unavailable", message: "The service could not complete this request." });
  await signIn(page, "/dashboard/usage?period=all");
  await expect(page.getByRole("alert").filter({ hasText: "Request history could not be loaded" })).toBeVisible();
  backend.failures.clear();
  await page.getByRole("button", { name: "Reload history" }).click();
  await expect(page.getByTestId("request-count")).toHaveText("30");
  await selectDropdown(page, "Request period", "Custom dates");
  await page.getByLabel("Start date").fill("2026-09-22");
  await page.getByLabel("End date").fill("2026-09-20");
  await expect(page.getByRole("alert").filter({ hasText: /valid date range/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeDisabled();
  await page.getByLabel("Start date").fill("2000-01-01");
  await page.getByLabel("End date").fill("2000-01-02");
  await expect(page.getByTestId("request-count")).toHaveText("0");
});

test("request details show charged amounts, tokens, safe errors and support copy", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/usage?period=all");
  const table = page.getByRole("region", { name: "Request log table" }).getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveText(["Model", "Charged", "Duration", "Status", "Date and time", "Details"]);
  const completed = uuid(0x102);
  await page.getByLabel("Search request ID").fill(completed);
  await page.getByRole("button", { name: `Details for ${completed}` }).click();
  const dialog = page.getByRole("dialog", { name: "Request details" });
  await expect(dialog.locator("dl")).toContainText("Input tokens400");
  await expect(dialog.locator("dl")).toContainText("Output tokens100");
  await expect(dialog.locator("dl")).toContainText("BillingCharged $0.0012");
  await expect(dialog.locator("dl")).toContainText("API keyProduction");
  await expect(dialog).not.toContainText(/fictional|demo/i);
  await page.screenshot({ path: testInfo.outputPath("usage-detail.png") });
  await page.keyboard.press("Escape");
  const failed = uuid(0x103);
  await page.getByLabel("Search request ID").fill(failed);
  await page.getByRole("button", { name: `Details for ${failed}` }).click();
  await expect(dialog).toContainText("The provider rejected this request.");
  await expect(dialog.locator("dl")).toContainText("BillingNot charged");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text; } } }));
  await dialog.getByRole("button", { name: "Copy support details" }).click();
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied).toContain(failed);
  expect(copied).toContain("provider_rejected");
  expect(copied).not.toMatch(/fixture-access|Fictional/);
  await page.keyboard.press("Escape");
  const unknown = uuid(0x105);
  await page.getByLabel("Search request ID").fill(unknown);
  await page.getByRole("button", { name: `Details for ${unknown}` }).click();
  await expect(dialog).toContainText("Do not resubmit automatically");
  await page.keyboard.press("Escape");
  const image = uuid(0x106);
  await page.getByLabel("Search request ID").fill(image);
  await page.getByRole("button", { name: `Details for ${image}` }).click();
  await expect(dialog.locator("dl")).toContainText("Images1");
  await expect(dialog.locator("dl")).toContainText("Input tokensNot applicable / unavailable");
});

test("key lifecycle creates a real key once, never stores the secret and revokes on the server", async ({ page }, testInfo) => {
  await signIn(page, "/dashboard/api-keys");
  await expect(page.getByRole("combobox", { name: "Key status", exact: true })).toContainText("Active");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator("tbody")).toContainText("tw_live_prod1234…");
  await page.getByRole("button", { name: "Create API key +", exact: true }).click();
  await page.getByLabel("Key name", { exact: true }).fill("Test integration");
  await page.getByRole("button", { name: "Create key", exact: true }).dblclick();
  const dialog = page.getByRole("dialog");
  await expect(page.getByTestId("new-api-key")).toHaveText(/^tw_live_fixture\d+SECRETVALUE0123456789$/);
  const secret = await page.getByTestId("new-api-key").innerText();
  expect(backend.calls.filter(call => call.method === "POST" && call.path === "/v1/api-keys")).toHaveLength(1);
  await expect(dialog.getByRole("heading")).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("key-show-once.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Create API key +", exact: true })).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.locator("body")).not.toContainText(secret);
  const row = page.locator("tbody tr", { hasText: "Test integration" });
  await expect(row).toContainText("Never used");
  await row.getByRole("link", { name: /View requests/i }).click();
  await expect(page.getByRole("combobox", { name: "Filter key", exact: true })).toContainText("Test integration");
  await expect(page.getByText("No requests match these filters.", { exact: true })).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: "Revoke Test integration", exact: true }).click();
  await dialog.getByRole("button", { name: "Revoke key", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "API key revoked", exact: true })).toBeFocused();
  expect(backend.calls.some(call => call.method === "DELETE" && call.path.startsWith("/v1/api-keys/"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(row).toHaveCount(0);
  await selectDropdown(page, "Key status", "Revoked");
  await expect(row).toContainText(/revoked/i);
  await expect(row.getByRole("button", { name: /revoke/i })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("body")).not.toContainText(secret);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(secret);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("key failures retain edits and closing an in-flight request reloads the server state", async ({ page }) => {
  backend.failures.set("POST /v1/api-keys", { status: 503, code: "database_unavailable", message: "The service could not complete this request." });
  await signIn(page, "/dashboard/api-keys");
  await page.getByRole("button", { name: "Create API key +", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await page.getByLabel("Key name", { exact: true }).fill("Retained name");
  await dialog.getByRole("button", { name: "Create key", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("The service could not complete this request.");
  await expect(page.getByLabel("Key name", { exact: true })).toHaveValue("Retained name");
  backend.failures.clear();
  backend.hold.add("POST /v1/api-keys");
  await dialog.getByRole("button", { name: "Create key", exact: true }).click();
  await expect(dialog.getByLabel("Key name", { exact: true })).toBeDisabled();
  const reloads = backend.calls.filter(call => call.method === "GET" && call.path === "/v1/api-keys").length;
  await page.keyboard.press("Escape");
  await expect.poll(() => backend.calls.filter(call => call.method === "GET" && call.path === "/v1/api-keys").length).toBeGreaterThan(reloads);
  await expect(page.locator("tbody tr")).toHaveCount(2);
});

test("key metadata is isolated per account", async ({ page }) => {
  await signIn(page, "/dashboard/api-keys");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await switchToSecondAccount(page);
  await signIn(page, "/dashboard/api-keys");
  await expect(page.getByRole("heading", { name: "Create your first API key" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Production");
});
