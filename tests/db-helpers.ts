import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
export const ADMIN = "00000000-0000-4000-8000-0000000000aa";
export const ALICE = "00000000-0000-4000-8000-000000000001";
export const BOB = "00000000-0000-4000-8000-000000000002";

// Supabase provides these roles and auth.users; the migrations only reference them.
const supabaseStubs = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth; create table auth.users (id uuid primary key);
  grant usage on schema public to anon, authenticated, service_role;
  insert into auth.users(id) values ('${ALICE}'), ('${BOB}'), ('${ADMIN}');
`;

export type Db = PGlite;

// A fresh in-memory database with every migration applied in order.
export async function freshDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(supabaseStubs);
  for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(file, migrationsDir), "utf8"));
  }
  return db;
}

// Run as the role PostgREST uses for service-key RPC calls.
export async function rpc<T = any>(db: Db, fn: string, ...args: unknown[]): Promise<T> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
  await db.exec("set role service_role");
  try {
    const result = await db.query<{ r: T }>(`select public.${fn}(${placeholders}) as r`, args);
    return result.rows[0]!.r;
  } finally {
    await db.exec("reset role");
  }
}

export async function rpcError(db: Db, fn: string, ...args: unknown[]): Promise<string> {
  try { await rpc(db, fn, ...args); } catch (error) { return (error as Error).message; }
  throw new Error(`${fn} unexpectedly succeeded`);
}

export const hash = (value: string) => new TextEncoder().encode(value);

export async function row<T = any>(db: Db, sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<T>(sql, params);
  return result.rows[0]!;
}

// Open the service for business: provider budget, markup 2.0x, one text and one image model.
export async function configureCatalog(db: Db, budgetMicros = 100_000_000_000n): Promise<void> {
  await rpc(db, "tw_admin_configure_provider", ADMIN, "test setup", "grsai-default", true, budgetMicros.toString(), 20000, true, 2);
  const schema = JSON.stringify({ type: "object", properties: { prompt: { type: "string" } } });
  // Text: 1_000_000 / 2_000_000 provider micros per million tokens.
  await rpc(db, "tw_admin_configure_model", ADMIN, "test setup", "gpt-5.5", true, "tokens", "1000000", "2000000", null, null, 100000, 8000, null, schema, "test source");
  // Image: 40_000 provider micros per image, up to 4.
  await rpc(db, "tw_admin_configure_model", ADMIN, "test setup", "nano-banana-2", true, "request", null, null, "40000", null, null, null, 4, schema, "test source");
}

export async function credit(db: Db, account: string, micros: bigint, key = `credit-${account}-${micros}`): Promise<void> {
  await rpc(db, "tw_ensure_account", account);
  await rpc(db, "tw_admin_adjust_credits", ADMIN, "test funding", account, micros.toString(), key);
}

export function reserveText(db: Db, account: string, key: string | null, requestHash = "h1", input = 1000, output = 1000) {
  return rpc(db, "tw_reserve_generation", account, null, "gpt-5.5", key, hash(requestHash), "text", input, output, null, null, "key-1");
}

export function reserveImage(db: Db, account: string, key: string | null, units = 2, requestHash = "h1") {
  return rpc(db, "tw_reserve_generation", account, null, "nano-banana-2", key, hash(requestHash), "image", null, null, units, `payloads/${key}`, "key-1");
}

// Every balance change must be explained by the ledger, and no balance may drift.
export async function assertLedgerMatchesBalances(db: Db): Promise<{ available: bigint; reserved: bigint }> {
  const rows = (await db.query<{ account_id: string; available: string; reserved: string; l_available: string; l_reserved: string }>(`
    select a.id as account_id, a.available_credits_micros::text as available, a.reserved_credits_micros::text as reserved,
      coalesce(sum(l.available_delta_micros),0)::text as l_available, coalesce(sum(l.reserved_delta_micros),0)::text as l_reserved
    from private.accounts a left join private.credit_ledger l on l.account_id=a.id group by a.id`)).rows;
  for (const r of rows) {
    if (r.available !== r.l_available || r.reserved !== r.l_reserved) {
      throw new Error(`ledger drift for ${r.account_id}: balance ${r.available}/${r.reserved}, ledger ${r.l_available}/${r.l_reserved}`);
    }
  }
  const group = await row<{ reserved: string; reserved_requests: string }>(db, `
    select g.reserved_micros::text as reserved,
      (select coalesce(sum(reserved_provider_micros),0)::text from private.generation_requests
        where provider_group_id=g.id and (state in ('queued','submitting','provider_pending')
          or (state='unknown' and reservation_released_at is null))) as reserved_requests
    from private.provider_groups g where g.id='grsai-default'`);
  if (group.reserved !== group.reserved_requests) throw new Error(`provider reservation drift ${group.reserved} vs ${group.reserved_requests}`);
  return { available: rows.reduce((n, r) => n + BigInt(r.available), 0n), reserved: rows.reduce((n, r) => n + BigInt(r.reserved), 0n) };
}
