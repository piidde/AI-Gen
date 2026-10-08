import type { UsageRequest } from "../data/viewModels";
import { requestNetCredits, usd } from "./usage";
import { formatLocalTime } from "./formatting";

// Server error categories are short codes; only fixed explanations are shown, never provider text.
export function safeRequestError(request: UsageRequest): { code: string; message: string; advice: string } | null {
  if (!request.error) return null;
  const code = request.error.code;
  if (code === "provider_rejected") return { code, message: "The provider rejected this request.", advice: "Check the model parameters and input. Rejected requests are not charged." };
  if (request.outcome === "unknown") return { code, message: "The provider outcome could not be confirmed.", advice: "Do not resubmit automatically; the original request may still complete. Contact support with this request ID." };
  return { code, message: "Generation could not be completed.", advice: "Failed requests are not charged. Contact support with this request ID if the problem continues." };
}

export function requestSupportDetails(request: UsageRequest): string {
  const error = safeRequestError(request);
  return [`Request: ${request.id}`, `Started (UTC): ${new Date(request.startedAt).toISOString()}`,
    `Started (local): ${formatLocalTime(request.startedAt)}`,
    `Model: ${request.modelId}`, `Outcome: ${request.outcome}`, `Billing: ${request.billing.status}`,
    `Charged: ${requestNetCredits(request) === null ? "Unavailable" : usd(requestNetCredits(request)!)}`,
    ...(error ? [`Error: ${error.code}`, `Message: ${error.message}`] : [])].join("\n");
}
