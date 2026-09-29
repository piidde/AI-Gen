import { createClient } from "@supabase/supabase-js";
import type { Env } from "./types.js";
import { mapDatabaseError, HttpError } from "./errors.js";

export type RpcClient = {
  rpc(name: string, args?: Record<string, unknown>): Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
};

export function database(env: Env): RpcClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(503, "database_not_configured", "The backend database is not configured.");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }) as unknown as RpcClient;
}

export async function rpc<T>(db: RpcClient, name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw mapDatabaseError(error.message);
  return data as T;
}

export function asBytea(hex: string): string {
  return `\\x${hex}`;
}
