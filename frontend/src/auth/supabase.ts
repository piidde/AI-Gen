import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabasePublishableKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

// This only controls whether the Discord option is rendered. Provider credentials
// stay exclusively in Supabase Auth settings and must never be browser variables.
export const isDiscordSignInEnabled =
  String(import.meta.env.VITE_AUTH_DISCORD_ENABLED ?? "")
    .trim()
    .toLowerCase() === "true";

export const SUPABASE_CONFIG_ERROR =
  "Supabase Auth ist noch nicht konfiguriert. Bitte die VITE_SUPABASE_* Werte setzen.";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
