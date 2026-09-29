-- Takewing's first backend schema. Model and billing controls are deliberately
-- disabled until live provider behavior, costs, and commercial terms are verified.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table private.app_control (
  singleton boolean primary key default true check (singleton),
  accepting_requests boolean not null default false,
  markup_bps bigint check (markup_bps is null or markup_bps between 10000 and 1000000),
  result_ttl_hours integer not null default 2 check (result_ttl_hours between 1 and 48),
  max_concurrent_per_account integer not null default 3 check (max_concurrent_per_account between 1 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into private.app_control(singleton) values (true) on conflict do nothing;

create table private.provider_groups (
  id text primary key,
  enabled boolean not null default false,
  budget_limit_micros bigint check (budget_limit_micros is null or budget_limit_micros >= 0),
  spent_micros bigint not null default 0 check (spent_micros >= 0),
  reserved_micros bigint not null default 0 check (reserved_micros >= 0),
  updated_at timestamptz not null default now()
);
insert into private.provider_groups(id) values ('grsai-default') on conflict do nothing;

create table private.models (
  id text primary key,
  display_name text not null,
  capability text not null check (capability in ('text', 'image', 'video')),
  provider_model_id text not null,
  provider_group_id text not null references private.provider_groups(id),
  enabled boolean not null default false,
  current_price_version integer,
  parameter_schema jsonb not null default '{}'::jsonb,
  max_request_bytes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.model_prices (
  model_id text not null references private.models(id),
  version integer not null check (version > 0),
  unit text not null check (unit in ('tokens', 'request', 'second')),
  provider_input_micros_per_million bigint,
  provider_output_micros_per_million bigint,
  provider_micros_per_unit bigint,
  markup_bps bigint,
  max_input_tokens integer,
  max_output_tokens integer,
  max_units integer,
  verified_at timestamptz,
  verified_by text,
  source_note text,
  created_at timestamptz not null default now(),
  primary key(model_id, version),
  check (provider_input_micros_per_million is null or provider_input_micros_per_million >= 0),
  check (provider_output_micros_per_million is null or provider_output_micros_per_million >= 0),
  check (provider_micros_per_unit is null or provider_micros_per_unit >= 0),
  check (markup_bps is null or markup_bps between 10000 and 1000000),
  check (max_input_tokens is null or max_input_tokens > 0),
  check (max_output_tokens is null or max_output_tokens > 0),
  check (max_units is null or max_units > 0)
);
alter table private.models add constraint models_current_price_fk
  foreign key (id, current_price_version) references private.model_prices(model_id, version)
  deferrable initially deferred;

-- This is the current provider-listed catalogue snapshot only. It is not an
-- enablement, compatibility, or price assertion. No price rows are seeded.
insert into private.models(id, display_name, capability, provider_model_id, provider_group_id) values
  ('minimax-h3', 'MiniMax H3', 'video', 'minimax-h3', 'grsai-default'),
  ('gpt-image-2.5', 'GPT Image 2.5', 'image', 'gpt-image-2.5', 'grsai-default'),
  ('gpt-image-2.5-sunburst', 'GPT Image 2.5 Sunburst', 'image', 'gpt-image-2.5-sunburst', 'grsai-default'),
  ('gpt-image-2.5-flare', 'GPT Image 2.5 Flare', 'image', 'gpt-image-2.5-flare', 'grsai-default'),
  ('gpt-image-2-vip', 'GPT Image 2 VIP', 'image', 'gpt-image-2-vip', 'grsai-default'),
  ('gpt-image-2', 'GPT Image 2', 'image', 'gpt-image-2', 'grsai-default'),
  ('nano-banana-pro', 'Nano Banana Pro', 'image', 'nano-banana-pro', 'grsai-default'),
  ('nano-banana-2-lite', 'Nano Banana 2 Lite', 'image', 'nano-banana-2-lite', 'grsai-default'),
  ('nano-banana-2', 'Nano Banana 2', 'image', 'nano-banana-2', 'grsai-default'),
  ('nano-banana-fast', 'Nano Banana Fast', 'image', 'nano-banana-fast', 'grsai-default'),
  ('nano-banana-2-cl', 'Nano Banana 2 CL', 'image', 'nano-banana-2-cl', 'grsai-default'),
  ('nano-banana-pro-cl', 'Nano Banana Pro CL', 'image', 'nano-banana-pro-cl', 'grsai-default'),
  ('nano-banana-2-2k-cl', 'Nano Banana 2 2K CL', 'image', 'nano-banana-2-2k-cl', 'grsai-default'),
  ('nano-banana-pro-4k-vip', 'Nano Banana Pro 4K VIP', 'image', 'nano-banana-pro-4k-vip', 'grsai-default'),
  ('nano-banana-pro-vip', 'Nano Banana Pro VIP', 'image', 'nano-banana-pro-vip', 'grsai-default'),
  ('nano-banana-2-4k-cl', 'Nano Banana 2 4K CL', 'image', 'nano-banana-2-4k-cl', 'grsai-default'),
  ('gpt-6-astra', 'GPT 6 Astra', 'text', 'gpt-6-astra', 'grsai-default'),
  ('gpt-5.6-terra', 'GPT 5.6 Terra', 'text', 'gpt-5.6-terra', 'grsai-default'),
  ('gpt-5.6-sol', 'GPT 5.6 Sol', 'text', 'gpt-5.6-sol', 'grsai-default'),
  ('gpt-5.5', 'GPT 5.5', 'text', 'gpt-5.5', 'grsai-default'),
  ('gemini-3.5-flash', 'Gemini 3.5 Flash', 'text', 'gemini-3.5-flash', 'grsai-default'),
  ('gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite', 'text', 'gemini-3.1-flash-lite', 'grsai-default'),
  ('gemini-3.5-flash-lite', 'Gemini 3.5 Flash Lite', 'text', 'gemini-3.5-flash-lite', 'grsai-default'),
  ('gemini-3.7-flash', 'Gemini 3.7 Flash', 'text', 'gemini-3.7-flash', 'grsai-default'),
  ('gemini-3.8-flash', 'Gemini 3.8 Flash', 'text', 'gemini-3.8-flash', 'grsai-default'),
  ('gemini-3.1-pro', 'Gemini 3.1 Pro', 'text', 'gemini-3.1-pro', 'grsai-default'),
  ('gemini-3-flash', 'Gemini 3 Flash', 'text', 'gemini-3-flash', 'grsai-default'),
  ('gemini-3-pro', 'Gemini 3 Pro', 'text', 'gemini-3-pro', 'grsai-default'),
  ('gemini-2.5-flash', 'Gemini 2.5 Flash', 'text', 'gemini-2.5-flash', 'grsai-default'),
  ('gemini-2.5-pro', 'Gemini 2.5 Pro', 'text', 'gemini-2.5-pro', 'grsai-default')
on conflict (id) do nothing;

create table private.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  suspended boolean not null default false,
  available_credits_micros bigint not null default 0,
  reserved_credits_micros bigint not null default 0 check (reserved_credits_micros >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.api_keys (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references private.accounts(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  prefix text not null,
  secret_hash bytea not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index api_keys_account_created on private.api_keys(account_id, created_at desc);

create table private.generation_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references private.accounts(id),
  api_key_id uuid references private.api_keys(id),
  model_id text not null,
  price_version integer not null,
  capability text not null check (capability in ('text', 'image', 'video')),
  state text not null check (state in ('queued', 'submitting', 'provider_pending', 'succeeded', 'failed', 'unknown', 'expired')),
  idempotency_key text,
  idempotency_expires_at timestamptz,
  request_hash bytea not null,
  estimated_input_tokens integer not null default 0,
  reserved_output_tokens integer not null default 0,
  reserved_units integer not null default 0,
  reserved_customer_micros bigint not null,
  reserved_provider_micros bigint not null,
  customer_markup_bps bigint not null check (customer_markup_bps between 10000 and 1000000),
  actual_customer_micros bigint,
  actual_provider_micros bigint,
  input_tokens integer,
  output_tokens integer,
  actual_units integer,
  provider_request_id text,
  provider_key_id text,
  provider_group_id text not null references private.provider_groups(id),
  payload_object_key text,
  result_manifest jsonb,
  result_object_keys jsonb not null default '[]'::jsonb,
  result_expires_at timestamptz,
  reservation_released_at timestamptz,
  error_category text,
  poll_after timestamptz,
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (model_id, price_version) references private.model_prices(model_id, version)
);
create unique index generation_idempotency_unique
  on private.generation_requests(account_id, capability, idempotency_key)
  where idempotency_key is not null;
create index generation_idempotency_expiry on private.generation_requests(idempotency_expires_at)
  where idempotency_expires_at is not null;
create index generation_account_recent on private.generation_requests(account_id, created_at desc);
create index generation_recovery on private.generation_requests(state, created_at);
create index generation_created_at on private.generation_requests(created_at desc);
create index generation_expiry on private.generation_requests(result_expires_at)
  where result_expires_at is not null;

create table private.credit_ledger (
  id bigint generated always as identity primary key,
  account_id uuid not null references private.accounts(id),
  request_id uuid references private.generation_requests(id),
  purchase_id uuid,
  event_key text not null unique,
  entry_type text not null check (entry_type in ('reserve', 'settlement', 'release', 'purchase', 'refund', 'dispute', 'dispute_reversal', 'adjustment')),
  available_delta_micros bigint not null,
  reserved_delta_micros bigint not null,
  amount_micros bigint not null check (amount_micros >= 0),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index credit_ledger_account_recent on private.credit_ledger(account_id, created_at desc);

create table private.purchase_offers (
  id text not null,
  currency text not null check (currency in ('eur', 'usd')),
  amount_minor integer not null check (amount_minor > 0),
  credits_micros bigint not null check (credits_micros > 0),
  active boolean not null default false,
  price_version integer not null default 1,
  primary key(id, currency)
);

create table private.stripe_quotes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references private.accounts(id),
  offer_id text not null,
  currency text not null,
  amount_minor integer not null,
  credits_micros bigint not null,
  price_version integer not null,
  state text not null default 'created' check (state in ('created', 'checkout_open', 'paid', 'expired', 'refunded', 'disputed', 'dispute_won', 'dispute_lost')),
  idempotency_key text not null,
  stripe_session_id text unique,
  payment_intent_id text unique,
  refunded_amount_minor integer not null default 0 check (refunded_amount_minor >= 0),
  expires_at timestamptz not null default now() + interval '35 minutes',
  created_at timestamptz not null default now(),
  foreign key (offer_id, currency) references private.purchase_offers(id, currency)
);
create unique index stripe_quotes_idempotency on private.stripe_quotes(account_id,idempotency_key);
alter table private.credit_ledger add constraint credit_ledger_purchase_fk
  foreign key (purchase_id) references private.stripe_quotes(id);

create table private.stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create table private.audit_log (
  id bigint generated always as identity primary key,
  actor uuid not null,
  action text not null,
  subject text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table private.admin_adjustment_keys (
  actor uuid not null,
  idempotency_key text not null,
  account_id uuid not null references private.accounts(id),
  delta_micros bigint not null,
  reason text not null,
  balance_after_micros bigint not null,
  created_at timestamptz not null default now(),
  primary key(actor,idempotency_key)
);

create or replace function public.tw_ensure_account(p_account_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  insert into private.accounts(id) values (p_account_id) on conflict do nothing;
end $$;

create or replace function public.tw_authenticate_api_key(p_secret_hash bytea)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_key private.api_keys%rowtype;
begin
  update private.api_keys k set last_used_at = now()
  where k.secret_hash = p_secret_hash and k.revoked_at is null
  returning k.* into v_key;
  if not found then return null; end if;
  return jsonb_build_object('account_id', v_key.account_id, 'key_id', v_key.id, 'name', v_key.name);
end $$;

create or replace function public.tw_create_api_key(p_account_id uuid, p_name text, p_prefix text, p_secret_hash bytea)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_key private.api_keys%rowtype;
begin
  if length(trim(p_name)) not between 1 and 60 then raise exception 'invalid_key_name'; end if;
  perform public.tw_ensure_account(p_account_id);
  insert into private.api_keys(account_id, name, prefix, secret_hash)
  values (p_account_id, trim(p_name), p_prefix, p_secret_hash) returning * into v_key;
  return jsonb_build_object('id', v_key.id, 'name', v_key.name, 'prefix', v_key.prefix, 'created_at', v_key.created_at);
end $$;

create or replace function public.tw_list_api_keys(p_account_id uuid)
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name, 'prefix', k.prefix,
    'created_at', k.created_at, 'last_used_at', k.last_used_at, 'revoked_at', k.revoked_at)
    order by k.created_at desc), '[]'::jsonb)
  from private.api_keys k where k.account_id = p_account_id
$$;

create or replace function public.tw_revoke_api_key(p_account_id uuid, p_key_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.api_keys set revoked_at = coalesce(revoked_at, now())
    where id = p_key_id and account_id = p_account_id;
  return found;
end $$;

create or replace function public.tw_list_models()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'name', m.display_name, 'capability', m.capability,
    'prices', jsonb_build_object(
      'input_micros_per_million', case when p.provider_input_micros_per_million is null then null else ceil(p.provider_input_micros_per_million::numeric * coalesce(p.markup_bps, c.markup_bps) / 10000)::bigint::text end,
      'output_micros_per_million', case when p.provider_output_micros_per_million is null then null else ceil(p.provider_output_micros_per_million::numeric * coalesce(p.markup_bps, c.markup_bps) / 10000)::bigint::text end,
      'unit_micros', case when p.provider_micros_per_unit is null then null else ceil(p.provider_micros_per_unit::numeric * coalesce(p.markup_bps, c.markup_bps) / 10000)::bigint::text end,
    'unit', p.unit), 'price_version', p.version, 'parameters', m.parameter_schema,
    'provider_group_id', m.provider_group_id)
    order by m.capability, m.display_name), '[]'::jsonb)
  from private.models m
  join private.model_prices p on p.model_id = m.id and p.version = m.current_price_version
  cross join private.app_control c
  join private.provider_groups g on g.id = m.provider_group_id and g.enabled
  where m.enabled and c.accepting_requests and coalesce(p.markup_bps, c.markup_bps) between 10000 and 1000000
    and p.verified_at is not null
    and ((m.capability = 'text' and p.unit = 'tokens' and p.provider_input_micros_per_million is not null and p.provider_output_micros_per_million is not null and p.max_input_tokens is not null and p.max_output_tokens is not null)
      or (m.capability in ('image', 'video') and p.unit in ('request', 'second') and p.provider_micros_per_unit is not null and p.max_units is not null))
$$;

create or replace function public.tw_reserve_generation(
  p_account_id uuid, p_api_key_id uuid, p_model_id text, p_idempotency_key text,
  p_request_hash bytea, p_kind text, p_input_tokens integer, p_output_tokens integer,
  p_units integer, p_payload_object_key text, p_provider_key_id text
) returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare
  v_model private.models%rowtype; v_price private.model_prices%rowtype;
  v_control private.app_control%rowtype; v_group private.provider_groups%rowtype;
  v_account private.accounts%rowtype; v_existing private.generation_requests%rowtype;
  v_provider bigint; v_customer bigint; v_id uuid;
begin
  if p_idempotency_key is not null then
    if length(p_idempotency_key) not between 8 and 128 then raise exception 'invalid_idempotency_key'; end if;
    perform pg_advisory_xact_lock(hashtextextended(p_account_id::text || ':' || p_kind || ':' || p_idempotency_key, 0));
    update private.generation_requests set idempotency_key=null,idempotency_expires_at=null
      where account_id=p_account_id and capability=p_kind and idempotency_key=p_idempotency_key and idempotency_expires_at<=now();
    select * into v_existing from private.generation_requests
      where account_id = p_account_id and capability=p_kind and idempotency_key = p_idempotency_key;
    if found then
      if v_existing.request_hash <> p_request_hash then raise exception 'idempotency_conflict'; end if;
      return jsonb_build_object('request_id', v_existing.id, 'state', v_existing.state, 'duplicate', true,
        'result_expires_at', v_existing.result_expires_at, 'result_manifest', v_existing.result_manifest);
    end if;
  end if;

  select * into v_control from private.app_control where singleton;
  if not v_control.accepting_requests then raise exception 'service_paused'; end if;
  if p_provider_key_id is null or length(p_provider_key_id) not between 1 and 80 then raise exception 'provider_key_unavailable'; end if;
  select * into v_model from private.models where id = p_model_id and enabled for share;
  if not found then raise exception 'model_unavailable'; end if;
  select * into v_price from private.model_prices where model_id = v_model.id and version = v_model.current_price_version for share;
  if not found or v_price.verified_at is null then raise exception 'pricing_unavailable'; end if;
  if (p_kind = 'text' and (v_model.capability <> 'text' or v_price.unit <> 'tokens'
      or v_price.provider_input_micros_per_million is null or v_price.provider_output_micros_per_million is null
      or v_price.max_input_tokens is null or v_price.max_output_tokens is null
      or p_input_tokens < 0 or p_input_tokens > v_price.max_input_tokens
      or p_output_tokens < 1 or p_output_tokens > v_price.max_output_tokens))
     or (p_kind in ('image','video') and (v_model.capability <> p_kind or v_price.unit not in ('request','second')
      or v_price.provider_micros_per_unit is null or v_price.max_units is null
      or p_units < 1 or p_units > v_price.max_units)) then raise exception 'request_out_of_model_bounds'; end if;
  if coalesce(v_price.markup_bps, v_control.markup_bps) is null
    or coalesce(v_price.markup_bps, v_control.markup_bps) < 10000 then raise exception 'pricing_unavailable'; end if;

  if p_api_key_id is not null and not exists(select 1 from private.api_keys k
    where k.id = p_api_key_id and k.account_id = p_account_id and k.revoked_at is null) then raise exception 'api_key_revoked'; end if;
  insert into private.accounts(id) values (p_account_id) on conflict do nothing;
  select * into v_account from private.accounts where id = p_account_id for update;
  if v_account.suspended then raise exception 'account_suspended'; end if;
  if (select count(*) from private.generation_requests r where r.account_id = p_account_id
      and (r.state in ('queued','submitting','provider_pending') or (r.state='unknown' and r.reservation_released_at is null)))
    >= v_control.max_concurrent_per_account then raise exception 'concurrency_limit'; end if;

  if p_kind = 'text' then
    v_provider := ceil((p_input_tokens::numeric * v_price.provider_input_micros_per_million
      + p_output_tokens::numeric * v_price.provider_output_micros_per_million) / 1000000)::bigint;
  else
    v_provider := p_units::bigint * v_price.provider_micros_per_unit;
  end if;
  v_customer := ceil(v_provider::numeric * coalesce(v_price.markup_bps, v_control.markup_bps) / 10000)::bigint;
  if v_provider <= 0 or v_customer is null or v_customer <= 0 then raise exception 'pricing_unavailable'; end if;
  select * into v_group from private.provider_groups where id = v_model.provider_group_id and enabled for update;
  if not found or v_group.budget_limit_micros is null then raise exception 'provider_budget_unconfigured'; end if;
  if v_account.available_credits_micros < v_customer then raise exception 'insufficient_credits'; end if;
  if v_group.spent_micros + v_group.reserved_micros + v_provider > v_group.budget_limit_micros then raise exception 'provider_budget_exhausted'; end if;

  v_id := gen_random_uuid();
  insert into private.generation_requests(id, account_id, api_key_id, model_id, price_version, capability, state,
    idempotency_key, idempotency_expires_at, request_hash, estimated_input_tokens, reserved_output_tokens, reserved_units,
    reserved_customer_micros, reserved_provider_micros, customer_markup_bps, provider_group_id,
    provider_key_id, payload_object_key, result_object_keys)
  values (v_id, p_account_id, p_api_key_id, v_model.id, v_price.version, p_kind,
    case when p_kind = 'text' then 'submitting' else 'queued' end,
    p_idempotency_key, case when p_idempotency_key is null then null else now()+interval '30 days' end,
    p_request_hash, coalesce(p_input_tokens,0), coalesce(p_output_tokens,0), coalesce(p_units,0),
    v_customer, v_provider, coalesce(v_price.markup_bps, v_control.markup_bps), v_group.id,
    p_provider_key_id, p_payload_object_key,
    case when p_kind='text' then jsonb_build_array('results/'||v_id::text||'/response.json') else '[]'::jsonb end);
  update private.accounts set available_credits_micros = available_credits_micros - v_customer,
    reserved_credits_micros = reserved_credits_micros + v_customer, updated_at = now() where id = p_account_id;
  update private.provider_groups set reserved_micros = reserved_micros + v_provider, updated_at = now() where id = v_group.id;
  insert into private.credit_ledger(account_id, request_id, event_key, entry_type,
    available_delta_micros, reserved_delta_micros, amount_micros)
  values (p_account_id, v_id, 'reserve:' || v_id::text, 'reserve', -v_customer, v_customer, v_customer);
  return jsonb_build_object('request_id', v_id, 'state', case when p_kind='text' then 'submitting' else 'queued' end,
    'duplicate', false, 'reserved_customer_micros', v_customer::text, 'reserved_provider_micros', v_provider::text,
    'provider_group_id', v_group.id, 'price_version', v_price.version);
end $$;

create or replace function public.tw_settle_generation(
  p_request_id uuid, p_input_tokens integer, p_output_tokens integer, p_units integer,
  p_result_manifest jsonb, p_result_object_keys jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare r private.generation_requests%rowtype; a private.accounts%rowtype; p private.model_prices%rowtype;
  v_provider bigint; v_customer bigint; v_ttl integer;
begin
  select * into r from private.generation_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if r.state = 'succeeded' then return jsonb_build_object('request_id', r.id, 'state', r.state, 'actual_customer_micros', r.actual_customer_micros::text); end if;
  if r.state not in ('submitting','provider_pending') then raise exception 'request_not_settleable'; end if;
  select * into a from private.accounts where id = r.account_id for update;
  select * into p from private.model_prices where model_id = r.model_id and version = r.price_version;
  if r.capability = 'text' then
    if p_input_tokens is null or p_output_tokens is null or p_input_tokens < 0 or p_output_tokens < 0 then raise exception 'usage_unavailable'; end if;
    v_provider := ceil((p_input_tokens::numeric * p.provider_input_micros_per_million
      + p_output_tokens::numeric * p.provider_output_micros_per_million) / 1000000)::bigint;
  else
    if p_units is null or p_units < 1 or p_units > r.reserved_units then raise exception 'usage_unavailable'; end if;
    v_provider := p_units::bigint * p.provider_micros_per_unit;
  end if;
  v_customer := ceil(v_provider::numeric * r.customer_markup_bps / 10000)::bigint;
  if v_customer is null or v_provider > r.reserved_provider_micros or v_customer > r.reserved_customer_micros then raise exception 'usage_exceeds_reservation'; end if;
  select result_ttl_hours into v_ttl from private.app_control where singleton;
  update private.accounts set reserved_credits_micros = reserved_credits_micros - r.reserved_customer_micros,
    available_credits_micros = available_credits_micros + r.reserved_customer_micros - v_customer, updated_at = now()
    where id = r.account_id;
  update private.provider_groups set reserved_micros = reserved_micros - r.reserved_provider_micros,
    spent_micros = spent_micros + v_provider, updated_at = now() where id = r.provider_group_id;
  update private.generation_requests set state='succeeded', actual_customer_micros=v_customer,
    actual_provider_micros=v_provider, input_tokens=p_input_tokens, output_tokens=p_output_tokens,
    actual_units=p_units, result_manifest=p_result_manifest, result_object_keys=coalesce(p_result_object_keys,'[]'::jsonb),
    result_expires_at=now() + make_interval(hours => v_ttl), completed_at=now(), updated_at=now()
    where id=p_request_id;
  insert into private.credit_ledger(account_id, request_id, event_key, entry_type,
    available_delta_micros, reserved_delta_micros, amount_micros)
  values (r.account_id, r.id, 'settle:' || r.id::text, 'settlement', r.reserved_customer_micros-v_customer,
    -r.reserved_customer_micros, v_customer);
  return jsonb_build_object('request_id', r.id, 'state','succeeded','actual_customer_micros',v_customer::text,
    'result_expires_at',now() + make_interval(hours => v_ttl));
end $$;

create or replace function public.tw_fail_generation(p_request_id uuid, p_error_category text, p_ambiguous boolean default false)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare r private.generation_requests%rowtype;
begin
  select * into r from private.generation_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if r.state in ('failed','succeeded','expired') then return jsonb_build_object('request_id',r.id,'state',r.state); end if;
  if p_ambiguous then
    update private.generation_requests set state='unknown', error_category=coalesce(p_error_category,'upstream_ambiguous'), updated_at=now() where id=r.id;
    return jsonb_build_object('request_id',r.id,'state','unknown');
  end if;
  update private.accounts set available_credits_micros=available_credits_micros+r.reserved_customer_micros,
    reserved_credits_micros=reserved_credits_micros-r.reserved_customer_micros, updated_at=now() where id=r.account_id;
  update private.provider_groups set reserved_micros=reserved_micros-r.reserved_provider_micros, updated_at=now() where id=r.provider_group_id;
  update private.generation_requests set state='failed', error_category=left(p_error_category,64),
    reservation_released_at=now(), completed_at=now(), updated_at=now() where id=r.id;
  insert into private.credit_ledger(account_id, request_id, event_key, entry_type,
    available_delta_micros, reserved_delta_micros, amount_micros)
  values (r.account_id,r.id,'release:'||r.id::text,'release',r.reserved_customer_micros,-r.reserved_customer_micros,r.reserved_customer_micros);
  return jsonb_build_object('request_id',r.id,'state','failed');
end $$;

create or replace function public.tw_claim_media_submission(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare r private.generation_requests%rowtype; m private.models%rowtype;
begin
  update private.generation_requests set state='submitting', updated_at=now()
    where id=p_request_id and state='queued' returning * into r;
  if not found then return null; end if;
  select * into m from private.models where id=r.model_id;
  return jsonb_build_object('request_id',r.id,'account_id',r.account_id,'model_id',r.model_id,
    'provider_model_id',m.provider_model_id,'provider_group_id',r.provider_group_id,'payload_object_key',r.payload_object_key,
    'provider_key_id',r.provider_key_id,'capability',r.capability,'reserved_units',r.reserved_units);
end $$;

create or replace function public.tw_mark_media_pending(p_request_id uuid, p_provider_request_id text, p_provider_key_id text)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.generation_requests set state='provider_pending', provider_request_id=p_provider_request_id,
    provider_key_id=p_provider_key_id, poll_after=now()+interval '10 seconds', updated_at=now()
    where id=p_request_id and state='submitting' and provider_key_id=p_provider_key_id;
  return found;
end $$;

create or replace function public.tw_set_pending_result_objects(p_request_id uuid, p_result_object_keys jsonb)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  if coalesce(jsonb_typeof(p_result_object_keys),'')<>'array' or jsonb_array_length(p_result_object_keys)<1
    or jsonb_array_length(p_result_object_keys)>120
    or exists(select 1 from jsonb_array_elements_text(p_result_object_keys) as item(value)
      where value !~ ('^results/'||p_request_id::text||'/[0-9]{1,3}$')
        or case when value ~ ('^results/'||p_request_id::text||'/[0-9]{1,3}$')
          then split_part(value,'/',3)::integer>119 else true end) then
    raise exception 'invalid_result_object_keys';
  end if;
  update private.generation_requests set result_object_keys=p_result_object_keys,updated_at=now()
    where id=p_request_id and capability in ('image','video') and state='provider_pending'
      and (result_object_keys='[]'::jsonb or result_object_keys=p_result_object_keys);
  return found;
end $$;

create or replace function public.tw_claim_media_poll(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare r private.generation_requests%rowtype;
begin
  update private.generation_requests set last_polled_at=now(), poll_after=now()+interval '30 seconds', updated_at=now()
    where id=p_request_id and state='provider_pending' and (poll_after is null or poll_after <= now())
    returning * into r;
  if not found then return null; end if;
  return jsonb_build_object('request_id',r.id,'provider_request_id',r.provider_request_id,
    'provider_key_id',r.provider_key_id,'provider_group_id',r.provider_group_id,'model_id',r.model_id,
    'capability',r.capability,'reserved_units',r.reserved_units);
end $$;

create or replace function public.tw_reschedule_media_poll(p_request_id uuid, p_seconds integer)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.generation_requests set poll_after=now()+make_interval(secs=>greatest(5,least(p_seconds,300))), updated_at=now()
    where id=p_request_id and state='provider_pending';
  return found;
end $$;

create or replace function public.tw_recover_queued_media()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(id), '[]'::jsonb) from (
    select id from private.generation_requests
    where capability in ('image','video') and state='queued' and created_at < now()-interval '2 minutes'
    order by created_at limit 100
  ) queued
$$;

create or replace function public.tw_recover_pending_media_polls()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(id), '[]'::jsonb) from (
    select id from private.generation_requests
    where capability in ('image','video') and state='provider_pending' and poll_after<=now()
    order by poll_after limit 100
  ) pending
$$;

create or replace function public.tw_mark_stale_submissions_unknown()
returns integer language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_count integer;
begin
  with stale as (
    select id, state from private.generation_requests
    where (state='submitting' and updated_at < now()-interval '5 minutes')
       or (state='provider_pending' and created_at < now()-interval '24 hours')
    order by updated_at limit 100 for update skip locked
  )
  update private.generation_requests r set state='unknown',
    error_category=case when stale.state='submitting' then 'provider_acceptance_unknown' else 'provider_result_unresolved' end,
    updated_at=now()
  from stale where r.id=stale.id;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.tw_get_request(p_account_id uuid, p_request_id uuid)
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select jsonb_build_object('id',r.id,'model',r.model_id,'capability',r.capability,'status',r.state,
    'created_at',r.created_at,'completed_at',r.completed_at,'error',r.error_category,
    'credits_micros',r.actual_customer_micros::text,'result_expires_at',r.result_expires_at,
    'result_manifest',case when r.state='succeeded' and r.result_expires_at > now() then r.result_manifest else null end)
  from private.generation_requests r where r.id=p_request_id and r.account_id=p_account_id
$$;

create or replace function public.tw_get_result(p_account_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare r private.generation_requests%rowtype;
begin
  select * into r from private.generation_requests where id=p_request_id and account_id=p_account_id;
  if not found then raise exception 'request_not_found'; end if;
  if r.state <> 'succeeded' then raise exception 'result_not_ready'; end if;
  if r.result_expires_at <= now() then raise exception 'result_expired'; end if;
  return coalesce(r.result_manifest,'{}'::jsonb);
end $$;

create or replace function public.tw_dashboard_summary(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare a private.accounts%rowtype;
begin
  perform public.tw_ensure_account(p_account_id);
  select * into a from private.accounts where id=p_account_id;
  return jsonb_build_object('available_credits_micros',a.available_credits_micros::text,
    'reserved_credits_micros',a.reserved_credits_micros::text,'suspended',a.suspended,
    'request_count',(select count(*) from private.generation_requests where account_id=p_account_id),
    'completed_count',(select count(*) from private.generation_requests where account_id=p_account_id and state='succeeded'),
    'failed_count',(select count(*) from private.generation_requests where account_id=p_account_id and state in ('failed','unknown')),
    'used_credits_micros',(select coalesce(sum(actual_customer_micros),0)::text from private.generation_requests where account_id=p_account_id and state='succeeded'));
end $$;

create or replace function public.tw_list_usage(p_account_id uuid, p_limit integer default 50, p_before timestamptz default null)
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'model',r.model_id,'status',r.state,
    'created_at',r.created_at,'completed_at',r.completed_at,'credits_micros',r.actual_customer_micros::text,
    'error',r.error_category,'api_key_name',k.name) order by r.created_at desc),'[]'::jsonb)
  from (select * from private.generation_requests where account_id=p_account_id
    and (p_before is null or created_at < p_before) order by created_at desc limit greatest(1,least(p_limit,100))) r
  left join private.api_keys k on k.id=r.api_key_id
$$;

create or replace function public.tw_create_checkout_quote(p_account_id uuid, p_offer_id text, p_currency text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare o private.purchase_offers%rowtype; q private.stripe_quotes%rowtype;
begin
  if length(p_idempotency_key) not between 8 and 128 then raise exception 'invalid_idempotency_key'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text || ':checkout:' || p_idempotency_key, 0));
  select * into q from private.stripe_quotes where account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if q.offer_id<>p_offer_id or q.currency<>lower(p_currency) then raise exception 'idempotency_conflict'; end if;
    if q.expires_at<=now() then raise exception 'checkout_quote_expired'; end if;
    return jsonb_build_object('id',q.id,'currency',q.currency,'amount_minor',q.amount_minor,
    'credits_micros',q.credits_micros::text,'expires_at',q.expires_at,'stripe_session_id',q.stripe_session_id);
  end if;
  select * into o from private.purchase_offers where id=p_offer_id and currency=lower(p_currency) and active;
  if not found then raise exception 'purchase_offer_unavailable'; end if;
  perform public.tw_ensure_account(p_account_id);
  insert into private.stripe_quotes(account_id,offer_id,currency,amount_minor,credits_micros,price_version,idempotency_key)
  values (p_account_id,o.id,o.currency,o.amount_minor,o.credits_micros,o.price_version,p_idempotency_key) returning * into q;
  return jsonb_build_object('id',q.id,'currency',q.currency,'amount_minor',q.amount_minor,
    'credits_micros',q.credits_micros::text,'expires_at',q.expires_at);
end $$;

create or replace function public.tw_list_purchase_offers()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'currency',currency,'amount_minor',amount_minor,
    'credits_micros',credits_micros::text,'price_version',price_version) order by currency,amount_minor),'[]'::jsonb)
  from private.purchase_offers where active
$$;

create or replace function public.tw_list_payments(p_account_id uuid)
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'offer_id',q.offer_id,'currency',q.currency,
    'amount_minor',q.amount_minor,'credits_micros',q.credits_micros::text,'status',q.state,'created_at',q.created_at)
    order by q.created_at desc),'[]'::jsonb)
  from private.stripe_quotes q where q.account_id=p_account_id
$$;

create or replace function public.tw_attach_checkout_session(p_account_id uuid, p_quote_id uuid, p_session_id text)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.stripe_quotes set state=case when state='created' then 'checkout_open' else state end,
    stripe_session_id=coalesce(stripe_session_id,p_session_id)
    where id=p_quote_id and account_id=p_account_id and expires_at>now()
      and ((state='created' and stripe_session_id is null) or stripe_session_id=p_session_id);
  return found;
end $$;

-- A signed refund or dispute event can arrive before Checkout's completion
-- event. Bind the verified PaymentIntent and record the original purchase in
-- the same transaction before applying that later financial event.
create or replace function private.tw_bind_verified_payment(p_quote_id uuid,p_payment_intent_id text)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
declare q private.stripe_quotes%rowtype;
begin
  if p_payment_intent_id is null or length(p_payment_intent_id) not between 1 and 255 then
    raise exception 'checkout_quote_mismatch';
  end if;
  select * into q from private.stripe_quotes where id=p_quote_id for update;
  if not found or q.stripe_session_id is null then raise exception 'checkout_state_invalid'; end if;
  if q.payment_intent_id is not null then
    if q.payment_intent_id<>p_payment_intent_id then raise exception 'checkout_quote_mismatch'; end if;
    return;
  end if;
  if q.state<>'checkout_open' then raise exception 'checkout_state_invalid'; end if;

  update private.accounts set available_credits_micros=available_credits_micros+q.credits_micros, updated_at=now()
    where id=q.account_id;
  update private.stripe_quotes set state='paid',payment_intent_id=p_payment_intent_id where id=q.id;
  insert into private.credit_ledger(account_id,purchase_id,event_key,entry_type,available_delta_micros,reserved_delta_micros,amount_micros)
    values(q.account_id,q.id,'purchase:'||q.id::text,'purchase',q.credits_micros,0,q.credits_micros);
end $$;

revoke all on function private.tw_bind_verified_payment(uuid,text) from public, anon, authenticated, service_role;

create or replace function public.tw_fulfill_checkout(p_event_id text, p_event_type text, p_session_id text,
  p_payment_intent_id text, p_amount_minor integer, p_currency text, p_metadata_quote_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare q private.stripe_quotes%rowtype;
begin
  if p_event_id is null or length(p_event_id) not between 1 and 255 then raise exception 'invalid_stripe_event'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stripe-event:'||p_event_id,0));
  if exists(select 1 from private.stripe_events where id=p_event_id) then return jsonb_build_object('duplicate',true); end if;
  if p_event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded') then raise exception 'unsupported_stripe_event'; end if;
  select * into q from private.stripe_quotes where id=p_metadata_quote_id and stripe_session_id=p_session_id for update;
  if not found or q.amount_minor<>p_amount_minor or q.currency<>lower(p_currency) or p_payment_intent_id is null then raise exception 'checkout_quote_mismatch'; end if;
  perform private.tw_bind_verified_payment(p_metadata_quote_id,p_payment_intent_id);
  insert into private.stripe_events(id,event_type) values(p_event_id,p_event_type);
  return jsonb_build_object('duplicate',false,'purchase_id',q.id);
end $$;

create or replace function public.tw_reverse_checkout(p_event_id text, p_event_type text,
  p_payment_intent_id text, p_metadata_quote_id uuid,p_refunded_amount_minor integer default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare q private.stripe_quotes%rowtype; v_credits bigint;
begin
  if p_event_id is null or length(p_event_id) not between 1 and 255 then raise exception 'invalid_stripe_event'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stripe-event:'||p_event_id,0));
  if exists(select 1 from private.stripe_events where id=p_event_id) then return jsonb_build_object('duplicate',true); end if;
  if p_event_type not in ('charge.refunded','charge.dispute.created') then raise exception 'unsupported_stripe_event'; end if;
  perform private.tw_bind_verified_payment(p_metadata_quote_id,p_payment_intent_id);
  select * into q from private.stripe_quotes where id=p_metadata_quote_id and payment_intent_id=p_payment_intent_id for update;
  if not found or q.state not in ('paid','disputed','refunded','dispute_won','dispute_lost') then raise exception 'payment_not_reversible'; end if;
  insert into private.stripe_events(id,event_type) values(p_event_id,p_event_type);
  if p_event_type='charge.refunded' then
    if p_refunded_amount_minor is null or p_refunded_amount_minor<0 or p_refunded_amount_minor>q.amount_minor then raise exception 'invalid_refund_amount'; end if;
    -- A delayed event may contain an older cumulative refund snapshot. Record
    -- its ID, but never undo a refund already applied from a newer event.
    if p_refunded_amount_minor<q.refunded_amount_minor then
      return jsonb_build_object('duplicate',false,'stale',true,'purchase_id',q.id);
    end if;
    v_credits := case when q.state in ('disputed','dispute_lost') then 0 else
      floor(q.credits_micros::numeric*p_refunded_amount_minor/q.amount_minor)::bigint
      - floor(q.credits_micros::numeric*q.refunded_amount_minor/q.amount_minor)::bigint end;
    if v_credits>0 then
      update private.accounts set available_credits_micros=available_credits_micros-v_credits,
        suspended=(suspended or available_credits_micros-v_credits < 0),updated_at=now() where id=q.account_id;
      insert into private.credit_ledger(account_id,purchase_id,event_key,entry_type,available_delta_micros,reserved_delta_micros,amount_micros)
        values(q.account_id,q.id,'refund:'||p_event_id,'refund',-v_credits,0,v_credits);
    end if;
    update private.stripe_quotes set refunded_amount_minor=p_refunded_amount_minor,
      state=case when p_refunded_amount_minor=q.amount_minor and q.state not in ('disputed','dispute_lost') then 'refunded' else state end where id=q.id;
  elsif p_event_type='charge.dispute.created' then
    if q.state not in ('disputed','dispute_won','dispute_lost') then
      v_credits := q.credits_micros-floor(q.credits_micros::numeric*q.refunded_amount_minor/q.amount_minor)::bigint;
      update private.accounts set available_credits_micros=available_credits_micros-v_credits,
        suspended=true,updated_at=now() where id=q.account_id;
      update private.stripe_quotes set state='disputed' where id=q.id;
      insert into private.credit_ledger(account_id,purchase_id,event_key,entry_type,available_delta_micros,reserved_delta_micros,amount_micros)
        values(q.account_id,q.id,'dispute:'||q.id::text,'dispute',-v_credits,0,v_credits);
    end if;
  else raise exception 'unsupported_stripe_event'; end if;
  return jsonb_build_object('duplicate',false,'purchase_id',q.id);
end $$;

create or replace function public.tw_resolve_dispute(p_event_id text,p_event_type text,p_payment_intent_id text,
  p_metadata_quote_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare q private.stripe_quotes%rowtype; v_credits bigint; v_restore boolean;
begin
  if p_event_id is null or length(p_event_id) not between 1 and 255 then raise exception 'invalid_stripe_event'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stripe-event:'||p_event_id,0));
  if exists(select 1 from private.stripe_events where id=p_event_id) then return jsonb_build_object('duplicate',true); end if;
  if p_event_type<>'charge.dispute.closed' or p_status not in ('won','lost','warning_closed') then
    raise exception 'unsupported_dispute_resolution';
  end if;
  perform private.tw_bind_verified_payment(p_metadata_quote_id,p_payment_intent_id);
  select * into q from private.stripe_quotes where id=p_metadata_quote_id and payment_intent_id=p_payment_intent_id for update;
  if not found then raise exception 'payment_not_reversible'; end if;
  insert into private.stripe_events(id,event_type) values(p_event_id,p_event_type);
  v_restore := p_status in ('won','warning_closed');
  if q.state='disputed' and v_restore then
    v_credits := q.credits_micros-floor(q.credits_micros::numeric*q.refunded_amount_minor/q.amount_minor)::bigint;
    if v_credits>0 then
      update private.accounts set available_credits_micros=available_credits_micros+v_credits,updated_at=now() where id=q.account_id;
      insert into private.credit_ledger(account_id,purchase_id,event_key,entry_type,available_delta_micros,reserved_delta_micros,amount_micros)
        values(q.account_id,q.id,'dispute-recovery:'||q.id::text,'dispute_reversal',v_credits,0,v_credits);
    end if;
    update private.stripe_quotes set state='dispute_won' where id=q.id;
  elsif q.state='disputed' then
    update private.stripe_quotes set state='dispute_lost' where id=q.id;
  elsif q.state in ('paid','refunded') and not v_restore then
    -- Stripe can deliver the close event before the created event. Apply the
    -- loss reversal here; a later created event sees the terminal state.
    v_credits := q.credits_micros-floor(q.credits_micros::numeric*q.refunded_amount_minor/q.amount_minor)::bigint;
    update private.accounts set available_credits_micros=available_credits_micros-v_credits,
      suspended=true,updated_at=now() where id=q.account_id;
    update private.stripe_quotes set state='dispute_lost' where id=q.id;
    if v_credits>0 then
      insert into private.credit_ledger(account_id,purchase_id,event_key,entry_type,available_delta_micros,reserved_delta_micros,amount_micros)
        values(q.account_id,q.id,'dispute:'||q.id::text,'dispute',-v_credits,0,v_credits)
        on conflict(event_key) do nothing;
    end if;
  elsif q.state in ('paid','refunded') then
    update private.stripe_quotes set state='dispute_won' where id=q.id;
  end if;
  -- A resolved dispute does not automatically restore account access. An
  -- administrator reviews any other suspension reason before re-enabling it.
  return jsonb_build_object('duplicate',false,'purchase_id',q.id,'status',p_status);
end $$;

create or replace function public.tw_admin_inspect_account(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare a private.accounts%rowtype;
begin
  select * into a from private.accounts where id=p_account_id;
  if not found then raise exception 'account_not_found'; end if;
  return jsonb_build_object('id',a.id,'suspended',a.suspended,
    'available_credits_micros',a.available_credits_micros::text,
    'reserved_credits_micros',a.reserved_credits_micros::text,
    'request_count',(select count(*) from private.generation_requests where account_id=a.id),
    'unknown_requests',(select count(*) from private.generation_requests where account_id=a.id and state='unknown'),
    'api_keys',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'prefix',prefix,
      'revoked_at',revoked_at,'created_at',created_at) order by created_at desc),'[]'::jsonb)
      from private.api_keys where account_id=a.id));
end $$;

create or replace function public.tw_admin_suspend_account(p_actor uuid,p_reason text,p_account_id uuid,p_suspended boolean)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
declare a private.accounts%rowtype;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  select * into a from private.accounts where id=p_account_id for update;
  if not found then raise exception 'account_not_found'; end if;
  if not p_suspended and (a.available_credits_micros<0 or exists(
    select 1 from private.stripe_quotes where account_id=p_account_id and state='disputed')) then
    raise exception 'account_suspension_blocked';
  end if;
  update private.accounts set suspended=p_suspended,updated_at=now() where id=p_account_id;
  insert into private.audit_log(actor,action,subject,reason,metadata)
    values(p_actor,'account_suspension',p_account_id::text,trim(p_reason),jsonb_build_object('suspended',p_suspended));
end $$;

create or replace function public.tw_admin_revoke_api_key(p_actor uuid,p_reason text,p_key_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
declare k private.api_keys%rowtype;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  select * into k from private.api_keys where id=p_key_id for update;
  if not found then raise exception 'api_key_not_found'; end if;
  if k.revoked_at is not null then return false; end if;
  update private.api_keys set revoked_at=now() where id=p_key_id;
  insert into private.audit_log(actor,action,subject,reason,metadata)
    values(p_actor,'api_key_revoked',p_key_id::text,trim(p_reason),jsonb_build_object('account_id',k.account_id));
  return true;
end $$;

create or replace function public.tw_admin_adjust_credits(p_actor uuid,p_reason text,p_account_id uuid,p_delta_micros bigint,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare a private.accounts%rowtype; v_balance bigint; v_event text; v_existing private.admin_adjustment_keys%rowtype;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 or p_delta_micros=0 then raise exception 'reason_required'; end if;
  if length(coalesce(p_idempotency_key,'')) not between 8 and 128 then raise exception 'invalid_idempotency_key'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':credit-adjust:'||p_idempotency_key,0));
  select * into v_existing from private.admin_adjustment_keys where actor=p_actor and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.account_id<>p_account_id or v_existing.delta_micros<>p_delta_micros or v_existing.reason<>trim(p_reason) then
      raise exception 'idempotency_conflict';
    end if;
    return jsonb_build_object('account_id',p_account_id,'available_credits_micros',v_existing.balance_after_micros::text,'duplicate',true);
  end if;
  select * into a from private.accounts where id=p_account_id for update;
  if not found then raise exception 'account_not_found'; end if;
  v_balance := a.available_credits_micros+p_delta_micros;
  update private.accounts set available_credits_micros=v_balance,
    suspended=(suspended or v_balance<0),updated_at=now() where id=p_account_id;
  v_event := 'admin-adjust:'||gen_random_uuid()::text;
  insert into private.credit_ledger(account_id,event_key,entry_type,available_delta_micros,reserved_delta_micros,amount_micros,metadata)
    values(p_account_id,v_event,'adjustment',p_delta_micros,0,abs(p_delta_micros),jsonb_build_object('reason',trim(p_reason),'actor',p_actor));
  insert into private.audit_log(actor,action,subject,reason,metadata)
    values(p_actor,'credit_adjustment',p_account_id::text,trim(p_reason),jsonb_build_object('delta_micros',p_delta_micros::text,'balance_micros',v_balance::text));
  insert into private.admin_adjustment_keys(actor,idempotency_key,account_id,delta_micros,reason,balance_after_micros)
    values(p_actor,p_idempotency_key,p_account_id,p_delta_micros,trim(p_reason),v_balance);
  return jsonb_build_object('account_id',p_account_id,'available_credits_micros',v_balance::text,'suspended',v_balance<0 or a.suspended,'duplicate',false);
end $$;

create or replace function public.tw_ops_summary()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select jsonb_build_object('accepting_requests',c.accepting_requests,'result_ttl_hours',c.result_ttl_hours,
    'markup_bps',c.markup_bps,
    'active_accounts',(select count(*) from private.accounts where not suspended),
    'active_keys',(select count(*) from private.api_keys where revoked_at is null),
    'requests_24h',(select count(*) from private.generation_requests where created_at>now()-interval '24 hours'),
    'completed_24h',(select count(*) from private.generation_requests where created_at>now()-interval '24 hours' and state='succeeded'),
    'failed_24h',(select count(*) from private.generation_requests where created_at>now()-interval '24 hours' and state='failed'),
    'customer_charge_24h_micros',(select coalesce(sum(actual_customer_micros),0)::text from private.generation_requests where created_at>now()-interval '24 hours' and state='succeeded'),
    'provider_cost_24h_micros',(select coalesce(sum(actual_provider_micros),0)::text from private.generation_requests where created_at>now()-interval '24 hours' and state='succeeded'),
    'unknown_requests',(select count(*) from private.generation_requests where state='unknown'),
    'unresolved_reservations',(select count(*) from private.generation_requests where state='unknown' and reservation_released_at is null),
    'queued_requests',(select count(*) from private.generation_requests where state='queued'),
    'oldest_queued_seconds',(select coalesce(extract(epoch from (now()-min(created_at))),0)::bigint from private.generation_requests where state='queued'),
    'provider_groups',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'enabled',enabled,
      'budget_limit_micros',budget_limit_micros::text,'spent_micros',spent_micros::text,'reserved_micros',reserved_micros::text)),'[]'::jsonb) from private.provider_groups),
    'model_usage_24h',(select coalesce(jsonb_agg(jsonb_build_object('model',model_id,'requests',request_count,
      'succeeded',success_count,'customer_micros',customer_micros,'provider_micros',provider_micros) order by request_count desc),'[]'::jsonb)
      from (select model_id,count(*) as request_count,count(*) filter(where state='succeeded') as success_count,
        coalesce(sum(actual_customer_micros),0)::text as customer_micros,
        coalesce(sum(actual_provider_micros),0)::text as provider_micros
        from private.generation_requests where created_at>now()-interval '24 hours' group by model_id) model_stats),
    'paid_amounts_24h',(select coalesce(jsonb_agg(jsonb_build_object('currency',currency,'amount_minor',amount_minor::text) order by currency),'[]'::jsonb)
      from (select currency,sum(amount_minor)::bigint amount_minor from private.stripe_quotes
        where state in ('paid','refunded','disputed') and created_at>now()-interval '24 hours' group by currency) paid),
    'models',(select count(*) from private.models where enabled))
  from private.app_control c where c.singleton
$$;

create or replace function public.tw_admin_model_catalog()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name,'capability',m.capability,
    'enabled',m.enabled,'provider_model_id',m.provider_model_id,'current_price_version',m.current_price_version,
    'price_verified_at',p.verified_at,'max_input_tokens',p.max_input_tokens,
    'max_output_tokens',p.max_output_tokens,'max_units',p.max_units) order by m.capability,m.id),'[]'::jsonb)
  from private.models m left join private.model_prices p
    on p.model_id=m.id and p.version=m.current_price_version
$$;

create or replace function public.tw_set_operational_controls(p_actor uuid, p_reason text,
  p_accepting_requests boolean default null, p_result_ttl_hours integer default null)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  if p_result_ttl_hours is not null and p_result_ttl_hours not between 1 and 48 then raise exception 'invalid_result_ttl'; end if;
  update private.app_control set accepting_requests=coalesce(p_accepting_requests,accepting_requests),
    result_ttl_hours=coalesce(p_result_ttl_hours,result_ttl_hours),updated_at=now(),updated_by=p_actor where singleton;
  insert into private.audit_log(actor,action,subject,reason,metadata)
  values(p_actor,'operational_controls','platform',trim(p_reason),jsonb_build_object('accepting_requests',p_accepting_requests,'result_ttl_hours',p_result_ttl_hours));
end $$;

create or replace function public.tw_admin_configure_model(p_actor uuid,p_reason text,p_model_id text,
  p_enabled boolean,p_unit text,p_input_micros bigint,p_output_micros bigint,p_unit_micros bigint,
  p_markup_bps bigint,p_max_input integer,p_max_output integer,p_max_units integer,
  p_parameter_schema jsonb,p_source_note text)
returns integer language plpgsql security definer set search_path = pg_catalog, private as $$
declare m private.models%rowtype; v_version integer;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 or length(trim(coalesce(p_source_note,'')))<5 then raise exception 'reason_required'; end if;
  select * into m from private.models where id=p_model_id for update;
  if not found then raise exception 'model_unavailable'; end if;
  if p_enabled and (p_unit is null or p_parameter_schema is null or jsonb_typeof(p_parameter_schema)<>'object'
    or p_parameter_schema->>'type'<>'object' or jsonb_typeof(p_parameter_schema->'properties')<>'object'
    or (p_parameter_schema ? 'required' and jsonb_typeof(p_parameter_schema->'required')<>'array')) then raise exception 'pricing_unavailable'; end if;
  if p_enabled and ((m.capability='text' and (p_unit<>'tokens' or p_input_micros is null or p_output_micros is null or p_max_input is null or p_max_output is null))
    or (m.capability='image' and (p_unit<>'request' or p_unit_micros is null or p_max_units is null))
    or (m.capability='video' and (p_unit<>'second' or p_unit_micros is null or p_max_units is null))) then raise exception 'pricing_unavailable'; end if;
  if p_enabled and ((p_markup_bps is not null and p_markup_bps not between 10000 and 1000000)
    or (p_input_micros is not null and p_input_micros<=0) or (p_output_micros is not null and p_output_micros<=0)
    or (p_unit_micros is not null and p_unit_micros<=0)
    or (p_max_input is not null and p_max_input>1000000) or (p_max_output is not null and p_max_output>100000)
    or (p_max_units is not null and p_max_units>120)) then raise exception 'pricing_unavailable'; end if;
  select coalesce(max(version),0)+1 into v_version from private.model_prices where model_id=p_model_id;
  if p_unit is not null then
    insert into private.model_prices(model_id,version,unit,provider_input_micros_per_million,
      provider_output_micros_per_million,provider_micros_per_unit,markup_bps,max_input_tokens,
      max_output_tokens,max_units,verified_at,verified_by,source_note)
    values(p_model_id,v_version,p_unit,p_input_micros,p_output_micros,p_unit_micros,p_markup_bps,
      p_max_input,p_max_output,p_max_units,now(),p_actor::text,trim(p_source_note));
    update private.models set current_price_version=v_version,parameter_schema=coalesce(p_parameter_schema,'{}'::jsonb),
      enabled=p_enabled,updated_at=now() where id=p_model_id;
  else
    update private.models set enabled=false,updated_at=now() where id=p_model_id;
    insert into private.audit_log(actor,action,subject,reason,metadata)
      values(p_actor,'model_disabled',p_model_id,trim(p_reason),'{}'::jsonb);
    return coalesce(m.current_price_version,0);
  end if;
  insert into private.audit_log(actor,action,subject,reason,metadata)
  values(p_actor,'model_price_configured',p_model_id,trim(p_reason),jsonb_build_object('version',v_version,'enabled',p_enabled,'source',trim(p_source_note)));
  return v_version;
end $$;

create or replace function public.tw_admin_configure_provider(p_actor uuid,p_reason text,p_group_id text,
  p_enabled boolean,p_budget_limit_micros bigint,p_global_markup_bps bigint,p_accepting_requests boolean,p_result_ttl_hours integer)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
declare g private.provider_groups%rowtype;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  if p_budget_limit_micros<0 or (p_global_markup_bps is not null and p_global_markup_bps not between 10000 and 1000000)
    or p_result_ttl_hours not between 1 and 48 then raise exception 'pricing_unavailable'; end if;
  select * into g from private.provider_groups where id=p_group_id for update;
  if not found then raise exception 'model_unavailable'; end if;
  if p_budget_limit_micros < g.spent_micros+g.reserved_micros then raise exception 'provider_budget_exhausted'; end if;
  update private.provider_groups set enabled=p_enabled,budget_limit_micros=p_budget_limit_micros,updated_at=now() where id=p_group_id;
  update private.app_control set accepting_requests=p_accepting_requests,markup_bps=p_global_markup_bps,
    result_ttl_hours=p_result_ttl_hours,updated_at=now(),updated_by=p_actor where singleton;
  insert into private.audit_log(actor,action,subject,reason,metadata)
  values(p_actor,'provider_controls_configured',p_group_id,trim(p_reason),jsonb_build_object('enabled',p_enabled,
    'budget_limit_micros',p_budget_limit_micros,'markup_bps',p_global_markup_bps,'accepting_requests',p_accepting_requests,'result_ttl_hours',p_result_ttl_hours));
end $$;

create or replace function public.tw_admin_configure_offer(p_actor uuid,p_reason text,p_offer_id text,
  p_currency text,p_amount_minor integer,p_credits_micros bigint,p_active boolean)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  if p_currency not in ('eur','usd') or p_amount_minor<=0 or p_credits_micros<=0 then raise exception 'purchase_offer_unavailable'; end if;
  insert into private.purchase_offers(id,currency,amount_minor,credits_micros,active,price_version)
  values(p_offer_id,p_currency,p_amount_minor,p_credits_micros,p_active,1)
  on conflict(id,currency) do update set amount_minor=excluded.amount_minor,credits_micros=excluded.credits_micros,
    active=excluded.active,price_version=private.purchase_offers.price_version+1;
  insert into private.audit_log(actor,action,subject,reason,metadata)
  values(p_actor,'purchase_offer_configured',p_offer_id||':'||p_currency,trim(p_reason),jsonb_build_object('amount_minor',p_amount_minor,'credits_micros',p_credits_micros,'active',p_active));
end $$;

create or replace function public.tw_recover_expired_reservations()
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_released integer := 0; r record;
begin
  for r in select * from private.generation_requests where state='unknown'
    and reservation_released_at is null and created_at < now()-interval '24 hours'
    order by created_at limit 100 for update skip locked
  loop
    update private.accounts set available_credits_micros=available_credits_micros+r.reserved_customer_micros,
      reserved_credits_micros=reserved_credits_micros-r.reserved_customer_micros where id=r.account_id;
    update private.provider_groups set reserved_micros=reserved_micros-r.reserved_provider_micros,
      spent_micros=spent_micros+r.reserved_provider_micros where id=r.provider_group_id;
    update private.generation_requests set reservation_released_at=now(),updated_at=now() where id=r.id;
    insert into private.credit_ledger(account_id,request_id,event_key,entry_type,available_delta_micros,reserved_delta_micros,amount_micros,metadata)
      values(r.account_id,r.id,'unknown-release:'||r.id::text,'release',r.reserved_customer_micros,-r.reserved_customer_micros,r.reserved_customer_micros,'{"after":"24h unresolved; provider max charged to risk budget"}'::jsonb);
    v_released := v_released+1;
  end loop;
  return jsonb_build_object('released',v_released);
end $$;

create or replace function public.tw_recover_expired_idempotency_keys()
returns integer language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_count integer;
begin
  with expired as (
    select id from private.generation_requests
    where idempotency_key is not null and idempotency_expires_at<=now()
    order by idempotency_expires_at limit 100 for update skip locked
  )
  update private.generation_requests r set idempotency_key=null,idempotency_expires_at=null
    from expired where r.id=expired.id;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.tw_expired_objects()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  with candidates as (
    select id, state, result_object_keys, payload_object_key from private.generation_requests
    where (state='succeeded' and result_expires_at<=now())
       or (state='unknown' and result_object_keys<>'[]'::jsonb and updated_at<now()-interval '1 hour')
       or (payload_object_key is not null and created_at<now()-interval '1 hour')
    order by coalesce(result_expires_at, created_at+interval '1 hour') limit 100
  )
  select coalesce(jsonb_agg(jsonb_build_object('request_id',id,'state',state,'result_keys',result_object_keys,
    'payload_key',payload_object_key)), '[]'::jsonb) from candidates
$$;

create or replace function public.tw_mark_result_expired(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.generation_requests set state='expired',result_manifest=null,updated_at=now()
    where id=p_request_id and state='succeeded' and result_expires_at<=now();
  return found;
end $$;

create or replace function public.tw_clear_unresolved_result_objects(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.generation_requests set result_object_keys='[]'::jsonb,updated_at=now()
    where id=p_request_id and state='unknown';
  return found;
end $$;

create or replace function public.tw_clear_payload_object(p_request_id uuid, p_object_key text)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.generation_requests set payload_object_key=null,updated_at=now()
    where id=p_request_id and payload_object_key=p_object_key;
  return found;
end $$;

-- Supabase PostgREST exposes only explicit service-role RPCs; no table access is
-- granted to browser roles or the service-role API surface.
revoke all on all tables in schema private from public, anon, authenticated, service_role;
revoke all on function public.tw_ensure_account(uuid) from public, anon, authenticated;
revoke all on function public.tw_authenticate_api_key(bytea) from public, anon, authenticated;
revoke all on function public.tw_create_api_key(uuid,text,text,bytea) from public, anon, authenticated;
revoke all on function public.tw_list_api_keys(uuid) from public, anon, authenticated;
revoke all on function public.tw_revoke_api_key(uuid,uuid) from public, anon, authenticated;
revoke all on function public.tw_list_models() from public, anon, authenticated;
revoke all on function public.tw_reserve_generation(uuid,uuid,text,text,bytea,text,integer,integer,integer,text,text) from public, anon, authenticated;
revoke all on function public.tw_settle_generation(uuid,integer,integer,integer,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.tw_fail_generation(uuid,text,boolean) from public, anon, authenticated;
revoke all on function public.tw_claim_media_submission(uuid) from public, anon, authenticated;
revoke all on function public.tw_mark_media_pending(uuid,text,text) from public, anon, authenticated;
revoke all on function public.tw_set_pending_result_objects(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.tw_claim_media_poll(uuid) from public, anon, authenticated;
revoke all on function public.tw_reschedule_media_poll(uuid,integer) from public, anon, authenticated;
revoke all on function public.tw_recover_queued_media() from public, anon, authenticated;
revoke all on function public.tw_recover_pending_media_polls() from public, anon, authenticated;
revoke all on function public.tw_mark_stale_submissions_unknown() from public, anon, authenticated;
revoke all on function public.tw_expired_objects() from public, anon, authenticated;
revoke all on function public.tw_mark_result_expired(uuid) from public, anon, authenticated;
revoke all on function public.tw_clear_unresolved_result_objects(uuid) from public, anon, authenticated;
revoke all on function public.tw_clear_payload_object(uuid,text) from public, anon, authenticated;
revoke all on function public.tw_get_request(uuid,uuid) from public, anon, authenticated;
revoke all on function public.tw_get_result(uuid,uuid) from public, anon, authenticated;
revoke all on function public.tw_dashboard_summary(uuid) from public, anon, authenticated;
revoke all on function public.tw_list_usage(uuid,integer,timestamptz) from public, anon, authenticated;
revoke all on function public.tw_create_checkout_quote(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.tw_list_purchase_offers() from public, anon, authenticated;
revoke all on function public.tw_list_payments(uuid) from public, anon, authenticated;
revoke all on function public.tw_attach_checkout_session(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.tw_fulfill_checkout(text,text,text,text,integer,text,uuid) from public, anon, authenticated;
revoke all on function public.tw_reverse_checkout(text,text,text,uuid,integer) from public, anon, authenticated;
revoke all on function public.tw_resolve_dispute(text,text,text,uuid,text) from public, anon, authenticated;
revoke all on function public.tw_ops_summary() from public, anon, authenticated;
revoke all on function public.tw_admin_model_catalog() from public, anon, authenticated;
revoke all on function public.tw_admin_inspect_account(uuid) from public, anon, authenticated;
revoke all on function public.tw_admin_suspend_account(uuid,text,uuid,boolean) from public, anon, authenticated;
revoke all on function public.tw_admin_revoke_api_key(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.tw_admin_adjust_credits(uuid,text,uuid,bigint,text) from public, anon, authenticated;
revoke all on function public.tw_set_operational_controls(uuid,text,boolean,integer) from public, anon, authenticated;
revoke all on function public.tw_admin_configure_model(uuid,text,text,boolean,text,bigint,bigint,bigint,bigint,integer,integer,integer,jsonb,text) from public, anon, authenticated;
revoke all on function public.tw_admin_configure_provider(uuid,text,text,boolean,bigint,bigint,boolean,integer) from public, anon, authenticated;
revoke all on function public.tw_admin_configure_offer(uuid,text,text,text,integer,bigint,boolean) from public, anon, authenticated;
revoke all on function public.tw_recover_expired_reservations() from public, anon, authenticated;
revoke all on function public.tw_recover_expired_idempotency_keys() from public, anon, authenticated;
grant execute on function public.tw_ensure_account(uuid) to service_role;
grant execute on function public.tw_authenticate_api_key(bytea) to service_role;
grant execute on function public.tw_create_api_key(uuid,text,text,bytea) to service_role;
grant execute on function public.tw_list_api_keys(uuid) to service_role;
grant execute on function public.tw_revoke_api_key(uuid,uuid) to service_role;
grant execute on function public.tw_list_models() to service_role;
grant execute on function public.tw_reserve_generation(uuid,uuid,text,text,bytea,text,integer,integer,integer,text,text) to service_role;
grant execute on function public.tw_settle_generation(uuid,integer,integer,integer,jsonb,jsonb) to service_role;
grant execute on function public.tw_fail_generation(uuid,text,boolean) to service_role;
grant execute on function public.tw_claim_media_submission(uuid) to service_role;
grant execute on function public.tw_mark_media_pending(uuid,text,text) to service_role;
grant execute on function public.tw_set_pending_result_objects(uuid,jsonb) to service_role;
grant execute on function public.tw_claim_media_poll(uuid) to service_role;
grant execute on function public.tw_reschedule_media_poll(uuid,integer) to service_role;
grant execute on function public.tw_recover_queued_media() to service_role;
grant execute on function public.tw_recover_pending_media_polls() to service_role;
grant execute on function public.tw_mark_stale_submissions_unknown() to service_role;
grant execute on function public.tw_expired_objects() to service_role;
grant execute on function public.tw_mark_result_expired(uuid) to service_role;
grant execute on function public.tw_clear_unresolved_result_objects(uuid) to service_role;
grant execute on function public.tw_clear_payload_object(uuid,text) to service_role;
grant execute on function public.tw_get_request(uuid,uuid) to service_role;
grant execute on function public.tw_get_result(uuid,uuid) to service_role;
grant execute on function public.tw_dashboard_summary(uuid) to service_role;
grant execute on function public.tw_list_usage(uuid,integer,timestamptz) to service_role;
grant execute on function public.tw_create_checkout_quote(uuid,text,text,text) to service_role;
grant execute on function public.tw_list_purchase_offers() to service_role;
grant execute on function public.tw_list_payments(uuid) to service_role;
grant execute on function public.tw_attach_checkout_session(uuid,uuid,text) to service_role;
grant execute on function public.tw_fulfill_checkout(text,text,text,text,integer,text,uuid) to service_role;
grant execute on function public.tw_reverse_checkout(text,text,text,uuid,integer) to service_role;
grant execute on function public.tw_resolve_dispute(text,text,text,uuid,text) to service_role;
grant execute on function public.tw_ops_summary() to service_role;
grant execute on function public.tw_admin_model_catalog() to service_role;
grant execute on function public.tw_admin_inspect_account(uuid) to service_role;
grant execute on function public.tw_admin_suspend_account(uuid,text,uuid,boolean) to service_role;
grant execute on function public.tw_admin_revoke_api_key(uuid,text,uuid) to service_role;
grant execute on function public.tw_admin_adjust_credits(uuid,text,uuid,bigint,text) to service_role;
grant execute on function public.tw_set_operational_controls(uuid,text,boolean,integer) to service_role;
grant execute on function public.tw_admin_configure_model(uuid,text,text,boolean,text,bigint,bigint,bigint,bigint,integer,integer,integer,jsonb,text) to service_role;
grant execute on function public.tw_admin_configure_provider(uuid,text,text,boolean,bigint,bigint,boolean,integer) to service_role;
grant execute on function public.tw_admin_configure_offer(uuid,text,text,text,integer,bigint,boolean) to service_role;
grant execute on function public.tw_recover_expired_reservations() to service_role;
grant execute on function public.tw_recover_expired_idempotency_keys() to service_role;
