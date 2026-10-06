import { Hono } from "hono";
import { createOpenApiDocument } from "./openapi.js";
import { readBoundedJson, readBoundedText } from "./http-body.js";
import { cors } from "hono/cors";
import { z } from "zod";
import Stripe from "stripe";
import * as Sentry from "@sentry/cloudflare";
import { requireAccount, requireUser, type AppContext, type AppEnv } from "./auth.js";
import { database, rpc } from "./database.js";
import { HttpError, safeErrorMessage } from "./errors.js";
import { chooseProviderKey, fetchProviderResult, pollMedia, submitChat, submitMedia } from "./provider.js";
import { decryptPayload, encryptPayload, formatCredits, formatUsdMicros, hex, hmacSha256, newApiKey, requireConfiguredInt, sha256, stableJson } from "./security.js";
import type { Env, QueueBatch, StoredMedia } from "./types.js";
import { estimatedInputTokens, generationRequestSchema, validateChat, validateModelInput, validateParameterSchema } from "./validation.js";

const app = new Hono<AppEnv>();
const encoder = new TextEncoder();

function apiError(c: AppContext, error: HttpError): Response {
  const requestId = c.get("requestId");
  const payload = { error: { message: error.message, type: error.status >= 500 ? "server_error" : "invalid_request_error", code: error.code, request_id: requestId } };
  return new Response(JSON.stringify(payload), { status: error.status, headers: {
    "content-type": "application/json; charset=utf-8", "x-request-id": requestId, "cache-control": "no-store",
  } });
}

function writeLog(event: string, fields: Record<string, string | number | boolean | null> = {}): void {
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...fields }));
}

function createStripe(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, "payments_not_configured", "Payments are not configured.");
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 0,
  });
}

async function readJson(c: { req: { raw: Request } }, env: Env): Promise<unknown> {
  const body = await readBoundedText(c.req.raw, requireConfiguredInt(env.MAX_REQUEST_BYTES, 1_048_576),
    new HttpError(413, "request_too_large", "The request exceeds the configured size limit."),
    new HttpError(400, "invalid_json", "The request body could not be read."));
  try { return JSON.parse(body) as unknown; }
  catch { throw new HttpError(400, "invalid_json", "The request body must be valid JSON."); }
}

function getIdempotencyKey(c: { req: { header(name: string): string | undefined } }, required: boolean): string | null {
  const key = c.req.header("idempotency-key")?.trim() ?? "";
  if (!key && !required) return null;
  if (key.length < 8 || key.length > 128) throw new HttpError(400, "invalid_idempotency_key", "Idempotency-Key must be between 8 and 128 characters.");
  return key;
}

function assertUuid(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(404, "request_not_found", "The request was not found.");
  }
}

async function loadTextResult(env: Env, requestId: string): Promise<Response> {
  const result = await env.GENERATED_ASSETS.get(`results/${requestId}/response.json`);
  if (!result) throw new HttpError(410, "result_expired", "The saved result is no longer available.");
  return new Response(result.body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" } });
}

async function loadOwnedTextResult(env: Env, accountId: string, requestId: string): Promise<Response> {
  const manifest = await rpc<{ kind?: string }>(database(env), "tw_get_result", {
    p_account_id: accountId, p_request_id: requestId,
  });
  if (manifest.kind !== "chat") throw new HttpError(409, "result_type_mismatch", "This request does not contain a chat result.");
  return loadTextResult(env, requestId);
}

function mediaStatus(status: string): "succeeded" | "failed" | "pending" | "unknown" {
  const normalized = status.toLowerCase();
  if (["succeeded", "success", "completed"].includes(normalized)) return "succeeded";
  if (["failed", "error", "cancelled", "canceled"].includes(normalized)) return "failed";
  if (["queued", "pending", "running", "processing", "in_progress", "in-progress"].includes(normalized)) return "pending";
  return "unknown";
}

app.use("/*", cors({
  origin: (origin, c) => {
    if (!origin) return "";
    const configured = new Set((c.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
      .split(",").map((entry: string) => entry.trim()).filter(Boolean));
    let sameOrigin = false;
    try { sameOrigin = new URL(c.req.url).origin === origin; } catch { /* Invalid Host is never reflected. */ }
    return sameOrigin || configured.has(origin) ? origin : "";
  },
  allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "Stripe-Signature"],
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  maxAge: 600,
}));

app.use("/*", async (c, next) => {
  const id = crypto.randomUUID();
  c.set("requestId", id);
  c.header("x-request-id", id);
  c.header("x-content-type-options", "nosniff");
  c.header("referrer-policy", "no-referrer");
  if (c.req.path.startsWith("/v1/") || c.req.path === "/healthz") c.header("cache-control", "no-store");
  await next();
});

app.get("/healthz", (c) => c.json({ status: "ok" }));

app.get("/v1/openapi.json", (c) => c.json(createOpenApiDocument(new URL(c.req.url).origin)));

app.get("/v1/models", async (c) => {
  const models = await rpc<Array<{
    id: string; name: string; capability: "text" | "image" | "video"; price_version: number; provider_group_id: string;
    prices: { input_micros_per_million: string | null; output_micros_per_million: string | null; unit_micros: string | null; unit: string };
    parameters: unknown;
  }>>(database(c.env), "tw_list_models");
  return c.json({ object: "list", data: models.map((model) => ({
    id: model.id, name: model.name, capability: model.capability,
    price_version: model.price_version,
    pricing: {
      unit: model.prices.unit,
      input_per_million: model.prices.input_micros_per_million === null ? null : formatUsdMicros(model.prices.input_micros_per_million),
      output_per_million: model.prices.output_micros_per_million === null ? null : formatUsdMicros(model.prices.output_micros_per_million),
      per_unit: model.prices.unit_micros === null ? null : formatUsdMicros(model.prices.unit_micros),
    },
    parameters: model.parameters,
  })) });
});

app.post("/v1/chat/completions", requireAccount(), async (c) => {
  const account = c.get("account");
  if (account.authType !== "api_key") throw new HttpError(403, "api_key_required", "Use a Takewing API key for generation requests.");
  const { request, maxOutputTokens } = validateChat(await readJson(c, c.env));
  const inputTokens = estimatedInputTokens(request.messages);
  const modelList = await rpc<Array<{ id: string; capability: string; provider_group_id: string }>>(database(c.env), "tw_list_models");
  const model = modelList.find((item) => item.id === request.model && item.capability === "text");
  if (!model) throw new HttpError(404, "model_unavailable", "The requested model is unavailable.");
  const idempotencyKey = getIdempotencyKey(c, false);
  const requestHash = hex(await hmacSha256(c.env.IDEMPOTENCY_HMAC_SECRET, stableJson(request)));
  const key = chooseProviderKey(c.env, model.provider_group_id);
  const db = database(c.env);
  const reservation = await rpc<{ request_id: string; state: string; duplicate: boolean }>(db, "tw_reserve_generation", {
    p_account_id: account.id, p_api_key_id: account.apiKeyId, p_model_id: model.id,
    p_idempotency_key: idempotencyKey, p_request_hash: `\\x${requestHash}`, p_kind: "text",
    p_input_tokens: inputTokens, p_output_tokens: maxOutputTokens, p_units: null, p_payload_object_key: null,
    p_provider_key_id: key.id,
  });
  if (reservation.duplicate) {
    if (reservation.state === "succeeded") return loadOwnedTextResult(c.env, account.id, reservation.request_id);
    if (reservation.state === "expired") throw new HttpError(410, "result_expired", "The saved result is no longer available.");
    return c.json({ error: { message: "This request is already in progress or has an unresolved provider outcome.", code: "idempotent_request_exists", request_id: reservation.request_id } }, 409);
  }
  const upstreamBody: Record<string, unknown> = {
    model: request.model,
    messages: request.messages,
    max_tokens: maxOutputTokens,
    stream: false,
    ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
    ...(request.top_p === undefined ? {} : { top_p: request.top_p }),
    ...(request.stop === undefined ? {} : { stop: request.stop }),
    ...(request.seed === undefined ? {} : { seed: request.seed }),
  };
  const started = Date.now();
  let upstream: Response;
  try {
    upstream = (await submitChat(c.env, key, upstreamBody)).response;
  } catch {
    await rpc(db, "tw_fail_generation", { p_request_id: reservation.request_id, p_error_category: "provider_timeout_or_disconnect", p_ambiguous: true });
    writeLog("generation.unknown", { request_id: reservation.request_id, model: model.id, provider_key_id: key.id, duration_ms: Date.now() - started });
    throw new HttpError(503, "provider_outcome_unknown", "The provider outcome is unclear. The request will not be resubmitted automatically.");
  }
  if (!upstream.ok) {
    // 429 means the provider refused before generating; release immediately.
    const ambiguous = upstream.status >= 500 || upstream.status === 408;
    await rpc(db, "tw_fail_generation", {
      p_request_id: reservation.request_id,
      p_error_category: ambiguous ? "provider_rejection_ambiguous" : "provider_rejected",
      p_ambiguous: ambiguous,
    });
    writeLog(ambiguous ? "generation.unknown" : "generation.failed", {
      request_id: reservation.request_id, model: model.id, provider_key_id: key.id,
      provider_status: upstream.status, duration_ms: Date.now() - started,
    });
    throw new HttpError(ambiguous ? 503 : 502, ambiguous ? "provider_outcome_unknown" : "provider_rejected",
      ambiguous ? "The provider outcome is unclear; this request will not be resubmitted automatically." : "The provider rejected this request.");
  }
  let responseBody: unknown;
  try {
    responseBody = await readBoundedJson(upstream, requireConfiguredInt(c.env.MAX_TEXT_RESULT_BYTES, 8_388_608));
  } catch (cause) {
    const error = cause instanceof HttpError ? cause : new HttpError(502, "provider_response_invalid", "The provider response could not be read.");
    await rpc(db, "tw_fail_generation", { p_request_id: reservation.request_id, p_error_category: error.code, p_ambiguous: true });
    throw new HttpError(503, "provider_outcome_unknown", "The provider response could not be safely stored. The request will not be resubmitted.");
  }
  const parsed = z.object({
    choices: z.array(z.unknown()).min(1),
    usage: z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative() }).passthrough(),
  }).passthrough().safeParse(responseBody);
  if (!parsed.success) {
    await rpc(db, "tw_fail_generation", { p_request_id: reservation.request_id, p_error_category: "provider_usage_missing", p_ambiguous: true });
    writeLog("generation.unknown", { request_id: reservation.request_id, model: model.id, provider_key_id: key.id, duration_ms: Date.now() - started });
    throw new HttpError(503, "provider_usage_unavailable", "The provider response did not contain verifiable usage.");
  }
  const resultBytes = encoder.encode(JSON.stringify(responseBody));
  const maxResultBytes = requireConfiguredInt(c.env.MAX_RESULT_BYTES, 268_435_456);
  if (resultBytes.byteLength > maxResultBytes) {
    await rpc(db, "tw_fail_generation", { p_request_id: reservation.request_id, p_error_category: "provider_response_too_large", p_ambiguous: true });
    throw new HttpError(502, "provider_response_too_large", "The provider response exceeds the configured size limit.");
  }
  const objectKey = `results/${reservation.request_id}/response.json`;
  const settle = () => rpc(db, "tw_settle_generation", {
    p_request_id: reservation.request_id,
    p_input_tokens: parsed.data.usage.prompt_tokens,
    p_output_tokens: parsed.data.usage.completion_tokens,
    p_units: null,
    p_result_manifest: { kind: "chat" },
    p_result_object_keys: [objectKey],
  });
  try {
    await c.env.GENERATED_ASSETS.put(objectKey, resultBytes, { httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" } });
    // Settlement is idempotent: a retry after a lost DB response returns the committed outcome.
    try { await settle(); } catch (cause) {
      if (cause instanceof HttpError && cause.code === "usage_exceeds_reservation") throw cause;
      await settle();
    }
  } catch (cause) {
    const exceeded = cause instanceof HttpError && cause.code === "usage_exceeds_reservation";
    await rpc(db, "tw_fail_generation", { p_request_id: reservation.request_id, p_error_category: exceeded ? "usage_exceeds_reservation" : "settlement_failed", p_ambiguous: true });
    writeLog("generation.settlement_unknown", { request_id: reservation.request_id, model: model.id, provider_key_id: key.id });
    throw new HttpError(503, "settlement_outcome_unknown", "The response could not be safely settled. Check the request status before retrying.");
  }
  writeLog("generation.succeeded", {
    request_id: reservation.request_id, model: model.id, provider_key_id: key.id,
    input_tokens: parsed.data.usage.prompt_tokens, output_tokens: parsed.data.usage.completion_tokens,
    duration_ms: Date.now() - started,
  });
  return new Response(JSON.stringify(responseBody), {
    headers: { "content-type": "application/json; charset=utf-8", "x-request-id": c.get("requestId"), "x-takewing-request-id": reservation.request_id, "cache-control": "no-store" },
  });
});

app.post("/v1/generations", requireAccount(), async (c) => {
  const account = c.get("account");
  if (account.authType !== "api_key") throw new HttpError(403, "api_key_required", "Use a Takewing API key for generation requests.");
  const parsedBody = generationRequestSchema.safeParse(await readJson(c, c.env));
  if (!parsedBody.success) throw new HttpError(400, "invalid_request", "The media request contains invalid or unsupported fields.");
  const body = parsedBody.data;
  const models = await rpc<Array<{ id: string; capability: "text" | "image" | "video"; parameters: unknown; provider_group_id: string }>>(database(c.env), "tw_list_models");
  const model = models.find((item) => item.id === body.model && item.capability !== "text");
  if (!model) throw new HttpError(404, "model_unavailable", "The requested model is unavailable.");
  validateModelInput(body.input, model.parameters);
  const idempotencyKey = getIdempotencyKey(c, true)!;
  const requestHash = hex(await hmacSha256(c.env.IDEMPOTENCY_HMAC_SECRET, stableJson(body)));
  let units = 1;
  if (model.capability === "image") {
    const value = body.input.n ?? body.input.count ?? 1;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new HttpError(400, "invalid_model_input", "The output count must be a positive integer.");
    units = value;
  } else {
    const value = body.input.duration_seconds ?? body.input.duration;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new HttpError(400, "invalid_model_input", "Video duration in seconds must be a positive integer.");
    units = value;
  }
  const payloadKey = `payloads/${crypto.randomUUID()}.enc`;
  const providerKey = chooseProviderKey(c.env, model.provider_group_id);
  const db = database(c.env);
  const reservation = await rpc<{ request_id: string; state: string; duplicate: boolean }>(db, "tw_reserve_generation", {
    p_account_id: account.id, p_api_key_id: account.apiKeyId, p_model_id: model.id,
    p_idempotency_key: idempotencyKey, p_request_hash: `\\x${requestHash}`, p_kind: model.capability,
    p_input_tokens: 0, p_output_tokens: 0, p_units: units, p_payload_object_key: payloadKey,
    p_provider_key_id: providerKey.id,
  });
  if (reservation.duplicate && reservation.state === "expired") {
    throw new HttpError(410, "result_expired", "The saved result is no longer available.");
  }
  if (reservation.duplicate && reservation.state === "succeeded") {
    // Check ownership and precise expiry even if scheduled cleanup has not
    // changed the request state to `expired` yet.
    await rpc(database(c.env), "tw_get_result", { p_account_id: account.id, p_request_id: reservation.request_id });
  }
  if (!reservation.duplicate) {
    try {
      const encrypted = await encryptPayload(c.env.PAYLOAD_ENCRYPTION_KEY, { model: body.model, input: body.input });
      await c.env.GENERATED_ASSETS.put(payloadKey, encrypted, { httpMetadata: { contentType: "application/octet-stream", cacheControl: "private, no-store" } });
      await c.env.MEDIA_QUEUE.send(reservation.request_id, { contentType: "text" });
    } catch {
      await rpc(db, "tw_fail_generation", { p_request_id: reservation.request_id, p_error_category: "job_enqueue_failed", p_ambiguous: false });
      await deletePayload(c.env, reservation.request_id, payloadKey);
      throw new HttpError(503, "job_enqueue_failed", "The job could not be queued. No provider request was sent.");
    }
    writeLog("generation.queued", { request_id: reservation.request_id, model: model.id, capability: model.capability });
  }
  return c.json({ id: reservation.request_id, object: "generation", status: reservation.state,
    status_url: `/v1/requests/${reservation.request_id}`, result_url: `/v1/requests/${reservation.request_id}/result` },
  reservation.duplicate && reservation.state === "succeeded" ? 200 : 202);
});

app.get("/v1/requests/:id", requireAccount(), async (c) => {
  const id = c.req.param("id"); assertUuid(id);
  const request = await rpc<unknown>(database(c.env), "tw_get_request", { p_account_id: c.get("account").id, p_request_id: id });
  if (!request) throw new HttpError(404, "request_not_found", "The request was not found.");
  return c.json(request);
});

app.get("/v1/requests/:id/result", requireAccount(), async (c) => {
  const id = c.req.param("id"); assertUuid(id);
  const accountId = c.get("account").id;
  const manifest = await rpc<{ kind?: string }>(database(c.env), "tw_get_result", { p_account_id: accountId, p_request_id: id });
  if (manifest.kind === "chat") return loadTextResult(c.env, id);
  return c.json(manifest);
});

app.get("/v1/files/:requestId/:index", requireAccount(), async (c) => {
  const requestId = c.req.param("requestId"); assertUuid(requestId);
  const index = Number(c.req.param("index"));
  if (!Number.isInteger(index) || index < 0 || index > 119) throw new HttpError(404, "file_not_found", "The file was not found.");
  const manifest = await rpc<{ files?: Array<{ index: number; content_type: string }> }>(database(c.env), "tw_get_result", {
    p_account_id: c.get("account").id, p_request_id: requestId,
  });
  const item = manifest.files?.find((entry) => entry.index === index);
  if (!item) throw new HttpError(404, "file_not_found", "The file was not found.");
  const object = await c.env.GENERATED_ASSETS.get(`results/${requestId}/${index}`);
  if (!object) throw new HttpError(410, "result_expired", "The file is no longer available.");
  return new Response(object.body, { headers: {
    "content-type": item.content_type,
    "content-length": String(object.size),
    "content-disposition": `attachment; filename="takewing-${requestId}-${index}"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  } });
});

app.get("/v1/credits", requireAccount(), async (c) => {
  const summary = await rpc<{ available_credits_micros: string | number; reserved_credits_micros: string | number; suspended: boolean }>(
    database(c.env), "tw_dashboard_summary", { p_account_id: c.get("account").id });
  return c.json({ available_credits: formatCredits(summary.available_credits_micros),
    available_credits_micros: String(summary.available_credits_micros),
    reserved_credits: formatCredits(summary.reserved_credits_micros),
    reserved_credits_micros: String(summary.reserved_credits_micros), currency: "USD", suspended: summary.suspended });
});

type DashboardSummary = {
  available_credits_micros: string | number;
  reserved_credits_micros: string | number;
  used_credits_micros: string | number;
  [key: string]: unknown;
};

app.get("/v1/dashboard/summary", requireAccount(), async (c) => {
  const summary = await rpc<DashboardSummary>(database(c.env), "tw_dashboard_summary", { p_account_id: c.get("account").id });
  return c.json({ ...summary,
    available_credits: formatCredits(summary.available_credits_micros),
    reserved_credits: formatCredits(summary.reserved_credits_micros),
    used_credits: formatCredits(summary.used_credits_micros), currency: "USD" });
});

app.get("/v1/usage", requireAccount(), async (c) => {
  const db = database(c.env);
  const accountId = c.get("account").id;
  const [summary, data] = await Promise.all([
    rpc<DashboardSummary>(db, "tw_dashboard_summary", { p_account_id: accountId }),
    rpc<unknown>(db, "tw_list_usage", { p_account_id: accountId, p_limit: 100, p_before: null }),
  ]);
  const records = Array.isArray(data) ? data as Array<Record<string, unknown>> : [];
  return c.json({ summary: { ...summary,
    available_credits: formatCredits(summary.available_credits_micros),
    reserved_credits: formatCredits(summary.reserved_credits_micros),
    used_credits: formatCredits(summary.used_credits_micros) },
    data: records.map((record) => ({ ...record, credits: formatCredits(record.credits_micros as string | number | null) })) });
});

app.get("/v1/api-keys", requireAccount(), async (c) => {
  const user = requireUser(c);
  return c.json({ data: await rpc<unknown>(database(c.env), "tw_list_api_keys", { p_account_id: user.id }) });
});

app.post("/v1/api-keys", requireAccount(), async (c) => {
  const user = requireUser(c);
  const parsed = z.object({ name: z.string().trim().min(1).max(60) }).strict().safeParse(await readJson(c, c.env));
  if (!parsed.success) throw new HttpError(400, "invalid_key_name", "Key name must be between 1 and 60 characters.");
  const secret = newApiKey();
  const digest = hex(await sha256(secret));
  const prefix = `${secret.slice(0, 16)}…`;
  const key = await rpc<Record<string, unknown>>(database(c.env), "tw_create_api_key", {
    p_account_id: user.id, p_name: parsed.data.name, p_prefix: prefix, p_secret_hash: `\\x${digest}`,
  });
  return c.json({ ...key, secret }, 201);
});

app.delete("/v1/api-keys/:id", requireAccount(), async (c) => {
  const user = requireUser(c);
  const id = c.req.param("id"); assertUuid(id);
  const revoked = await rpc<boolean>(database(c.env), "tw_revoke_api_key", { p_account_id: user.id, p_key_id: id });
  if (!revoked) throw new HttpError(404, "api_key_not_found", "The API key was not found.");
  return c.json({ id, revoked: true });
});

app.get("/v1/billing/offers", requireAccount(), async (c) => {
  requireUser(c);
  const offers = await rpc<Array<{ id: string; currency: string; amount_minor: number; credits_micros: string | number }>>(database(c.env), "tw_list_purchase_offers");
  return c.json({ data: offers.map((offer) => ({ ...offer, credits: formatCredits(offer.credits_micros) })) });
});

app.get("/v1/billing/payments", requireAccount(), async (c) => {
  const user = requireUser(c);
  const payments = await rpc<Array<{ id: string; currency: string; amount_minor: number; credits_micros: string | number }>>(database(c.env), "tw_list_payments", { p_account_id: user.id });
  return c.json({ data: payments.map((payment) => ({ ...payment, credits: formatCredits(payment.credits_micros) })) });
});

app.post("/v1/billing/checkout", requireAccount(), async (c) => {
  const user = requireUser(c);
  const parsed = z.object({ offer_id: z.string().min(1).max(80), currency: z.enum(["eur", "usd"]) }).strict().safeParse(await readJson(c, c.env));
  if (!parsed.success) throw new HttpError(400, "invalid_checkout", "Choose a valid credit offer and currency.");
  const idempotencyKey = getIdempotencyKey(c, true)!;
  const db = database(c.env);
  const quote = await rpc<{ id: string; currency: string; amount_minor: number; credits_micros: string; expires_at: string; stripe_session_id: string | null }>(db, "tw_create_checkout_quote", {
    p_account_id: user.id, p_offer_id: parsed.data.offer_id, p_currency: parsed.data.currency, p_idempotency_key: idempotencyKey,
  });
  const stripe = createStripe(c.env);
  if (quote.stripe_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(quote.stripe_session_id);
    if (existing.status === "open" && existing.url) return c.json({ checkout_url: existing.url, quote_id: quote.id }, 200);
    throw new HttpError(409, existing.status === "expired" ? "checkout_quote_expired" : "checkout_already_completed",
      existing.status === "expired" ? "This checkout quote has expired. Start a new purchase." : "This checkout has already completed. Check your payment history for the confirmed purchase.");
  }
  const expiresAt = Math.floor(new Date(quote.expires_at).getTime() / 1000);
  if (!Number.isFinite(expiresAt) || expiresAt - Math.floor(Date.now() / 1000) < 30 * 60) {
    throw new HttpError(409, "checkout_quote_expired", "This checkout quote has expired. Start a new purchase.");
  }
  const siteUrl = c.env.PUBLIC_SITE_URL;
  if (!siteUrl) throw new HttpError(503, "payments_not_configured", "The public website URL is not configured.");
  let origin: URL;
  try { origin = new URL(siteUrl); } catch { throw new HttpError(503, "payments_not_configured", "The public website URL is not configured."); }
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") throw new HttpError(503, "payments_not_configured", "The public website URL is not configured.");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: {
      currency: quote.currency,
      unit_amount: quote.amount_minor,
      product_data: { name: "Takewing AI credits", description: `${formatCredits(quote.credits_micros)} prepaid credits` },
    } }],
    expires_at: expiresAt,
    success_url: `${origin.origin}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin.origin}/dashboard/billing?checkout=cancelled`,
    metadata: { quote_id: quote.id, account_id: user.id },
    payment_intent_data: { metadata: { quote_id: quote.id, account_id: user.id } },
  }, { idempotencyKey: quote.id });
  const attached = await rpc<boolean>(db, "tw_attach_checkout_session", { p_account_id: user.id, p_quote_id: quote.id, p_session_id: session.id });
  if (!attached || !session.url) throw new HttpError(503, "checkout_unavailable", "The checkout session could not be safely attached to the purchase.");
  return c.json({ checkout_url: session.url, quote_id: quote.id }, 201);
});

app.post("/stripe/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature || !c.env.STRIPE_WEBHOOK_SECRET) throw new HttpError(400, "invalid_webhook", "The payment webhook signature is missing.");
  const body = await readBoundedText(c.req.raw, requireConfiguredInt(c.env.MAX_REQUEST_BYTES, 1_048_576),
    new HttpError(413, "request_too_large", "The webhook body exceeds the configured size limit."),
    new HttpError(400, "invalid_webhook", "The webhook body could not be read."));
  let event: Stripe.Event;
  try {
    const stripe = createStripe(c.env);
    event = await stripe.webhooks.constructEventAsync(body, signature, c.env.STRIPE_WEBHOOK_SECRET,
      undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    throw new HttpError(400, "invalid_webhook", "The payment webhook signature is invalid.");
  }
  // Events that can never be reconciled automatically (not our purchase, unknown status)
  // are acknowledged with an alert log; a 5xx would make Stripe retry and finally disable
  // the endpoint. Signature failures and database errors still fail loudly.
  const unlinked = (reason: string) => {
    writeLog("stripe.webhook_needs_review", { event_id: event.id, event_type: event.type, reason });
    return c.json({ received: true, processed: false });
  };
  const isUuid = (value: string | undefined): value is string => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      if (session.amount_total === null || !session.currency || !isUuid(session.metadata?.quote_id)) return unlinked("missing_purchase_reference");
      await rpc(database(c.env), "tw_fulfill_checkout", {
        p_event_id: event.id, p_event_type: event.type, p_session_id: session.id,
        p_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        p_amount_minor: session.amount_total, p_currency: session.currency, p_metadata_quote_id: session.metadata!.quote_id,
      });
    }
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    if (!charge.payment_intent) return unlinked("missing_payment_reference");
    const stripe = createStripe(c.env);
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const quoteId = paymentIntent.metadata.quote_id;
    if (!isUuid(quoteId)) return unlinked("not_a_takewing_purchase");
    await rpc(database(c.env), "tw_reverse_checkout", {
      p_event_id: event.id, p_event_type: event.type, p_payment_intent_id: paymentIntent.id, p_metadata_quote_id: quoteId,
      p_refunded_amount_minor: charge.amount_refunded,
    });
  } else if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const stripe = createStripe(c.env);
    let paymentIntentId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent : dispute.payment_intent?.id ?? null;
    if (!paymentIntentId) {
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
      const charge = await stripe.charges.retrieve(chargeId);
      paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent : charge.payment_intent?.id ?? null;
    }
    if (!paymentIntentId) return unlinked("missing_payment_reference");
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const quoteId = paymentIntent.metadata.quote_id;
    if (!isUuid(quoteId)) return unlinked("not_a_takewing_purchase");
    if (event.type === "charge.dispute.created") {
      await rpc(database(c.env), "tw_reverse_checkout", {
        p_event_id: event.id, p_event_type: event.type, p_payment_intent_id: paymentIntent.id,
        p_metadata_quote_id: quoteId, p_refunded_amount_minor: null,
      });
    } else {
      // "prevented" closes a dispute in the merchant's favour, like "won".
      const status = dispute.status === "prevented" ? "won" : dispute.status;
      if (!["won", "lost", "warning_closed"].includes(status)) return unlinked(`unsupported_dispute_status:${dispute.status}`);
      await rpc(database(c.env), "tw_resolve_dispute", {
        p_event_id: event.id, p_event_type: event.type, p_payment_intent_id: paymentIntent.id,
        p_metadata_quote_id: quoteId, p_status: status,
      });
    }
  }
  return c.json({ received: true });
});

function requireAdmin(c: AppContext): string {
  const user = requireUser(c);
  const allowed = new Set((c.env.ADMIN_USER_IDS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has(user.id.toLowerCase())) throw new HttpError(403, "admin_required", "This operation requires an administrator account.");
  return user.id;
}

app.get("/v1/internal/admin-check", requireAccount(), (c) => {
  const account = c.get("account");
  const allowed = new Set((c.env.ADMIN_USER_IDS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
  return c.json({ authorized: account.authType === "user" && allowed.has(account.id.toLowerCase()) });
});

app.get("/v1/internal/ops", requireAccount(), async (c) => {
  requireAdmin(c);
  const db = database(c.env);
  const [summary, models] = await Promise.all([
    rpc<unknown>(db, "tw_ops_summary"),
    rpc<unknown>(db, "tw_admin_model_catalog"),
  ]);
  return c.json({ summary, models });
});

app.post("/v1/internal/controls", requireAccount(), async (c) => {
  const actor = requireAdmin(c);
  const body = z.object({
    reason: z.string().trim().min(3).max(500),
    accepting_requests: z.boolean(),
    result_ttl_hours: z.number().int().min(1).max(48).optional(),
  }).strict().safeParse(await readJson(c, c.env));
  if (!body.success) throw new HttpError(400, "invalid_operational_controls", "The operational controls are invalid.");
  await rpc(database(c.env), "tw_set_operational_controls", {
    p_actor: actor, p_reason: body.data.reason,
    p_accepting_requests: body.data.accepting_requests, p_result_ttl_hours: body.data.result_ttl_hours ?? null,
  });
  return c.json({ updated: true });
});

app.get("/v1/internal/accounts/:id", requireAccount(), async (c) => {
  requireAdmin(c);
  const accountId = c.req.param("id"); assertUuid(accountId);
  const account = await rpc<unknown>(database(c.env), "tw_admin_inspect_account", { p_account_id: accountId });
  return c.json(account);
});

app.post("/v1/internal/accounts/:id/suspension", requireAccount(), async (c) => {
  const actor = requireAdmin(c);
  const accountId = c.req.param("id"); assertUuid(accountId);
  const body = z.object({ reason: z.string().trim().min(3).max(500), suspended: z.boolean() }).strict().safeParse(await readJson(c, c.env));
  if (!body.success) throw new HttpError(400, "invalid_account_control", "The account control is invalid.");
  await rpc(database(c.env), "tw_admin_suspend_account", {
    p_actor: actor, p_reason: body.data.reason, p_account_id: accountId, p_suspended: body.data.suspended,
  });
  return c.json({ updated: true });
});

app.post("/v1/internal/accounts/:id/credits", requireAccount(), async (c) => {
  const actor = requireAdmin(c);
  const accountId = c.req.param("id"); assertUuid(accountId);
  const idempotencyKey = getIdempotencyKey(c, true)!;
  const body = z.object({
    reason: z.string().trim().min(3).max(500),
    delta_micros: z.string().regex(/^-?\d{1,18}$/).refine((value) => value !== "0" && value !== "-0"),
  }).strict().safeParse(await readJson(c, c.env));
  if (!body.success) throw new HttpError(400, "invalid_credit_adjustment", "The credit adjustment is invalid.");
  const result = await rpc<unknown>(database(c.env), "tw_admin_adjust_credits", {
    p_actor: actor, p_reason: body.data.reason, p_account_id: accountId,
    p_delta_micros: body.data.delta_micros, p_idempotency_key: idempotencyKey,
  });
  return c.json(result);
});

app.post("/v1/internal/api-keys/:id/revoke", requireAccount(), async (c) => {
  const actor = requireAdmin(c);
  const keyId = c.req.param("id"); assertUuid(keyId);
  const body = z.object({ reason: z.string().trim().min(3).max(500) }).strict().safeParse(await readJson(c, c.env));
  if (!body.success) throw new HttpError(400, "invalid_key_control", "A reason is required to revoke a key.");
  const revoked = await rpc<boolean>(database(c.env), "tw_admin_revoke_api_key", {
    p_actor: actor, p_reason: body.data.reason, p_key_id: keyId,
  });
  return c.json({ revoked });
});

app.post("/v1/internal/provider", requireAccount(), async (c) => {
  const actor = requireAdmin(c);
  const parsed = z.object({
    reason: z.string().trim().min(3).max(500),
    group_id: z.string().min(1).max(80), enabled: z.boolean(),
    budget_limit_micros: z.string().regex(/^\d{1,18}$/),
    markup_bps: z.number().int().min(10_000).max(1_000_000),
    accepting_requests: z.boolean(), result_ttl_hours: z.number().int().min(1).max(48),
  }).strict().safeParse(await readJson(c, c.env));
  if (!parsed.success) throw new HttpError(400, "invalid_provider_settings", "Provider controls contain invalid values.");
  await rpc(database(c.env), "tw_admin_configure_provider", {
    p_actor: actor, p_reason: parsed.data.reason, p_group_id: parsed.data.group_id,
    p_enabled: parsed.data.enabled, p_budget_limit_micros: parsed.data.budget_limit_micros,
    p_global_markup_bps: parsed.data.markup_bps, p_accepting_requests: parsed.data.accepting_requests,
    p_result_ttl_hours: parsed.data.result_ttl_hours,
  });
  return c.json({ updated: true });
});

app.post("/v1/internal/models/:id", requireAccount(), async (c) => {
  const actor = requireAdmin(c);
  const body = z.object({
    reason: z.string().trim().min(3).max(500), enabled: z.boolean(),
    source_note: z.string().trim().min(5).max(500),
    unit: z.enum(["tokens", "request", "second"]).nullable(),
    input_micros: z.string().regex(/^\d{1,18}$/).nullable(), output_micros: z.string().regex(/^\d{1,18}$/).nullable(),
    unit_micros: z.string().regex(/^\d{1,18}$/).nullable(), markup_bps: z.string().regex(/^\d{5,7}$/).nullable(),
    max_input_tokens: z.number().int().positive().max(1_000_000).nullable(), max_output_tokens: z.number().int().positive().max(100_000).nullable(),
    max_units: z.number().int().positive().max(120).nullable(), parameter_schema: z.record(z.string(), z.unknown()),
  }).strict().safeParse(await readJson(c, c.env));
  if (!body.success) throw new HttpError(400, "invalid_model_settings", "The model price or limits are invalid.");
  if (body.data.enabled) validateParameterSchema(body.data.parameter_schema);
  const version = await rpc<number>(database(c.env), "tw_admin_configure_model", {
    p_actor: actor, p_reason: body.data.reason, p_model_id: c.req.param("id"), p_enabled: body.data.enabled,
    p_unit: body.data.unit, p_input_micros: body.data.input_micros, p_output_micros: body.data.output_micros,
    p_unit_micros: body.data.unit_micros, p_markup_bps: body.data.markup_bps,
    p_max_input: body.data.max_input_tokens, p_max_output: body.data.max_output_tokens,
    p_max_units: body.data.max_units, p_parameter_schema: body.data.parameter_schema, p_source_note: body.data.source_note,
  });
  return c.json({ model: c.req.param("id"), version, enabled: body.data.enabled });
});

app.post("/v1/internal/offers", requireAccount(), async (c) => {
  const actor = requireAdmin(c);
  const body = z.object({
    reason: z.string().trim().min(3).max(500), id: z.string().trim().min(1).max(80),
    currency: z.enum(["eur", "usd"]), amount_minor: z.number().int().positive().max(2_147_483_647),
    credits_micros: z.string().regex(/^\d{1,18}$/), active: z.boolean(),
  }).strict().safeParse(await readJson(c, c.env));
  if (!body.success) throw new HttpError(400, "invalid_offer", "The purchase offer is invalid.");
  await rpc(database(c.env), "tw_admin_configure_offer", {
    p_actor: actor, p_reason: body.data.reason, p_offer_id: body.data.id, p_currency: body.data.currency,
    p_amount_minor: body.data.amount_minor, p_credits_micros: body.data.credits_micros, p_active: body.data.active,
  });
  return c.json({ updated: true });
});

app.onError((cause, c) => {
  const error = safeErrorMessage(cause);
  writeLog("http.error", { request_id: c.get("requestId"), method: c.req.method, path: c.req.path, status: error.status, code: error.code });
  if (error.status >= 500 && c.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag("takewing.error_code", error.code);
      scope.setTag("takewing.request_id", c.get("requestId"));
      scope.setTag("http.method", c.req.method);
      Sentry.captureException(cause);
    });
  }
  return apiError(c, error);
});

app.notFound((c) => apiError(c, new HttpError(404, "not_found", "The requested route was not found.")));

async function deletePayload(env: Env, requestId: string, objectKey: string): Promise<void> {
  try {
    await env.GENERATED_ASSETS.delete(objectKey);
    await rpc(database(env), "tw_clear_payload_object", { p_request_id: requestId, p_object_key: objectKey });
  } catch {
    writeLog("storage.payload_cleanup_failed", { request_id: requestId });
  }
}

async function storeMediaResults(env: Env, requestId: string, result: Awaited<ReturnType<typeof pollMedia>>, capability: "image" | "video", reservedUnits: number): Promise<void> {
  const db = database(env);
  const attempt = await rpc<number | null>(db, "tw_begin_result_delivery", { p_request_id: requestId });
  if (attempt === null) return;
  if (attempt > 5) {
    await rpc(db, "tw_fail_generation", { p_request_id: requestId, p_error_category: "result_delivery_exhausted", p_ambiguous: true });
    return;
  }
  const sources = result.results ?? [];
  const actualUnits = capability === "image" ? sources.length : Math.ceil(result.duration ?? 0);
  if (!sources.length || actualUnits < 1 || actualUnits > reservedUnits || (capability === "video" && !result.duration)) {
    await rpc(database(env), "tw_fail_generation", { p_request_id: requestId, p_error_category: "provider_result_usage_invalid", p_ambiguous: true });
    return;
  }
  const maxResultBytes = requireConfiguredInt(env.MAX_RESULT_BYTES, 268_435_456);
  const stored: StoredMedia[] = [];
  const expectedKeys = sources.map((_, index) => `results/${requestId}/${index}`);
  const resultKeysRecorded = await rpc<boolean>(database(env), "tw_set_pending_result_objects", {
    p_request_id: requestId, p_result_object_keys: expectedKeys,
  });
  if (!resultKeysRecorded) {
    await rpc(database(env), "tw_fail_generation", { p_request_id: requestId, p_error_category: "result_recording_failed", p_ambiguous: true });
    return;
  }
  let totalBytes = 0;
  let manifest: { kind: string; files: Array<{ index: number; url: string; content_type: string; bytes: number }> };
  try {
    for (let index = 0; index < sources.length; index += 1) {
      const active = await rpc<boolean>(db, "tw_extend_result_delivery", { p_request_id: requestId });
      if (!active) return;
      const remaining = maxResultBytes - totalBytes;
      if (remaining <= 0) throw new HttpError(413, "provider_result_too_large", "The generated result exceeds the configured size limit.");
      const downloaded = await fetchProviderResult(env, sources[index]!.url, remaining);
      const objectKey = `results/${requestId}/${index}`;
      await env.GENERATED_ASSETS.put(objectKey, downloaded.body, {
        httpMetadata: { contentType: downloaded.contentType, cacheControl: "private, no-store" },
      });
      const bytes = downloaded.getBytes() || downloaded.bytes;
      totalBytes += bytes;
      stored.push({ objectKey, contentType: downloaded.contentType, bytes });
    }
    manifest = { kind: "media", files: stored.map((item, index) => ({
      index, url: `/v1/files/${requestId}/${index}`, content_type: item.contentType, bytes: item.bytes,
    })) };
  } catch (cause) {
    // Object keys are already durable; maintenance also finds partial failed puts.
    const permanent = cause instanceof HttpError && ["provider_result_too_large", "provider_result_url_invalid",
      "provider_result_url_blocked", "provider_result_type_unsupported"].includes(cause.code);
    if (permanent || attempt >= 5) {
      await rpc(db, "tw_fail_generation", { p_request_id: requestId, p_error_category: "provider_result_unavailable", p_ambiguous: true });
    } else {
      await rpc(db, "tw_reschedule_media_poll", { p_request_id: requestId, p_seconds: Math.min(300, 30 * 2 ** attempt) });
    }
    writeLog("generation.result_delivery_failed", { request_id: requestId, capability, attempt, retry: !permanent && attempt < 5 });
    return;
  }

  try {
    await rpc(database(env), "tw_settle_generation", {
      p_request_id: requestId, p_input_tokens: null, p_output_tokens: null, p_units: actualUnits,
      p_result_manifest: manifest, p_result_object_keys: expectedKeys,
    });
    writeLog("generation.succeeded", { request_id: requestId, capability, result_count: stored.length, result_bytes: totalBytes });
  } catch {
    // Settlement may already have committed. Its RPC is idempotent; never
    // release credits or delete these objects based on a lost DB response.
    await rpc(db, "tw_reschedule_media_poll", { p_request_id: requestId, p_seconds: 60 });
    writeLog("generation.settlement_retry", { request_id: requestId, capability });
  }
}

async function processMediaMessage(id: string, env: Env, message: QueueBatch["messages"][number]): Promise<void> {
  const db = database(env);
  const submission = await rpc<{
    request_id: string; model_id: string; provider_model_id: string; provider_group_id: string; provider_key_id: string;
    payload_object_key: string; capability: "image" | "video"; reserved_units: number;
  } | null>(db, "tw_claim_media_submission", { p_request_id: id });
  if (submission) {
    // Nothing has been sent to the provider yet, so any failure before submitMedia is a
    // definite failure: release the reservation instead of stranding it in 'submitting'.
    let payloadObject: R2ObjectBody | null;
    let providerKey: ReturnType<typeof chooseProviderKey>;
    try {
      payloadObject = submission.payload_object_key ? await env.GENERATED_ASSETS.get(submission.payload_object_key) : null;
      providerKey = chooseProviderKey(env, submission.provider_group_id, submission.provider_key_id);
    } catch {
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: "job_setup_failed", p_ambiguous: false });
      if (submission.payload_object_key) await deletePayload(env, id, submission.payload_object_key);
      message.ack();
      return;
    }
    if (!payloadObject) {
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: "job_payload_missing", p_ambiguous: false });
      if (submission.payload_object_key) await deletePayload(env, id, submission.payload_object_key);
      message.ack();
      return;
    }
    let payload: { model: string; input: Record<string, unknown> };
    try {
      const bytes = new Uint8Array(await new Response(payloadObject.body).arrayBuffer());
      payload = await decryptPayload(env.PAYLOAD_ENCRYPTION_KEY, bytes) as typeof payload;
    } catch {
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: "job_payload_unreadable", p_ambiguous: false });
      await deletePayload(env, id, submission.payload_object_key);
      message.ack();
      return;
    }
    let accepted;
    try {
      accepted = await submitMedia(env, providerKey, submission.provider_model_id, payload.input);
    } catch (cause) {
      const ambiguous = !(cause instanceof HttpError) || cause.code === "provider_rejected_ambiguous" || cause.status >= 500;
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: ambiguous ? "provider_submit_ambiguous" : "provider_rejected", p_ambiguous: ambiguous });
      writeLog(ambiguous ? "generation.unknown" : "generation.failed", { request_id: id, model: submission.model_id, provider_key_id: providerKey.id });
      await deletePayload(env, id, submission.payload_object_key);
      message.ack();
      return;
    }
    const outcome = mediaStatus(accepted.status);
    if (outcome === "failed") {
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: "provider_job_failed", p_ambiguous: false });
      await deletePayload(env, id, submission.payload_object_key);
      message.ack();
      return;
    }
    if (outcome === "unknown") {
      await rpc(db, "tw_mark_media_pending", {
        p_request_id: id, p_provider_request_id: accepted.id, p_provider_key_id: providerKey.id,
      });
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: "provider_status_unrecognized", p_ambiguous: true });
      await deletePayload(env, id, submission.payload_object_key);
      message.ack();
      return;
    }
    const pending = await rpc<boolean>(db, "tw_mark_media_pending", {
      p_request_id: id, p_provider_request_id: accepted.id, p_provider_key_id: providerKey.id,
    });
    await deletePayload(env, id, submission.payload_object_key);
    if (outcome === "succeeded" && accepted.results?.length) {
      if (pending) await storeMediaResults(env, id, accepted, submission.capability, submission.reserved_units);
      message.ack();
      return;
    }
    if (!pending) {
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: "provider_acceptance_unknown", p_ambiguous: true });
      message.ack();
      return;
    }
    await rpc(db, "tw_reschedule_media_poll", { p_request_id: id, p_seconds: 10 });
    try {
      await env.MEDIA_QUEUE.send(id, { delaySeconds: 10, contentType: "text" });
    } catch {
      writeLog("queue.poll_recovery_needed", { request_id: id });
    }
    message.ack();
    return;
  }

  const poll = await rpc<{
    request_id: string; provider_request_id: string; provider_key_id: string; provider_group_id: string;
    model_id: string; capability: "image" | "video"; reserved_units: number;
  } | null>(db, "tw_claim_media_poll", { p_request_id: id });
  if (!poll) { message.ack(); return; }
  const providerKey = chooseProviderKey(env, poll.provider_group_id, poll.provider_key_id);
  try {
    const result = await pollMedia(env, providerKey, poll.provider_request_id);
    const outcome = mediaStatus(result.status);
    if (outcome === "failed") {
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: "provider_job_failed", p_ambiguous: false });
      message.ack();
      return;
    }
    if (outcome === "unknown" || (outcome === "succeeded" && !result.results?.length)) {
      await rpc(db, "tw_fail_generation", { p_request_id: id, p_error_category: "provider_status_unresolved", p_ambiguous: true });
      message.ack();
      return;
    }
    if (outcome === "succeeded" && result.results?.length) {
      await storeMediaResults(env, id, result, poll.capability, poll.reserved_units);
      // A rescheduled delivery retry needs a message; a settled job ignores it.
      try { await env.MEDIA_QUEUE.send(id, { delaySeconds: 60, contentType: "text" }); }
      catch { writeLog("queue.poll_recovery_needed", { request_id: id }); }
      message.ack();
      return;
    }
    await rpc(db, "tw_reschedule_media_poll", { p_request_id: id, p_seconds: 10 });
  } catch {
    await rpc(db, "tw_reschedule_media_poll", { p_request_id: id, p_seconds: 60 });
    writeLog("provider.poll_retry", { request_id: id, model: poll.model_id });
  }
  try { await env.MEDIA_QUEUE.send(id, { delaySeconds: 10, contentType: "text" }); }
  catch { writeLog("queue.poll_recovery_needed", { request_id: id }); }
  message.ack();
}

export async function queue(batch: QueueBatch, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const id = typeof message.body === "string" ? message.body : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) { message.ack(); continue; }
    try {
      await processMediaMessage(id, env, message);
    } catch {
      writeLog("queue.handler_error", { request_id: id });
      message.retry({ delaySeconds: 60 });
    }
  }
}

export async function scheduled(_controller: ScheduledController, env: Env): Promise<void> {
  const db = database(env);
  // Each step is isolated so one failing RPC does not stop the remaining recovery work.
  const step = async (name: string, run: () => Promise<unknown>) => {
    try { await run(); } catch { writeLog("scheduled.step_failed", { step: name }); }
  };
  await step("expired_reservations", () => rpc(db, "tw_recover_expired_reservations"));
  await step("expired_idempotency_keys", () => rpc(db, "tw_recover_expired_idempotency_keys"));
  await step("stale_submissions", () => rpc(db, "tw_mark_stale_submissions_unknown"));
  await step("requeue_media", async () => {
    const [queued, pending] = await Promise.all([
      rpc<string[]>(db, "tw_recover_queued_media"),
      rpc<string[]>(db, "tw_recover_pending_media_polls"),
    ]);
    for (const id of [...queued, ...pending]) {
      try { await env.MEDIA_QUEUE.send(id, { contentType: "text" }); }
      catch { writeLog("queue.recovery_send_failed", { request_id: id }); }
    }
  });
  await step("object_cleanup", async () => {
    const expired = await rpc<Array<{ request_id: string; state: string; result_keys: string[]; payload_key: string | null }>>(db, "tw_expired_objects");
    for (const item of expired) {
      let resultDeleted = true;
      for (const key of item.result_keys ?? []) {
        try { await env.GENERATED_ASSETS.delete(key); }
        catch { resultDeleted = false; writeLog("storage.delete_failed", { request_id: item.request_id, object: "result" }); }
      }
      if (resultDeleted && item.result_keys?.length) {
        if (item.state === "succeeded") await rpc(db, "tw_mark_result_expired", { p_request_id: item.request_id });
        else if (item.state === "unknown") await rpc(db, "tw_clear_unresolved_result_objects", { p_request_id: item.request_id });
      }
      if (item.payload_key) {
        try {
          await env.GENERATED_ASSETS.delete(item.payload_key);
          await rpc(db, "tw_clear_payload_object", { p_request_id: item.request_id, p_object_key: item.payload_key });
        }
        catch { writeLog("storage.delete_failed", { request_id: item.request_id, object: "payload" }); }
      }
    }
  });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await app.fetch(request, env);
    if (response.status === 404 && env.ASSETS && !new URL(request.url).pathname.startsWith("/v1/")) {
      return env.ASSETS.fetch(request);
    }
    return response;
  },
  queue,
  scheduled: (controller: ScheduledController, env: Env, context: ExecutionContext) => {
    context.waitUntil(scheduled(controller, env));
  },
};

export default Sentry.withSentry((env: Env) => ({
  dsn: env.SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: env.SENTRY_DSN ? 0.05 : 0,
  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.headers) {
        for (const header of Object.keys(event.request.headers)) {
          if (["authorization", "cookie", "set-cookie"].includes(header.toLowerCase())) delete event.request.headers[header];
        }
      }
    }
    return event;
  },
}), worker);
