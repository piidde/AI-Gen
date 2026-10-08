import { z } from "zod";
import type { AppContext } from "./auth.js";
import { database, rpc, type RpcClient } from "./database.js";
import { HttpError } from "./errors.js";
import { readBoundedJson } from "./http-body.js";
import { chooseProviderKey, submitText, type ProviderKey } from "./provider.js";
import { hex, hmacSha256, requireConfiguredInt, stableJson } from "./security.js";
import type { Env } from "./types.js";
import { estimatedInputTokens, validateChat, validateResponses, type ChatRequest } from "./validation.js";

export type TextModel = {
  id: string; capability: string; provider_group_id: string;
  max_input_tokens: number | null; max_output_tokens: number | null; responses_api: boolean;
};
type Usage = { input: number; output: number };
type Reservation = { request_id: string; state: string; duplicate: boolean };

const encoder = new TextEncoder();
const STREAM_IDLE_MS = 120_000;

export function writeLog(event: string, fields: Record<string, string | number | boolean | null> = {}): void {
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...fields }));
}

async function findTextModel(env: Env, id: string, responses: boolean): Promise<TextModel> {
  const models = await rpc<TextModel[]>(database(env), "tw_list_models");
  const model = models.find((item) => item.id === id && item.capability === "text");
  if (!model) throw new HttpError(404, "model_unavailable", "The requested model is unavailable.");
  if (responses && !model.responses_api) {
    throw new HttpError(400, "responses_api_unavailable", "This model supports chat completions only. Use a coding model (GPT) for /v1/responses.");
  }
  return model;
}

// Omitted or oversized limits use the model ceiling; the reservation always covers it.
function outputLimit(model: TextModel, requested: number | null): number {
  const ceiling = model.max_output_tokens ?? 1;
  return Math.min(requested ?? ceiling, ceiling);
}

async function reserve(c: AppContext, model: TextModel, key: ProviderKey, payload: unknown, items: number,
  maxOutput: number, idempotencyKey: string | null): Promise<Reservation> {
  const account = c.get("account");
  const inputTokens = estimatedInputTokens(payload, items);
  if (model.max_input_tokens !== null && inputTokens > model.max_input_tokens) {
    throw new HttpError(413, "input_too_large", "The input exceeds this model's context window.");
  }
  const requestHash = hex(await hmacSha256(c.env.IDEMPOTENCY_HMAC_SECRET, stableJson(payload)));
  return rpc<Reservation>(database(c.env), "tw_reserve_generation", {
    p_account_id: account.id, p_api_key_id: account.apiKeyId, p_model_id: model.id,
    p_idempotency_key: idempotencyKey, p_request_hash: `\\x${requestHash}`, p_kind: "text",
    p_input_tokens: inputTokens, p_output_tokens: maxOutput, p_units: null, p_payload_object_key: null,
    p_provider_key_id: key.id,
  });
}

async function storedResult(env: Env, accountId: string, requestId: string): Promise<unknown> {
  const manifest = await rpc<{ kind?: string }>(database(env), "tw_get_result", { p_account_id: accountId, p_request_id: requestId });
  if (manifest.kind !== "chat" && manifest.kind !== "responses") throw new HttpError(409, "result_type_mismatch", "This request does not contain a text result.");
  const object = await env.GENERATED_ASSETS.get(`results/${requestId}/response.json`);
  if (!object) throw new HttpError(410, "result_expired", "The saved result is no longer available.");
  return JSON.parse(await object.text()) as unknown;
}

async function duplicateResult(c: AppContext, reservation: Reservation): Promise<unknown> {
  if (reservation.state === "succeeded") return storedResult(c.env, c.get("account").id, reservation.request_id);
  if (reservation.state === "expired") throw new HttpError(410, "result_expired", "The saved result is no longer available.");
  throw new HttpError(409, "idempotent_request_exists", "This request is already in progress or has an unresolved provider outcome.");
}

function fail(db: RpcClient, requestId: string, category: string, ambiguous: boolean) {
  return rpc(db, "tw_fail_generation", { p_request_id: requestId, p_error_category: category, p_ambiguous: ambiguous });
}

// Stores the complete provider response and settles from its reported usage. A lost
// settlement response is retried once (the RPC is idempotent); anything else leaves the
// request unresolved rather than guessing a charge.
async function storeAndSettle(env: Env, db: RpcClient, requestId: string, kind: "chat" | "responses", body: unknown, usage: Usage): Promise<void> {
  const bytes = encoder.encode(JSON.stringify(body));
  if (bytes.byteLength > requireConfiguredInt(env.MAX_RESULT_BYTES, 268_435_456)) {
    await fail(db, requestId, "provider_response_too_large", true);
    throw new HttpError(502, "provider_response_too_large", "The provider response exceeds the configured size limit.");
  }
  const objectKey = `results/${requestId}/response.json`;
  const settle = () => rpc(db, "tw_settle_generation", {
    p_request_id: requestId, p_input_tokens: usage.input, p_output_tokens: usage.output, p_units: null,
    p_result_manifest: { kind }, p_result_object_keys: [objectKey],
  });
  try {
    await env.GENERATED_ASSETS.put(objectKey, bytes, { httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" } });
    try { await settle(); } catch (cause) {
      if (cause instanceof HttpError && cause.code === "usage_exceeds_reservation") throw cause;
      await settle();
    }
  } catch (cause) {
    const exceeded = cause instanceof HttpError && cause.code === "usage_exceeds_reservation";
    await fail(db, requestId, exceeded ? "usage_exceeds_reservation" : "settlement_failed", true);
    writeLog("generation.settlement_unknown", { request_id: requestId });
    throw new HttpError(503, "settlement_outcome_unknown", "The response could not be safely settled. Check the request status before retrying.");
  }
}

// Shared handling of a refused or failed provider call before any output was produced.
async function upstreamFailure(db: RpcClient, requestId: string, model: string, key: ProviderKey, status: number | null, started: number): Promise<never> {
  // 429 and other 4xx mean the provider refused before generating.
  const ambiguous = status === null || status >= 500 || status === 408;
  await fail(db, requestId, status === null ? "provider_timeout_or_disconnect" : ambiguous ? "provider_rejection_ambiguous" : "provider_rejected", ambiguous);
  writeLog(ambiguous ? "generation.unknown" : "generation.failed", { request_id: requestId, model, provider_key_id: key.id, provider_status: status, duration_ms: Date.now() - started });
  throw ambiguous
    ? new HttpError(503, "provider_outcome_unknown", "The provider outcome is unclear; this request will not be resubmitted automatically.")
    : new HttpError(502, "provider_rejected", "The provider rejected this request.");
}

async function callUpstream(env: Env, key: ProviderKey, path: "/v1/chat/completions" | "/v1/responses", body: Record<string, unknown>,
  db: RpcClient, requestId: string, model: string, started: number, timeoutMs?: number): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await submitText(env, key, path, body, timeoutMs);
  } catch {
    return upstreamFailure(db, requestId, model, key, null, started);
  }
  if (!upstream.ok) return upstreamFailure(db, requestId, model, key, upstream.status, started);
  return upstream;
}

async function readUsageJson<T>(env: Env, db: RpcClient, requestId: string, upstream: Response,
  usageOf: (body: unknown) => Usage | null): Promise<{ body: T; usage: Usage }> {
  let body: unknown;
  try {
    body = await readBoundedJson(upstream, requireConfiguredInt(env.MAX_TEXT_RESULT_BYTES, 8_388_608));
  } catch (cause) {
    await fail(db, requestId, cause instanceof HttpError ? cause.code : "provider_response_invalid", true);
    throw new HttpError(503, "provider_outcome_unknown", "The provider response could not be safely stored. The request will not be resubmitted.");
  }
  const usage = usageOf(body);
  if (!usage) {
    await fail(db, requestId, "provider_usage_missing", true);
    throw new HttpError(503, "provider_usage_unavailable", "The provider response did not contain verifiable usage.");
  }
  return { body: body as T, usage };
}

const count = z.number().int().nonnegative();
export function chatUsage(body: unknown): Usage | null {
  const parsed = z.object({ choices: z.array(z.unknown()).min(1), usage: z.object({ prompt_tokens: count, completion_tokens: count }).passthrough() })
    .passthrough().safeParse(body);
  return parsed.success ? { input: parsed.data.usage.prompt_tokens, output: parsed.data.usage.completion_tokens } : null;
}

export function responsesUsage(body: unknown): Usage | null {
  const parsed = z.object({ status: z.literal("completed"), usage: z.object({ input_tokens: count, output_tokens: count }).passthrough() })
    .passthrough().safeParse(body);
  return parsed.success ? { input: parsed.data.usage.input_tokens, output: parsed.data.usage.output_tokens } : null;
}

const sseHeaders = (requestId: string, gateway: string) => ({
  "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no",
  "x-request-id": gateway, "x-takewing-request-id": requestId,
});

type PreparedChat = { model: TextModel; key: ProviderKey; maxOutput: number; requestId: string; duplicate: unknown | null; duplicateFound: boolean };

// Validation, pricing and the credit reservation happen before any response bytes are
// sent, so refusals (credits, limits, model) stay ordinary HTTP errors for streams too.
async function prepareChat(c: AppContext, request: ChatRequest, idempotencyKey: string | null): Promise<PreparedChat> {
  const model = await findTextModel(c.env, request.model, false);
  const maxOutput = outputLimit(model, request.requestedMaxTokens);
  const key = chooseProviderKey(c.env, model.provider_group_id);
  const payload = { model: request.model, messages: request.messages, options: request.options, max: request.requestedMaxTokens };
  const reservation = await reserve(c, model, key, payload, request.messages.length, maxOutput, idempotencyKey);
  return { model, key, maxOutput, requestId: reservation.request_id, duplicateFound: reservation.duplicate,
    duplicate: reservation.duplicate ? await duplicateResult(c, reservation) : null };
}

async function executeChat(c: AppContext, request: ChatRequest, prepared: PreparedChat): Promise<unknown> {
  if (prepared.duplicateFound) return prepared.duplicate;
  const { model, key, maxOutput, requestId } = prepared;
  const db = database(c.env);
  const started = Date.now();
  const upstream = await callUpstream(c.env, key, "/v1/chat/completions",
    { model: request.model, messages: request.messages, max_tokens: maxOutput, stream: false, ...request.options },
    db, requestId, model.id, started);
  const { body, usage } = await readUsageJson(c.env, db, requestId, upstream, chatUsage);
  await storeAndSettle(c.env, db, requestId, "chat", body, usage);
  writeLog("generation.succeeded", { request_id: requestId, model: model.id, provider_key_id: key.id,
    input_tokens: usage.input, output_tokens: usage.output, duration_ms: Date.now() - started });
  return body;
}

// The provider's chat streaming is unreliable for GPT models (no data within 90 s on
// 2026-10-08), so streamed chat is served from one verified, billed completion and
// re-emitted as OpenAI chunks. Keep-alives hold the connection open meanwhile.
export function chatCompletionChunks(body: unknown, includeUsage: boolean): string[] {
  const completion = body as { id?: string; created?: number; model?: string; usage?: unknown;
    choices?: Array<{ index?: number; message?: { role?: string; content?: string | null }; finish_reason?: string | null }> };
  const base = { id: completion.id ?? "chatcmpl", object: "chat.completion.chunk", created: completion.created ?? Math.floor(Date.now() / 1000), model: completion.model };
  const choices = completion.choices ?? [];
  const chunks = [
    { ...base, choices: choices.map((choice, index) => ({ index: choice.index ?? index, delta: { role: "assistant", content: choice.message?.content ?? "" }, finish_reason: null })) },
    { ...base, choices: choices.map((choice, index) => ({ index: choice.index ?? index, delta: {}, finish_reason: choice.finish_reason ?? "stop" })) },
    ...(includeUsage ? [{ ...base, choices: [], usage: completion.usage }] : []),
  ];
  return [...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), "data: [DONE]\n\n"];
}

export async function handleChat(c: AppContext, raw: unknown, idempotencyKey: string | null): Promise<Response> {
  const request = validateChat(raw);
  const prepared = await prepareChat(c, request, idempotencyKey);
  if (!request.stream) {
    const body = await executeChat(c, request, prepared);
    return new Response(JSON.stringify(body), { headers: { "content-type": "application/json; charset=utf-8",
      "x-request-id": c.get("requestId"), "x-takewing-request-id": prepared.requestId, "cache-control": "no-store" } });
  }
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const write = (text: string) => writer.write(encoder.encode(text)).catch(() => undefined);
  const work = (async () => {
    void write(": ok\n\n");
    const ping = setInterval(() => void write(": keep-alive\n\n"), 10_000);
    try {
      const body = await executeChat(c, request, prepared);
      for (const chunk of chatCompletionChunks(body, request.includeUsage)) await write(chunk);
    } catch (cause) {
      const error = cause instanceof HttpError ? cause : new HttpError(500, "internal_error", "The service could not complete this request.");
      await write(`data: ${JSON.stringify({ error: { message: error.message, type: error.status >= 500 ? "server_error" : "invalid_request_error", code: error.code, request_id: c.get("requestId") } })}\n\n`);
    } finally {
      clearInterval(ping);
      await writer.close().catch(() => undefined);
    }
  })();
  c.executionCtx.waitUntil(work);
  return new Response(readable, { headers: sseHeaders(prepared.requestId, c.get("requestId")) });
}

// Incremental SSE framing: events end with a blank line; lines may arrive split.
export class SseParser {
  private buffer = "";
  push(text: string): Array<{ event: string | null; data: string }> {
    this.buffer += text.replace(/\r\n/g, "\n");
    const events: Array<{ event: string | null; data: string }> = [];
    let index: number;
    while ((index = this.buffer.indexOf("\n\n")) !== -1) {
      const block = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 2);
      let event: string | null = null;
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length) events.push({ event, data: data.join("\n") });
    }
    return events;
  }
}

// Outcome of a streamed response: the final response object only from response.completed.
export function streamedOutcome(events: Array<{ data: string }>): { completed: unknown | null; failed: boolean } {
  let completed: unknown | null = null;
  let failed = false;
  for (const { data } of events) {
    if (data === "[DONE]") continue;
    let parsed: { type?: string; response?: unknown };
    try { parsed = JSON.parse(data) as typeof parsed; } catch { continue; }
    if (parsed.type === "response.completed") completed = parsed.response ?? null;
    else if (parsed.type === "response.failed" || parsed.type === "response.incomplete" || parsed.type === "error") failed = true;
  }
  return { completed, failed };
}

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([reader.read(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("idle_timeout")), STREAM_IDLE_MS); })]);
  } finally {
    clearTimeout(timer);
  }
}

export async function handleResponses(c: AppContext, raw: unknown, idempotencyKey: string | null): Promise<Response> {
  const request = validateResponses(raw);
  const model = await findTextModel(c.env, request.model, true);
  const maxOutput = outputLimit(model, request.requestedMaxTokens);
  const key = chooseProviderKey(c.env, model.provider_group_id);
  const reservation = await reserve(c, model, key, { ...request.body, max: request.requestedMaxTokens }, request.itemCount, maxOutput, idempotencyKey);
  const jsonHeaders = (id: string) => ({ "content-type": "application/json; charset=utf-8", "x-request-id": c.get("requestId"), "x-takewing-request-id": id, "cache-control": "no-store" });
  if (reservation.duplicate) return new Response(JSON.stringify(await duplicateResult(c, reservation)), { headers: jsonHeaders(reservation.request_id) });
  const db = database(c.env);
  const requestId = reservation.request_id;
  const started = Date.now();
  const upstreamBody = { ...request.body, max_output_tokens: maxOutput, stream: request.stream };
  if (!request.stream) {
    const upstream = await callUpstream(c.env, key, "/v1/responses", upstreamBody, db, requestId, model.id, started);
    const { body, usage } = await readUsageJson(c.env, db, requestId, upstream, responsesUsage);
    await storeAndSettle(c.env, db, requestId, "responses", body, usage);
    writeLog("generation.succeeded", { request_id: requestId, model: model.id, provider_key_id: key.id, input_tokens: usage.input, output_tokens: usage.output, duration_ms: Date.now() - started });
    return new Response(JSON.stringify(body), { headers: jsonHeaders(requestId) });
  }
  // Streamed: forward provider events unchanged while reading them for the final usage.
  // Reading continues after a client disconnect so the request is still settled.
  const upstream = await callUpstream(c.env, key, "/v1/responses", upstreamBody, db, requestId, model.id, started, 0);
  if (!upstream.body) await upstreamFailure(db, requestId, model.id, key, null, started);
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let clientOpen = true;
  const forward = async (chunk: Uint8Array) => {
    if (!clientOpen) return;
    try { await writer.write(chunk); } catch { clientOpen = false; }
  };
  const work = (async () => {
    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    const limit = requireConfiguredInt(c.env.MAX_RESULT_BYTES, 268_435_456);
    let completed: unknown | null = null;
    let failed = false;
    let broken = false;
    let total = 0;
    try {
      while (true) {
        const { done, value } = await readChunk(reader);
        if (done) break;
        total += value.byteLength;
        if (total > limit) throw new Error("stream_too_large");
        await forward(value);
        const outcome = streamedOutcome(parser.push(decoder.decode(value, { stream: true })));
        completed = outcome.completed ?? completed;
        failed ||= outcome.failed;
      }
    } catch {
      broken = true;
      try { await reader.cancel(); } catch { /* Already closed. */ }
    }
    const usage = completed ? responsesUsage(completed) : null;
    try {
      if (usage && !broken) {
        await storeAndSettle(c.env, db, requestId, "responses", completed, usage);
        writeLog("generation.succeeded", { request_id: requestId, model: model.id, provider_key_id: key.id, input_tokens: usage.input, output_tokens: usage.output, duration_ms: Date.now() - started, streamed: true });
      } else {
        // Partial output may already have been billed upstream; never guess a charge.
        await fail(db, requestId, broken ? "provider_stream_interrupted" : failed ? "provider_stream_failed" : "provider_usage_missing", true);
        writeLog("generation.unknown", { request_id: requestId, model: model.id, provider_key_id: key.id, duration_ms: Date.now() - started, streamed: true });
      }
    } catch {
      writeLog("generation.settlement_unknown", { request_id: requestId, streamed: true });
    } finally {
      await writer.close().catch(() => undefined);
    }
  })();
  c.executionCtx.waitUntil(work);
  return new Response(readable, { headers: sseHeaders(requestId, c.get("requestId")) });
}
