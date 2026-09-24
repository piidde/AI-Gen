import type { UsageRequest } from "../data/viewModels";
import { requestNetCredits } from "../data/usageDemo";
import { formatLocalTime } from "./formatting";

export function safeRequestError(request: UsageRequest): { code: string; message: string; advice: string } | null {
  if (!request.error) return null;
  switch (request.error.code) {
    case "POLICY_REJECTED": return { code: "POLICY_REJECTED", message: "Request rejected by policy.", advice: "Review the request against the applicable policy. Check the separate billing status." };
    case "GENERATION_FAILED": return { code: "GENERATION_FAILED", message: "Generation could not be completed.", advice: "Check the billing status and contact support with this request ID if needed." };
    default: return { code: "UNKNOWN_ERROR", message: "Error details are unavailable.", advice: "Contact support with this request ID for clarification." };
  }
}

export function requestSupportDetails(request: UsageRequest): string {
  const error = safeRequestError(request);
  return ["Fictional demo request", `Request: ${request.id}`, `Started (UTC): ${new Date(request.startedAt).toISOString()}`,
    `Started (local): ${formatLocalTime(request.startedAt)}`,
    `Model: ${request.modelId}`, `Outcome: ${request.outcome}`, `Billing: ${request.billing.status}`,
    `Net credits: ${requestNetCredits(request) ?? "Unavailable"}`,
    ...(error ? [`Error: ${error.code}`, `Message: ${error.message}`] : [])].join("\n");
}
