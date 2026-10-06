import { HttpError } from "./errors.js";

const encoder = new TextEncoder();

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function hmacSha256(secret: string | undefined, value: string): Promise<Uint8Array> {
  if (!secret || encoder.encode(secret).byteLength < 32) {
    throw new HttpError(503, "idempotency_not_configured", "The request integrity key is not configured.");
  }
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  let raw: Uint8Array;
  try {
    raw = fromBase64Url(secret);
  } catch {
    throw new HttpError(503, "payload_encryption_not_configured", "Media jobs are not configured.");
  }
  if (raw.byteLength !== 32) {
    throw new HttpError(503, "payload_encryption_not_configured", "Media jobs are not configured.");
  }
  const keyBytes = new Uint8Array(raw);
  return crypto.subtle.importKey("raw", keyBytes.buffer as ArrayBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptPayload(secret: string | undefined, value: unknown): Promise<Uint8Array> {
  if (!secret) throw new HttpError(503, "payload_encryption_not_configured", "Media jobs are not configured.");
  const key = await encryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(value)));
  const payload = new Uint8Array(12 + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), 12);
  return payload;
}

export async function decryptPayload(secret: string | undefined, value: Uint8Array): Promise<unknown> {
  if (!secret || value.byteLength < 29) throw new HttpError(503, "payload_unavailable", "The queued job payload is unavailable.");
  const key = await encryptionKey(secret);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: value.slice(0, 12) }, key, value.slice(12));
  return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
}

export function newApiKey(): string {
  return `tw_live_${base64Url(crypto.getRandomValues(new Uint8Array(32)))}`;
}

export function formatCredits(micros: number | string | null | undefined): string {
  const amount = BigInt(micros ?? 0);
  const sign = amount < 0 ? "-" : "";
  const absolute = amount < 0 ? -amount : amount;
  const whole = absolute / 1_000_000n;
  const fraction = (absolute % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function formatUsdMicros(micros: number | string | null | undefined): string {
  return `$${formatCredits(micros)}`;
}

export function requireConfiguredInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new HttpError(503, "invalid_configuration", "The backend configuration is invalid.");
  return parsed;
}
