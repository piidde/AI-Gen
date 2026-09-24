import type { UsageRequest } from "../data/viewModels";
import { requestNetCredits } from "../data/usageDemo";
import { formatLocalTime } from "./formatting";
import { safeRequestError } from "./supportDetails";

function cell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  // Spreadsheet programs can recognize formulas after whitespace/control characters.
  if (/^[\s\u0000-\u001f\u007f-\u009f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function usageCsv(requests: UsageRequest[]): string {
  const headers = ["request_id", "started_at_utc", "started_at_local", "timezone", "completed_at_utc", "model_id", "model_name", "key_id", "key_name", "outcome", "duration_ms", "input_tokens", "output_tokens", "cached_input_tokens", "image_count", "billing_status", "charged_credits", "refunded_credits", "net_credits", "rate_version", "error_code", "error_message"];
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return [headers.map(cell).join(","), ...requests.map(request => {
    const billing = request.billing;
    const error = safeRequestError(request);
    return [request.id, new Date(request.startedAt).toISOString(), formatLocalTime(request.startedAt), timezone,
      request.completedAt === null ? null : new Date(request.completedAt).toISOString(), request.modelId, request.modelName,
      request.keyId, request.keyName, request.outcome, request.durationMs, request.inputTokens, request.outputTokens,
      request.cachedInputTokens, request.imageCount, billing.status,
      billing.status === "charged" ? billing.credits : billing.status === "refunded" ? billing.chargedCredits : billing.status === "not-charged" ? "0" : null,
      billing.status === "refunded" ? billing.refundedCredits : null, requestNetCredits(request),
      "rateVersion" in billing ? billing.rateVersion : null, error?.code ?? null, error?.message ?? null].map(cell).join(",");
  })].join("\r\n");
}
