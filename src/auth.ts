import { createClient } from "@supabase/supabase-js";
import type { Context, MiddlewareHandler } from "hono";
import type { Env, AuthenticatedAccount } from "./types.js";
import type { RpcClient } from "./database.js";
import { database, rpc, asBytea } from "./database.js";
import { HttpError } from "./errors.js";
import { hex, sha256 } from "./security.js";

export type AppEnv = { Bindings: Env; Variables: { requestId: string; account: AuthenticatedAccount } };
export type AppContext = Context<AppEnv>;

export async function authenticateRequest(c: AppContext, db: RpcClient): Promise<AuthenticatedAccount> {
  const authorization = c.req.header("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) throw new HttpError(401, "authentication_required", "A valid API key or Supabase access token is required.");

  if (bearer.startsWith("tw_live_")) {
    const digest = hex(await sha256(bearer));
    const account = await rpc<{ account_id: string; key_id: string } | null>(db, "tw_authenticate_api_key", {
      p_secret_hash: asBytea(digest),
    });
    if (!account) throw new HttpError(401, "invalid_api_key", "The API key is invalid or revoked.");
    return { id: account.account_id, authType: "api_key", apiKeyId: account.key_id };
  }

  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_PUBLISHABLE_KEY) {
    throw new HttpError(503, "auth_not_configured", "Supabase Auth is not configured.");
  }
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data.user) throw new HttpError(401, "invalid_access_token", "The access token is invalid or expired.");
  return { id: data.user.id, authType: "user", apiKeyId: null };
}

export function requireAccount(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const account = await authenticateRequest(c as AppContext, database(c.env));
    c.set("account", account);
    await next();
  };
}

export function requireUser(c: AppContext): AuthenticatedAccount {
  const account = c.get("account");
  if (!account || account.authType !== "user") throw new HttpError(403, "user_auth_required", "Sign in to use this account management feature.");
  return account;
}

export function requestId(c: AppContext): string {
  return c.get("requestId");
}
