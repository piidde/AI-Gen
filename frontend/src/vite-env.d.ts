/// <reference types="vite/client" />

// Browser-exposed configuration. Every value here ships in the client bundle,
// so none of them may ever hold a secret.
interface ImportMetaEnv {
  /** Supabase project URL. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (anon) key. Never the service_role key. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Enables the already-configured Discord sign-in button; never holds a secret. */
  readonly VITE_AUTH_DISCORD_ENABLED?: string;
  /** Canonical public origin, e.g. `https://takewing.ai`. */
  readonly VITE_SITE_ORIGIN?: string;
  /** `"true"` allows search indexing. Anything else keeps the site out. */
  readonly VITE_SITE_INDEXABLE?: string;
  /** Google Analytics 4 measurement ID, e.g. `G-XXXXXXX`. Unset disables it. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Google Ads conversion ID, e.g. `AW-XXXXXXX`. Unset disables it. */
  readonly VITE_ADS_CONVERSION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
