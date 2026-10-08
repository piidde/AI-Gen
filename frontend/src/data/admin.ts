import { useEffect, useState } from "react";
import { apiFetch, errorMessage, type Micros } from "./api";

// Administrator-only views of /v1/internal. The backend re-checks ADMIN_USER_IDS on
// every call; hiding the navigation entry is only a convenience.

export type OpsSummaryDto = {
  accepting_requests: boolean; result_ttl_hours: number; markup_bps: number | null; max_concurrent_per_account: number;
  active_accounts: number; active_keys: number; in_flight_requests: number; requests_1h: number; requests_24h: number;
  completed_24h: number; failed_24h: number; customer_charge_24h_micros: Micros; provider_cost_24h_micros: Micros;
  unknown_requests: number; unresolved_reservations: number; queued_requests: number; oldest_queued_seconds: number; models: number;
  provider_groups: { id: string; enabled: boolean; budget_limit_micros: Micros | null; spent_micros: Micros; reserved_micros: Micros }[];
  model_usage_24h: { model: string; requests: number; succeeded: number; customer_micros: Micros; provider_micros: Micros }[];
};

export type AdminModelDto = {
  id: string; name: string; capability: "text" | "image" | "video"; enabled: boolean; current_price_version: number | null;
  price_verified_at: string | null; max_input_tokens: number | null; max_output_tokens: number | null; max_units: number | null;
  unit: "tokens" | "request" | "second" | null; input_micros: Micros | null; output_micros: Micros | null; unit_micros: Micros | null;
  markup_bps: string | null; source_note: string | null; parameter_schema: Record<string, unknown>; responses_api: boolean;
};

export type AdminOfferDto = { id: string; currency: "eur" | "usd"; amount_minor: number; credits_micros: Micros; active: boolean; price_version: number };

export type OpsDto = { summary: OpsSummaryDto; models: AdminModelDto[]; offers: AdminOfferDto[] };

export type AdminRequestDto = {
  id: string; created_at: string; completed_at: string | null; account_id: string; api_key_prefix: string | null;
  model: string; capability: "text" | "image" | "video"; state: string; error_category: string | null;
  input_tokens: number | null; output_tokens: number | null; units: number; reserved_micros: Micros;
  charged_micros: Micros | null; provider_micros: Micros | null; duration_ms: number | null;
};

// "2.0" <-> 20000 basis points; markups are bounded to 1x-100x by the backend.
export function bpsToMultiplier(bps: number | string | null): string {
  return bps === null ? "" : (Number(bps) / 10_000).toString();
}

export function multiplierToBps(input: string): number | null {
  const match = /^\s*(\d{1,3})(?:[.,](\d{1,4}))?\s*$/.exec(input);
  if (!match) return null;
  const bps = Number(match[1]) * 10_000 + Number((match[2] ?? "").padEnd(4, "0"));
  return bps >= 10_000 && bps <= 1_000_000 ? bps : null;
}

// Re-runs a loader on an interval while the page is visible, keeping the last data.
export function usePolling(reload: () => void, intervalMs: number, paused: boolean): void {
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") reload(); }, intervalMs);
    return () => window.clearInterval(timer);
  }, [reload, intervalMs, paused]);
}

export type Mutation = { pending: boolean; error: string; done: string; run: (path: string, body: unknown, done: string) => Promise<boolean>; reset: () => void };

// One audited POST at a time; the caller reloads the affected data after success.
export function useMutation(): Mutation {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  async function run(path: string, body: unknown, message: string): Promise<boolean> {
    setPending(true); setError(""); setDone("");
    try {
      await apiFetch(path, { method: "POST", body });
      setDone(message);
      return true;
    } catch (cause) {
      setError(errorMessage(cause, "The change could not be saved. Reload to check the current state."));
      return false;
    } finally {
      setPending(false);
    }
  }
  return { pending, error, done, run, reset: () => { setError(""); setDone(""); } };
}
