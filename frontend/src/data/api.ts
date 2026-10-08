import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../auth/supabase";

// Same-origin backend (the Worker serves /v1/* next to the site). The browser only
// holds the user's Supabase session token; pricing, ownership and balances are server-side.
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly requestId: string | null = null) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal | undefined; idempotencyKey?: string };

async function accessToken(): Promise<string> {
  if (!supabase) throw new ApiError(503, "auth_not_configured", "Sign-in is not configured.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, "authentication_required", "Your session has ended. Sign in again.");
  return token;
}

async function send(path: string, { method = "GET", body, signal, idempotencyKey }: RequestOptions, authenticated: boolean): Promise<Response> {
  const headers: Record<string, string> = {};
  if (authenticated) headers.authorization = `Bearer ${await accessToken()}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  let response: Response;
  try {
    response = await fetch(path, { method, headers, body: body === undefined ? null : JSON.stringify(body), signal: signal ?? null });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "network_error", "The service could not be reached. Check your connection and try again.");
  }
  if (!response.ok) {
    let payload: { error?: { code?: string; message?: string; request_id?: string } } = {};
    try { payload = await response.json() as typeof payload; } catch { /* Non-JSON error body. */ }
    throw new ApiError(response.status, payload.error?.code ?? "http_error",
      payload.error?.message ?? `The request failed (HTTP ${response.status}).`, payload.error?.request_id ?? null);
  }
  return response;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return await (await send(path, options, true)).json() as T;
}

export async function apiFetchPublic<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return await (await send(path, options, false)).json() as T;
}

export async function apiDownload(path: string, signal?: AbortSignal): Promise<{ blob: Blob; rows: number; truncated: boolean }> {
  const response = await send(path, { signal }, true);
  return { blob: await response.blob(), rows: Number(response.headers.get("x-export-rows") ?? "0"), truncated: response.headers.get("x-export-truncated") === "true" };
}

export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

export type Resource<T> = { data: T | null; error: string; loading: boolean; reload: () => void };

// Loads one endpoint, keeping the previous data visible while a reload is in flight.
export function useApiResource<T>(path: string | null, load: (path: string, signal: AbortSignal) => Promise<T> = (url, signal) => apiFetch<T>(url, { signal })): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [version, setVersion] = useState(0);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    loader.current(path, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(errorMessage(cause, "This information could not be loaded. Try again."));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [path, version]);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  return { data, error, loading, reload };
}

export * from "./apiModels";
