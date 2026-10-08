import { readBoundedBytes, readBoundedJson } from "./http-body.js";
import { z } from "zod";
import { HttpError } from "./errors.js";
import type { Env } from "./types.js";

const keySchema = z.object({
  id: z.string().min(1).max(80),
  groupId: z.string().min(1).max(80),
  key: z.string().min(8),
  enabled: z.boolean().default(true),
}).strict();

export type ProviderKey = z.infer<typeof keySchema>;

let roundRobin = 0;

function configuredProviderKeys(env: Env): ProviderKey[] {
  if (!env.GRSAI_KEYS_JSON) throw new HttpError(503, "provider_not_configured", "The model provider is not configured.");
  let raw: unknown;
  try {
    raw = JSON.parse(env.GRSAI_KEYS_JSON);
  } catch {
    throw new HttpError(503, "provider_not_configured", "The model provider is not configured.");
  }
  const parsed = z.array(keySchema).safeParse(raw);
  if (!parsed.success || new Set(parsed.data.map((item) => item.id)).size !== parsed.data.length) {
    throw new HttpError(503, "provider_not_configured", "The model provider is not configured.");
  }
  return parsed.data;
}

export function chooseProviderKey(env: Env, groupId: string, keyId?: string): ProviderKey {
  const candidates = configuredProviderKeys(env).filter((key) => key.groupId === groupId
    && (keyId ? key.id === keyId : key.enabled));
  if (!candidates.length) throw new HttpError(503, "provider_key_unavailable", "The model provider is not configured for this request.");
  if (keyId) return candidates[0]!;
  const selected = candidates[roundRobin % candidates.length]!;
  roundRobin = (roundRobin + 1) % Number.MAX_SAFE_INTEGER;
  return selected;
}

export function providerBaseUrl(env: Env): string {
  let url: URL;
  try {
    url = new URL(env.GRSAI_BASE_URL ?? "https://grsaiapi.com");
  } catch {
    throw new HttpError(503, "provider_not_configured", "The model provider is not configured.");
  }
  if (url.protocol !== "https:" || !["grsaiapi.com", "grsai.dakka.com.cn"].includes(url.hostname) || url.pathname !== "/") {
    throw new HttpError(503, "provider_not_configured", "The model provider is not configured.");
  }
  return url.origin;
}

// Text endpoints (chat completions and responses) share one adapter. timeoutMs 0 means
// no total deadline: streamed responses are bounded by an idle timeout while reading.
export async function submitText(env: Env, key: ProviderKey, path: "/v1/chat/completions" | "/v1/responses",
  body: Record<string, unknown>, timeoutMs = 110_000): Promise<Response> {
  return fetch(`${providerBaseUrl(env)}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${key.key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    ...(timeoutMs > 0 ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
  });
}

export type ProviderMediaResult = {
  id: string;
  status: string;
  results?: Array<{ url: string }>;
  duration?: number;
};

export async function submitMedia(
  env: Env,
  key: ProviderKey,
  model: string,
  input: Record<string, unknown>,
): Promise<ProviderMediaResult> {
  const response = await fetch(`${providerBaseUrl(env)}/v1/api/generate`, {
    method: "POST",
    headers: { authorization: `Bearer ${key.key}`, "content-type": "application/json" },
    body: JSON.stringify({ ...input, model, replyType: "json", async: true }),
    signal: AbortSignal.timeout(110_000),
  });
  if (!response.ok) {
    // Match chat: 5xx/408 may have been accepted; 429 and other 4xx were refused.
    const ambiguous = response.status >= 500 || response.status === 408;
    throw new HttpError(ambiguous ? 503 : 400, ambiguous ? "provider_rejected_ambiguous" : "provider_rejected",
      "The model provider rejected the request.");
  }
  const value: unknown = await readBoundedJson(response, 1_048_576);
  const parsed = z.object({
    id: z.string().min(1).max(200),
    status: z.string().min(1).max(64),
    results: z.array(z.object({ url: z.string().url() }).strict()).optional(),
    duration: z.number().positive().optional(),
  }).passthrough().safeParse(value);
  if (!parsed.success) throw new HttpError(503, "provider_response_invalid", "The model provider returned an unreadable response.");
  return {
    id: parsed.data.id,
    status: parsed.data.status,
    ...(parsed.data.results === undefined ? {} : { results: parsed.data.results }),
    ...(parsed.data.duration === undefined ? {} : { duration: parsed.data.duration }),
  };
}

export async function pollMedia(env: Env, key: ProviderKey, providerRequestId: string): Promise<ProviderMediaResult> {
  const url = new URL(`${providerBaseUrl(env)}/v1/api/result`);
  url.searchParams.set("id", providerRequestId);
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${key.key}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error("provider_poll_failed");
  const value: unknown = await readBoundedJson(response, 1_048_576);
  const parsed = z.object({
    id: z.string().min(1).max(200).optional(),
    status: z.string().min(1).max(64),
    results: z.array(z.object({ url: z.string().url() }).strict()).optional(),
    duration: z.number().positive().optional(),
  }).passthrough().safeParse(value);
  if (!parsed.success) throw new Error("provider_result_invalid");
  return {
    id: parsed.data.id ?? providerRequestId,
    status: parsed.data.status,
    ...(parsed.data.results === undefined ? {} : { results: parsed.data.results }),
    ...(parsed.data.duration === undefined ? {} : { duration: parsed.data.duration }),
  };
}

export function resultHosts(env: Env): Set<string> {
  return new Set((env.DOWNLOAD_HOST_ALLOWLIST ?? "file1.aitohumanize.com")
    .split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
}

export async function fetchProviderResult(env: Env, source: string, maxBytes: number): Promise<{
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
  bytes: number;
  getBytes(): number;
}> {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new HttpError(502, "provider_result_url_invalid", "The provider returned an invalid result.");
  }
  if (url.protocol !== "https:" || !resultHosts(env).has(url.hostname.toLowerCase()) || (url.port && url.port !== "443") || url.username || url.password) {
    throw new HttpError(502, "provider_result_url_blocked", "The provider returned an unsupported result location.");
  }
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(90_000) });
  if (!response.ok || !response.body || response.status >= 300) throw new HttpError(502, "provider_result_download_failed", "The generated result could not be retrieved.");
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0]!.toLowerCase();
  if (!/^(image\/(png|jpeg|webp)|video\/(mp4|webm))$/.test(contentType)) {
    throw new HttpError(502, "provider_result_type_unsupported", "The provider returned an unsupported file type.");
  }
  const bytes = Number(response.headers.get("content-length") ?? 0);
  if (bytes > maxBytes) throw new HttpError(413, "provider_result_too_large", "The generated result exceeds the configured size limit.");
  // R2.put rejects streams of unknown length. A declared length is enforced exactly by
  // FixedLengthStream; otherwise the body is buffered up to the remaining byte budget.
  if (bytes > 0) {
    let total = 0;
    const body = response.body.pipeThrough(new FixedLengthStream(bytes)).pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) { total += chunk.byteLength; controller.enqueue(chunk); },
    }));
    return { body, contentType, bytes, getBytes: () => total };
  }
  const buffered = await readBoundedBytes(response, maxBytes);
  return { body: buffered, contentType, bytes: buffered.byteLength, getBytes: () => buffered.byteLength };
}
