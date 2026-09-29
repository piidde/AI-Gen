export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const databaseErrors: Record<string, { status: number; message: string }> = {
  service_paused: { status: 503, message: "Generation is temporarily unavailable." },
  model_unavailable: { status: 404, message: "The requested model is unavailable." },
  pricing_unavailable: { status: 503, message: "Pricing is not configured for this model." },
  provider_budget_unconfigured: { status: 503, message: "The provider spending limit is not configured." },
  provider_budget_exhausted: { status: 503, message: "The provider spending limit has been reached." },
  insufficient_credits: { status: 402, message: "There are not enough credits for this request." },
  concurrency_limit: { status: 429, message: "Too many requests are already running for this account." },
  account_suspended: { status: 403, message: "This account cannot make requests." },
  account_not_found: { status: 404, message: "The account was not found." },
  account_suspension_blocked: { status: 409, message: "Resolve the account balance or payment dispute before restoring access." },
  api_key_revoked: { status: 401, message: "The API key is invalid or revoked." },
  invalid_idempotency_key: { status: 400, message: "Idempotency-Key must be between 8 and 128 characters." },
  idempotency_conflict: { status: 409, message: "This Idempotency-Key was already used with different input." },
  request_out_of_model_bounds: { status: 400, message: "The request exceeds the configured limits for this model." },
  usage_unavailable: { status: 503, message: "The provider did not return billable usage." },
  usage_exceeds_reservation: { status: 503, message: "Provider usage exceeded the reserved maximum." },
  request_not_found: { status: 404, message: "The request was not found." },
  result_not_ready: { status: 409, message: "The result is not ready yet." },
  result_expired: { status: 410, message: "The result has expired." },
  purchase_offer_unavailable: { status: 404, message: "This purchase offer is unavailable." },
  checkout_quote_expired: { status: 409, message: "This checkout quote has expired. Start a new purchase." },
  checkout_already_completed: { status: 409, message: "This checkout has already completed. Check your payment history for the confirmed purchase." },
  checkout_quote_mismatch: { status: 400, message: "The payment does not match its purchase quote." },
  checkout_state_invalid: { status: 409, message: "The payment is not in a creditable state." },
  invalid_refund_amount: { status: 400, message: "The refund amount is invalid." },
  payment_not_reversible: { status: 409, message: "The payment cannot be reversed in its current state." },
  reason_required: { status: 400, message: "A reason between 3 and 500 characters is required." },
  invalid_result_ttl: { status: 400, message: "Result retention must be between 1 and 48 hours." },
  invalid_key_name: { status: 400, message: "Key name must be between 1 and 60 characters." },
};

export function mapDatabaseError(message: string): HttpError {
  const known = databaseErrors[message];
  if (known) return new HttpError(known.status, message, known.message);
  return new HttpError(503, "database_unavailable", "The service could not complete this request.");
}

export function safeErrorMessage(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  return new HttpError(500, "internal_error", "The service could not complete this request.");
}
