export interface Env extends Cloudflare.Env {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  GRSAI_BASE_URL?: string;
  GRSAI_KEYS_JSON?: string;
  PAYLOAD_ENCRYPTION_KEY?: string;
  IDEMPOTENCY_HMAC_SECRET?: string;
  DOWNLOAD_HOST_ALLOWLIST?: string;
  PUBLIC_SITE_URL?: string;
  ADMIN_USER_IDS?: string;
  SENTRY_DSN?: string;
}

export type QueueBatch = MessageBatch;

export type AuthenticatedAccount = {
  id: string;
  authType: "api_key" | "user";
  apiKeyId: string | null;
};

export type StoredMedia = {
  objectKey: string;
  contentType: string;
  bytes: number;
};
