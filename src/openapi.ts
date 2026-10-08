type Schema = Record<string, unknown>;
const str = (minLength?: number, maxLength?: number): Schema => ({ type: "string", ...(minLength === undefined ? {} : { minLength }), ...(maxLength === undefined ? {} : { maxLength }) });
const integer = (minimum = 0, maximum?: number): Schema => ({ type: "integer", minimum, ...(maximum === undefined ? {} : { maximum }) });
const bool = { type: "boolean" };
const uuid = { type: "string", format: "uuid" };
const date = { type: "string", format: "date-time" };
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: "null" }] });
const micros = { type: "string", pattern: "^-?\\d+$", description: "Integer millionths of a USD-value credit; encoded as a string to preserve precision." };
const priceMicros = { type: "string", pattern: "^\\d{1,18}$" };
const decimal = { type: "string", pattern: "^-?\\d+(?:\\.\\d+)?$" };
const usdPrice = { type: "string", pattern: "^\\$-?\\d+(?:\\.\\d+)?$", description: "Formatted USD price, including the dollar sign." };
const object = (properties: Record<string, Schema>, required = Object.keys(properties), additionalProperties = false): Schema => ({ type: "object", properties, required, additionalProperties });
const array = (items: Schema): Schema => ({ type: "array", items });
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const data = (schema: Schema): Schema => object({ data: array(schema) });
const currency = { type: "string", enum: ["eur", "usd"] };
const capability = { type: "string", enum: ["text", "image", "video"] };
const state = { type: "string", enum: ["queued", "submitting", "provider_pending", "succeeded", "failed", "unknown", "expired"] };
const reason = str(3, 500);
const updated = object({ updated: { const: true } });
const accountSecurity = [{ takewingKey: [] }, { supabaseToken: [] }];
const userSecurity = [{ supabaseToken: [] }];
const keySecurity = [{ takewingKey: [] }];
const json = (schema: Schema) => ({ "application/json": { schema } });
const headers = { "X-Request-Id": { description: "Identifier for this HTTP request.", schema: uuid } };
const response = (description: string, schema: Schema) => ({ description, headers, content: json(schema) });
const idempotency = (required: boolean) => ({ in: "header", name: "Idempotency-Key", required, schema: str(8, 128), description: "Reuse for the same request only. A different input with the same key returns 409." });
const path = (name: string, schema: Schema = uuid) => ({ in: "path", name, required: true, schema });
const query = (name: string, schema: Schema, description?: string) => ({ in: "query", name, required: false, schema, ...(description ? { description } : {}) });
const period = query("period", { type: "string", enum: ["today", "7d", "30d", "6m", "1y", "all"] }, "UTC period; overview defaults to 30d, savings to all.");
const usageParameters = [query("from", date), query("to", date), query("model", str(1, 120)), query("key", uuid),
  query("outcome", { type: "string", enum: ["completed", "failed", "pending", "unknown"] }), query("search", str(0, 100), "Request ID prefix or model substring."),
  query("limit", integer(1, 100)), query("offset", integer(0, 100_000))];

const schemas: Record<string, Schema> = {
  Error: object({ error: object({ message: str(), type: { type: "string", enum: ["invalid_request_error", "server_error"] }, code: str(), request_id: uuid }, ["message", "code", "request_id"]) }),
  ChatRequest: {
    ...object({ model: str(1, 120), messages: { ...array(object({ role: { enum: ["system", "developer", "user", "assistant"] }, content: str(0, 250_000) })), minItems: 1, maxItems: 100 },
      max_tokens: integer(1, 100_000), max_completion_tokens: integer(1, 100_000), stream: { type: "boolean", description: "Only false is currently supported; true returns 501." },
      temperature: { type: "number", minimum: 0, maximum: 2 }, top_p: { type: "number", exclusiveMinimum: 0, maximum: 1 },
      stop: { anyOf: [str(0, 500), { ...array(str(0, 500)), maxItems: 4 }] }, seed: { type: "integer" } }, ["model", "messages"]),
    oneOf: [{ required: ["max_tokens"], not: { required: ["max_completion_tokens"] } }, { required: ["max_completion_tokens"], not: { required: ["max_tokens"] } }],
  },
  // The adapter validates only these provider fields. Additional provider fields are preserved.
  ChatCompletion: object({ choices: { ...array({}), minItems: 1 }, usage: object({ prompt_tokens: integer(), completion_tokens: integer() }, ["prompt_tokens", "completion_tokens"], true) }, ["choices", "usage"], true),
  GenerationRequest: object({ model: str(1, 120), input: { type: "object", additionalProperties: true, description: "Validated against this model's parameters from GET /v1/models. Remote reference URLs are disabled. Image count and video duration must stay within configured limits." } }),
  Generation: object({ id: uuid, object: { const: "generation" }, status: state, status_url: str(), result_url: str() }),
  MediaManifest: object({ kind: { const: "media" }, files: { ...array(object({ index: integer(0, 119), url: str(), content_type: str(), bytes: integer() })), maxItems: 120 } }),
  Request: object({ id: uuid, model: str(), capability, status: state, created_at: date, completed_at: nullable(date), error: nullable(str()), credits_micros: nullable(micros), result_expires_at: nullable(date), result_manifest: nullable({ anyOf: [ref("MediaManifest"), object({ kind: { const: "chat" } }, ["kind"], true)] }) }),
  Model: object({ id: str(), name: str(), capability, price_version: integer(1), pricing: object({ unit: str(), input_per_million: nullable(usdPrice), output_per_million: nullable(usdPrice), per_unit: nullable(usdPrice) }), parameters: { type: "object", additionalProperties: true } }),
  Credits: object({ available_credits: decimal, available_credits_micros: micros, reserved_credits: decimal, reserved_credits_micros: micros, currency: { const: "USD" }, suspended: bool }),
  Summary: object({ available_credits_micros: micros, reserved_credits_micros: micros, used_credits_micros: micros, available_credits: decimal, reserved_credits: decimal, used_credits: decimal,
    suspended: bool, request_count: integer(), completed_count: integer(), failed_count: integer(), currency: { const: "USD" } }, ["available_credits_micros", "reserved_credits_micros", "used_credits_micros", "available_credits", "reserved_credits", "used_credits", "suspended", "request_count", "completed_count", "failed_count"]),
  UsageRecord: object({ id: uuid, model: str(), model_name: str(), capability, status: state, outcome: { type: "string", enum: ["completed", "failed", "pending", "unknown"] }, created_at: date, completed_at: nullable(date),
    credits_micros: nullable(micros), credits: decimal, price_version: integer(1), error: nullable(str()), api_key_id: nullable(uuid), api_key_name: nullable(str()),
    input_tokens: nullable(integer()), output_tokens: nullable(integer()), units: nullable(integer()) }),
  UsageOverview: object({ from: nullable(date), timezone: { const: "UTC" },
    totals: object({ requests: integer(), completed: integer(), failed: integer(), pending: integer(), unknown: integer(), credits_micros: micros }),
    daily: array(object({ day: { type: "string", format: "date" }, requests: integer(), completed: integer(), failed: integer(), credits_micros: micros })),
    models: array(object({ model: str(), name: str(), requests: integer(), credits_micros: micros })) }),
  Savings: object({ from: nullable(date), currency: { const: "USD" }, compared_requests: integer(), excluded_not_settled: integer(), excluded_no_reference: integer(),
    official_micros: micros, charged_micros: micros, saved_micros: micros }),
  Preferences: object({ low_balance_enabled: bool, threshold_micros: nullable(micros), product_updates: bool, last_alert_at: nullable(date) }),
  PreferencesUpdate: object({ low_balance_enabled: bool, threshold_micros: nullable({ type: "string", pattern: "^[1-9]\\d{0,15}$" }), product_updates: bool }),
  BillingProfile: object({ kind: nullable({ enum: ["personal", "business"] }), name: nullable(str(0, 120)), company: nullable(str(0, 160)), address_line1: nullable(str(0, 160)), address_line2: nullable(str(0, 160)),
    city: nullable(str(0, 100)), postal_code: nullable(str(0, 20)), region: nullable(str(0, 100)), country_code: nullable({ type: "string", pattern: "^[A-Za-z]{2}$" }), vat_id: nullable(str(0, 32)) }),
  Status: object({ checked_at: date, updated_at: nullable(date), incidents: array(object({ id: uuid, title: str(), impact: str(), service: str(), model_ids: array(str()),
    timeline: array(object({ at: date, message: str() })), started_at: date, updated_at: date, resolved_at: nullable(date) })) }),
  ApiKey: object({ id: uuid, name: str(), prefix: str(), created_at: date, last_used_at: nullable(date), revoked_at: nullable(date) }, ["id", "name", "prefix", "created_at"]),
  CreatedApiKey: object({ id: uuid, name: str(), prefix: str(), created_at: date, secret: str() }),
  Offer: object({ id: str(), currency, amount_minor: integer(1), credits_micros: micros, credits: decimal, price_version: integer(1) }),
  Payment: object({ id: uuid, offer_id: str(), currency, amount_minor: integer(1), credits_micros: micros, credits: decimal, status: str(), created_at: date }),
  CheckoutRequest: object({ offer_id: str(1, 80), currency }),
  Checkout: object({ checkout_url: { type: "string", format: "uri" }, quote_id: uuid }),
  AccountInspection: object({ id: uuid, suspended: bool, available_credits_micros: micros, reserved_credits_micros: micros, request_count: integer(), unknown_requests: integer(), api_keys: array(ref("ApiKey")) }),
  CreditAdjustment: object({ account_id: uuid, available_credits_micros: micros, duplicate: bool, suspended: bool }, ["account_id", "available_credits_micros", "duplicate"]),
  ModelSettings: object({ reason, enabled: bool, source_note: str(5, 500), unit: nullable({ enum: ["tokens", "request", "second"] }), input_micros: nullable(priceMicros), output_micros: nullable(priceMicros), unit_micros: nullable(priceMicros),
    markup_bps: nullable({ type: "string", pattern: "^\\d{5,7}$" }), max_input_tokens: nullable(integer(1, 1_000_000)), max_output_tokens: nullable(integer(1, 100_000)), max_units: nullable(integer(1, 120)), parameter_schema: { type: "object", additionalProperties: true, description: "Supported subset: type, enum, required, properties, items, additionalProperties, string/number/array bounds, description, title. Required for enabled models." } }),
  OperationsSummary: object({ accepting_requests: bool, result_ttl_hours: integer(1, 48), markup_bps: nullable(integer(10_000)), active_accounts: integer(), active_keys: integer(), requests_24h: integer(), completed_24h: integer(), failed_24h: integer(),
    customer_charge_24h_micros: micros, provider_cost_24h_micros: micros, unknown_requests: integer(), unresolved_reservations: integer(), queued_requests: integer(), oldest_queued_seconds: integer(), models: integer(),
    provider_groups: array(object({ id: str(), enabled: bool, budget_limit_micros: micros, spent_micros: micros, reserved_micros: micros })),
    model_usage_24h: array(object({ model: str(), requests: integer(), succeeded: integer(), customer_micros: micros, provider_micros: micros })),
    paid_amounts_24h: array(object({ currency, amount_minor: micros })) }),
  AdminModel: object({ id: str(), name: str(), capability, enabled: bool, provider_model_id: str(), current_price_version: nullable(integer(1)), price_verified_at: nullable(date), max_input_tokens: nullable(integer(1)), max_output_tokens: nullable(integer(1)), max_units: nullable(integer(1)) }),
  Operations: object({ summary: ref("OperationsSummary"), models: array(ref("AdminModel")) }),
};

type OperationOptions = { security?: Record<string, string[]>[]; parameters?: Record<string, unknown>[]; body?: Schema; success?: Record<string, { description: string; headers: Record<string, unknown>; content: Record<string, unknown> }>; description?: string };
function operation(operationId: string, summary: string, schema: Schema, options: OperationOptions = {}) {
  return {
    operationId, summary, ...(options.description ? { description: options.description } : {}), security: options.security ?? accountSecurity,
    ...(options.parameters ? { parameters: options.parameters } : {}),
    ...(options.body ? { requestBody: { required: true, content: json(options.body) } } : {}),
    responses: { ...(options.success ?? { "200": response("Successful response", schema) }), default: response("Request rejected or service unavailable. See error.code; never blindly resubmit a potentially billable generation.", ref("Error")) },
  };
}

export function createOpenApiDocument(origin: string) {
  return {
    openapi: "3.1.0", info: { title: "Takewing API", version: "1.0.0", description: "Prepaid AI API. Credit amounts are USD-value credits; micros are integer millionths. Generation requires a Takewing API key; management requires a Supabase login. Admin routes also require ADMIN_USER_IDS allowlisting. Results expire after the configured retention period and then return 410." },
    servers: [{ url: origin }],
    components: { securitySchemes: {
      takewingKey: { type: "http", scheme: "bearer", description: "Takewing API key, displayed once at creation." },
      supabaseToken: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Supabase access token. Administrator operations additionally enforce the user-ID allowlist." },
      stripeSignature: { type: "apiKey", in: "header", name: "Stripe-Signature", description: "Stripe signature over the unmodified request body; verified with the webhook secret." },
    }, schemas },
    paths: {
      "/healthz": { get: operation("health", "Worker liveness (not a dependency check)", object({ status: { const: "ok" } }), { security: [] }) },
      "/v1/openapi.json": { get: operation("openapi", "Read this API contract", { type: "object", additionalProperties: true }, { security: [] }) },
      "/v1/models": { get: operation("models", "List enabled and priced models", object({ object: { const: "list" }, data: array(ref("Model")) }), { security: [] }) },
      "/v1/chat/completions": { post: operation("chatCompletion", "Create a non-streaming chat completion", ref("ChatCompletion"), { security: keySecurity, parameters: [idempotency(false)], body: ref("ChatRequest"), success: { "200": { ...response("Complete provider response with verified usage", ref("ChatCompletion")), headers: { ...headers, "X-Takewing-Request-Id": { description: "Generation ID used for status and result retrieval.", schema: uuid } } }, "501": response("stream=true is not enabled", ref("Error")) } }) },
      "/v1/generations": { post: operation("createGeneration", "Create an asynchronous image or video job", ref("Generation"), { security: keySecurity, parameters: [idempotency(true)], body: ref("GenerationRequest"), success: { "202": response("New or existing pending generation", ref("Generation")), "200": response("Existing completed generation", ref("Generation")) } }) },
      "/v1/requests/{id}": { get: operation("requestStatus", "Read an owned generation status", ref("Request"), { parameters: [path("id")] }) },
      "/v1/requests/{id}/result": { get: operation("requestResult", "Retrieve a retained result", { anyOf: [ref("ChatCompletion"), ref("MediaManifest")] }, { parameters: [path("id")], success: { "200": response("Stored complete text response or media manifest", { anyOf: [ref("ChatCompletion"), ref("MediaManifest")] }), "409": response("Result not ready", ref("Error")), "410": response("Result expired", ref("Error")) } }) },
      "/v1/files/{requestId}/{index}": { get: operation("downloadFile", "Stream an owned retained file", {}, { parameters: [path("requestId"), path("index", integer(0, 119))], success: { "200": { description: "Authenticated binary download", headers, content: { "application/octet-stream": { schema: { type: "string", format: "binary" } }, "image/*": { schema: { type: "string", format: "binary" } }, "video/*": { schema: { type: "string", format: "binary" } } } }, "410": response("Result expired", ref("Error")) } }) },
      "/v1/credits": { get: operation("credits", "Read available and reserved credits", ref("Credits")) },
      "/v1/dashboard/summary": { get: operation("dashboardSummary", "Read account aggregates", ref("Summary")) },
      "/v1/usage": { get: operation("usage", "Read summary and a filtered page of requests (newest first)", object({ summary: ref("Summary"), total: integer(), limit: integer(1, 100), offset: integer(), data: array(ref("UsageRecord")) }), { parameters: usageParameters }) },
      "/v1/usage/export.csv": { get: operation("usageExport", "Download filtered usage as CSV (up to 5000 rows)", {}, { security: userSecurity, parameters: usageParameters, success: { "200": { description: "CSV; X-Export-Truncated reports whether rows were omitted", headers, content: { "text/csv": { schema: { type: "string" } } } } } }) },
      "/v1/usage/overview": { get: operation("usageOverview", "Read period totals, UTC daily series and top models", ref("UsageOverview"), { parameters: [period] }) },
      "/v1/dashboard/savings": { get: operation("savings", "Compare settled charges with operator-entered official prices", ref("Savings"), { parameters: [period] }) },
      "/v1/account/preferences": { get: operation("preferences", "Read notification preferences", ref("Preferences"), { security: userSecurity }), put: operation("savePreferences", "Save notification preferences", ref("Preferences"), { security: userSecurity, body: ref("PreferencesUpdate") }) },
      "/v1/account/billing-profile": { get: operation("billingProfile", "Read billing details", ref("BillingProfile"), { security: userSecurity }), put: operation("saveBillingProfile", "Save billing details", ref("BillingProfile"), { security: userSecurity, body: ref("BillingProfile") }) },
      "/v1/status": { get: operation("status", "Published incidents (open and resolved within 7 days)", ref("Status"), { security: [] }) },
      "/v1/api-keys": { get: operation("listKeys", "List owned key metadata", data(ref("ApiKey")), { security: userSecurity }), post: operation("createKey", "Create a display-once API key", ref("CreatedApiKey"), { security: userSecurity, body: object({ name: str(1, 60) }), success: { "201": response("Secret is returned only on creation", ref("CreatedApiKey")) } }) },
      "/v1/api-keys/{id}": { delete: operation("revokeKey", "Revoke an owned API key", object({ id: uuid, revoked: { const: true } }), { security: userSecurity, parameters: [path("id")] }) },
      "/v1/billing/offers": { get: operation("offers", "Read active top-up offers", data(ref("Offer")), { security: userSecurity }) },
      "/v1/billing/payments": { get: operation("payments", "Read payment history", data(ref("Payment")), { security: userSecurity }) },
      "/v1/billing/payments/{id}/receipt": { get: operation("paymentReceipt", "Read the Stripe receipt link for a confirmed owned payment", object({ receipt_url: { type: "string", format: "uri" } }), { security: userSecurity, parameters: [path("id")] }) },
      "/v1/billing/checkout": { post: operation("checkout", "Create or resume a Stripe Checkout session", ref("Checkout"), { security: userSecurity, parameters: [idempotency(true)], body: ref("CheckoutRequest"), success: { "201": response("New Checkout session", ref("Checkout")), "200": response("Existing open Checkout session", ref("Checkout")) } }) },
      "/stripe/webhook": { post: operation("stripeWebhook", "Process a signed Stripe event", object({ received: { const: true } }), { security: [{ stripeSignature: [] }], body: object({ id: str(), type: str(), data: object({ object: {} }, ["object"], true) }, ["id", "type", "data"], true), description: "Send the exact Stripe-signed body. Successful acknowledgement also covers ignored event types; duplicate financial events never grant credits twice." }) },
      "/v1/internal/admin-check": { get: operation("adminCheck", "Check whether account has administrator access", object({ authorized: bool })) },
      "/v1/internal/ops": { get: operation("operations", "Administrator operational overview", ref("Operations"), { security: userSecurity }) },
      "/v1/internal/controls": { post: operation("controls", "Pause requests or change future retention", updated, { security: userSecurity, body: object({ reason, accepting_requests: bool, result_ttl_hours: integer(1, 48) }, ["reason", "accepting_requests"]) }) },
      "/v1/internal/accounts/{id}": { get: operation("inspectAccount", "Administrator account inspection", ref("AccountInspection"), { security: userSecurity, parameters: [path("id")] }) },
      "/v1/internal/accounts/{id}/suspension": { post: operation("suspendAccount", "Audited account suspension or restoration", updated, { security: userSecurity, parameters: [path("id")], body: object({ reason, suspended: bool }) }) },
      "/v1/internal/accounts/{id}/credits": { post: operation("adjustCredits", "Audited credit adjustment", ref("CreditAdjustment"), { security: userSecurity, parameters: [path("id"), idempotency(true)], body: object({ reason, delta_micros: { type: "string", pattern: "^-?\\d{1,18}$", not: { enum: ["0", "-0"] } } }) }) },
      "/v1/internal/api-keys/{id}/revoke": { post: operation("adminRevokeKey", "Audited key revocation", object({ revoked: bool }), { security: userSecurity, parameters: [path("id")], body: object({ reason }) }) },
      "/v1/internal/provider": { post: operation("configureProvider", "Configure provider budget and platform controls", updated, { security: userSecurity, body: object({ reason, group_id: str(1, 80), enabled: bool, budget_limit_micros: priceMicros, markup_bps: integer(10_000, 1_000_000), accepting_requests: bool, result_ttl_hours: integer(1, 48) }) }) },
      "/v1/internal/models/{id}": { post: operation("configureModel", "Configure model price version and validated limits", object({ model: str(), version: integer(1), enabled: bool }), { security: userSecurity, parameters: [path("id", str())], body: ref("ModelSettings") }) },
      "/v1/internal/models/{id}/official-prices": { post: operation("configureOfficialPrices", "Set official reference prices for the current price version (savings only)", object({ model: str(), version: integer(1) }), { security: userSecurity, parameters: [path("id", str())], body: object({ reason, source_note: str(5, 500), input_micros: nullable(priceMicros), output_micros: nullable(priceMicros), unit_micros: nullable(priceMicros) }) }) },
      "/v1/internal/incidents": { post: operation("publishIncident", "Publish or update an incident with a timeline message", object({ id: uuid, updated: { const: true } }), { security: userSecurity, body: object({ reason, id: nullable(uuid), title: nullable(str(3, 160)), impact: nullable(str(3, 2000)), service: nullable(str(2, 80)), model_ids: nullable(array(str(1, 120))), message: str(3, 1000), resolved: bool }) }) },
      "/v1/internal/offers": { post: operation("configureOffer", "Configure an audited credit purchase offer", updated, { security: userSecurity, body: object({ reason, id: str(1, 80), currency, amount_minor: integer(1, 2_147_483_647), credits_micros: priceMicros, active: bool }) }) },
    },
  };
}
