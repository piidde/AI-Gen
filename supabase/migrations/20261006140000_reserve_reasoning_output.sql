-- Live finding (2026-10-06): gemini-2.5-flash returned completion_tokens=127 for
-- max_tokens=50 because thinking tokens are billed as output. Settlement then failed
-- with usage_exceeds_reservation. Text reservations now cover the model's output ceiling;
-- unused credits are returned at settlement as before.
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
    -- Reasoning models bill hidden thinking tokens beyond the caller's max_tokens, so
    -- reserve the model's configured output ceiling rather than the requested maximum.
    v_provider := ceil((p_input_tokens::numeric * v_price.provider_input_micros_per_million
      + greatest(p_output_tokens, v_price.max_output_tokens)::numeric * v_price.provider_output_micros_per_million) / 1000000)::bigint;
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
    p_request_hash, coalesce(p_input_tokens,0), case when p_kind='text' then greatest(p_output_tokens, v_price.max_output_tokens) else 0 end, coalesce(p_units,0),
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
