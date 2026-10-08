import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./auth.js";
import { HttpError } from "./errors.js";
import { hex, sha256 } from "./security.js";

// Edge limits run before authentication or any database call, so a looping or abusive
// client cannot load Supabase. Thresholds are set in wrangler.jsonc (OD-011). Cloudflare
// counts per location and approximately; this is load protection, not a billing control.
export function rateLimit(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip");
    if (ip && !(await c.env.IP_RATE_LIMITER.limit({ key: ip })).success) throw limited();
    const bearer = c.req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    // Hashed so raw credentials never become rate-limit keys.
    if (bearer && !(await c.env.KEY_RATE_LIMITER.limit({ key: hex(await sha256(bearer)) })).success) throw limited();
    await next();
  };
}

function limited(): HttpError {
  return new HttpError(429, "rate_limited", "Too many requests. Wait a minute before retrying.");
}
