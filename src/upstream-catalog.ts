import { z } from "zod";
import { readBoundedText } from "./http-body.js";
import { HttpError } from "./errors.js";
import { adminAuth, database, rpc } from "./database.js";
import type { Env } from "./types.js";

// GrsAI's own dashboard reads these unauthenticated endpoints (found in its web bundle on
// 2026-10-17, ADR-008). They are undocumented, so every field is validated and anything
// unexpected fails the sync instead of changing prices.
const UPSTREAM_ORIGIN = "https://eb.grsaiapi.com";
// Must match the hourly entry in wrangler.jsonc; the other cron runs recovery work.
export const UPSTREAM_SYNC_CRON = "17 * * * *";
// Owner decision 2026-09-21: upstream credits are always bought with the USD 150 package.
export const ACQUISITION_PACKAGE_AMOUNT_MINOR = 15_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const TIMEOUT_MS = 15_000;

export type UpstreamModel = {
  id: string;
  capability: "text" | "image";
  display_name: string;
  closed: boolean;
  note: string | null;
  // Text: credits per million tokens. Image: credits per request.
  input_credits: number | null;
  output_credits: number | null;
  cache_credits: number | null;
  unit_credits: number | null;
};

export type UpstreamCatalog = {
  package: { amount_minor: number; credits: number };
  models: UpstreamModel[];
};

export type UpstreamChange = {
  id: number; model: string; kind: string; status: string;
  previous: Record<string, unknown> | null; proposed: Record<string, unknown> | null;
};

export type SyncResult =
  | { status: "synced"; models: number; changes: UpstreamChange[] }
  | { status: "failed"; error: string; consecutive_failures: number; alert: boolean };

export class UpstreamCatalogError extends Error {}

const credits = z.number().int().min(0).max(1_000_000_000);
const modelSchema = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,79}$/),
  type: z.string(),
  costType: z.number().int(),
  cost: credits,
  inputTokens: credits,
  outputTokens: credits,
  cacheCost: credits.default(0),
  closeModel: z.boolean(),
  maintenance: z.string().max(500).default(""),
});
const listSchema = z.object({ code: z.literal(0), data: z.object({ list: z.array(z.unknown()).min(1).max(500) }) });
const goodsSchema = z.object({
  code: z.literal(0),
  data: z.object({ usdList: z.array(z.object({ amount: z.number().int(), count: z.number().int(), currency: z.string() })) }),
});

// "gpt-6.1-sol" -> "GPT 6.1 Sol", matching the names of the seeded models.
export function displayName(id: string): string {
  return id.split("-").map((part) => /^(gpt|cl|vip|\d+k)$/.test(part) ? part.toUpperCase()
    : part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function parseUpstreamCatalog(list: unknown, goods: unknown): UpstreamCatalog {
  const listed = listSchema.safeParse(list);
  if (!listed.success) throw new UpstreamCatalogError("model_list_invalid");
  const models: UpstreamModel[] = [];
  const seen = new Set<string>();
  for (const raw of listed.data.data.list) {
    const parsed = modelSchema.safeParse(raw);
    if (!parsed.success) throw new UpstreamCatalogError("model_entry_invalid");
    const item = parsed.data;
    // Video stays out of the sync until OD-007 is resolved.
    if (item.type !== "text" && item.type !== "image") continue;
    if (seen.has(item.name)) throw new UpstreamCatalogError(`duplicate_model:${item.name}`);
    seen.add(item.name);
    const text = item.type === "text";
    // costType 1 bills tokens and 0 bills requests; any other pairing is a format change.
    if (item.costType !== (text ? 1 : 0)) throw new UpstreamCatalogError(`unexpected_unit:${item.name}`);
    const priced = text ? item.inputTokens > 0 && item.outputTokens > 0 : item.cost > 0;
    if (!priced && !item.closeModel) throw new UpstreamCatalogError(`missing_price:${item.name}`);
    models.push({
      id: item.name, capability: item.type, display_name: displayName(item.name),
      closed: item.closeModel, note: item.maintenance.trim() || null,
      input_credits: text && priced ? item.inputTokens : null,
      output_credits: text && priced ? item.outputTokens : null,
      cache_credits: text && item.cacheCost > 0 ? item.cacheCost : null,
      unit_credits: !text && priced ? item.cost : null,
    });
  }
  if (!models.length) throw new UpstreamCatalogError("no_text_or_image_models");
  const offers = goodsSchema.safeParse(goods);
  if (!offers.success) throw new UpstreamCatalogError("package_list_invalid");
  const pack = offers.data.data.usdList.find((offer) => offer.currency === "usd" && offer.amount === ACQUISITION_PACKAGE_AMOUNT_MINOR);
  if (!pack || pack.count <= 0) throw new UpstreamCatalogError("acquisition_package_missing");
  return { package: { amount_minor: pack.amount, credits: pack.count }, models };
}

async function post(path: string, body: unknown, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(`${UPSTREAM_ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new UpstreamCatalogError(`http_${response.status}:${path}`);
  const text = await readBoundedText(response, MAX_RESPONSE_BYTES,
    new HttpError(502, "upstream_catalog_too_large", "Upstream catalogue too large."),
    new HttpError(502, "upstream_catalog_unreadable", "Upstream catalogue unreadable."));
  try { return JSON.parse(text) as unknown; } catch { throw new UpstreamCatalogError(`not_json:${path}`); }
}

export async function fetchUpstreamCatalog(fetcher: typeof fetch = fetch): Promise<UpstreamCatalog> {
  const [list, goods] = await Promise.all([
    post("/client/serverGrsai/getModelListV2", {}, fetcher),
    post("/client/goods/getGoodsList", { country: "en" }, fetcher),
  ]);
  return parseUpstreamCatalog(list, goods);
}

function failureCode(cause: unknown): string {
  if (cause instanceof UpstreamCatalogError) return cause.message;
  if (cause instanceof HttpError) return cause.code;
  if (cause instanceof Error && cause.name === "TimeoutError") return "timeout";
  return "fetch_failed";
}

export type SyncOverride = { actor: string; reason: string };

// One sync run: fetch, apply in the database, record failures, and email admins about
// anything they should know. Database errors propagate; upstream problems are recorded.
export async function syncUpstreamCatalog(env: Env, override: SyncOverride | null = null, fetcher: typeof fetch = fetch): Promise<SyncResult> {
  const db = database(env);
  let catalog: UpstreamCatalog;
  try {
    catalog = await fetchUpstreamCatalog(fetcher);
  } catch (cause) {
    const failure = await rpc<SyncResult>(db, "tw_record_upstream_sync_failure", { p_error: failureCode(cause) });
    await alertFailure(env, failure);
    return failure;
  }
  const result = await rpc<SyncResult>(db, "tw_sync_upstream_catalog", {
    p_snapshot: catalog, p_override_actor: override?.actor ?? null, p_override_reason: override?.reason ?? null,
  });
  if (result.status === "failed") await alertFailure(env, result);
  else if (result.changes.length) await notifyAdmins(env, `GrsAI catalogue: ${result.changes.length} change(s)`, describeChanges(result.changes));
  return result;
}

async function alertFailure(env: Env, failure: SyncResult): Promise<void> {
  if (failure.status !== "failed" || !failure.alert) return;
  await notifyAdmins(env, "GrsAI catalogue sync is failing",
    `The hourly GrsAI price sync failed ${failure.consecutive_failures} times in a row (last error: ${failure.error}).\n`
    + "Prices are not being updated. A shrunken list (catalog_shrunk) can be accepted from the admin panel.");
}

function micros(value: unknown): string {
  if (typeof value !== "string") return "–";
  const amount = BigInt(value);
  return `$${amount / 1_000_000n}.${(amount % 1_000_000n).toString().padStart(6, "0")}`;
}

function prices(entry: Record<string, unknown> | null): string {
  if (!entry) return "";
  return entry.unit_micros ? `${micros(entry.unit_micros)}/request`
    : `${micros(entry.input_micros)} in / ${micros(entry.output_micros)} out per 1M tokens`;
}

export function describeChanges(changes: UpstreamChange[]): string {
  const lines = changes.map((change) => {
    const pricing = change.kind.startsWith("price") || change.kind === "suspicious_price"
      ? ` cost ${prices(change.previous)} -> ${prices(change.proposed)}` : change.kind === "new_model" ? ` cost ${prices(change.proposed)}` : "";
    return `- ${change.model}: ${change.kind.replaceAll("_", " ")} (${change.status})${pricing}`;
  });
  return `${lines.join("\n")}\n\nCosts are GrsAI costs; customers pay them times the markup. Pending changes wait for a decision under Admin > GrsAI sync.\n`;
}

async function notifyAdmins(env: Env, subject: string, text: string): Promise<void> {
  if (!env.EMAIL || !env.ALERT_FROM_EMAIL) return;
  const ids = (env.ADMIN_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const auth = adminAuth(env);
  const site = env.PUBLIC_SITE_URL ?? "https://aiapi.deals";
  for (const id of ids) {
    try {
      const { data, error } = await auth.getUserById(id);
      const email = data.user?.email;
      if (error || !email || !data.user?.email_confirmed_at) continue;
      await env.EMAIL.send({ from: env.ALERT_FROM_EMAIL, to: email, subject, text: `${text}\n${site}/dashboard/admin\n` });
    } catch {
      console.log(JSON.stringify({ event: "alerts.upstream_sync_failed" }));
    }
  }
}
