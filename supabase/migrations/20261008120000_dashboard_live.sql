-- Account dashboard support: filtered usage history, period aggregates, savings against
-- operator-entered official prices, notification preferences with low-balance alert state,
-- billing profile, payment lookup for receipts, and a published incident feed.
-- Credits stay USD-value micros (1_000_000 = USD 1); no browser role gains table access.

-- Outcome buckets shared by every usage query. 'expired' is a settled request whose
-- stored result has been deleted; it was charged and counts as completed.
create or replace function private.tw_usage_outcome(p_state text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case
    when p_state in ('succeeded','expired') then 'completed'
    when p_state = 'failed' then 'failed'
    when p_state in ('queued','submitting','provider_pending') then 'pending'
    else 'unknown' end
$$;
revoke all on function private.tw_usage_outcome(text) from public, anon, authenticated, service_role;

create or replace function public.tw_list_usage_page(p_account_id uuid, p_from timestamptz, p_to timestamptz,
  p_model text, p_key_id uuid, p_outcome text, p_search text, p_limit integer, p_offset integer)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, private as $$
declare v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if p_outcome is not null and p_outcome not in ('completed','failed','pending','unknown') then raise exception 'invalid_usage_filter'; end if;
  if v_offset > 100000 or length(coalesce(v_search, '')) > 100 or length(coalesce(p_model, '')) > 120 then raise exception 'invalid_usage_filter'; end if;
  return (
    with filtered as (
      select r.* from private.generation_requests r
      where r.account_id = p_account_id
        and (p_from is null or r.created_at >= p_from)
        and (p_to is null or r.created_at < p_to)
        and (p_model is null or r.model_id = p_model)
        and (p_key_id is null or r.api_key_id = p_key_id)
        and (p_outcome is null or private.tw_usage_outcome(r.state) = p_outcome)
        and (v_search is null or r.id::text like lower(v_search) || '%' or r.model_id ilike '%' || v_search || '%')
    ), page as (
      select f.* from filtered f order by f.created_at desc, f.id desc limit v_limit offset v_offset
    )
    select jsonb_build_object('total', (select count(*) from filtered), 'limit', v_limit, 'offset', v_offset,
      'data', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'model', p.model_id, 'model_name', coalesce(m.display_name, p.model_id), 'capability', p.capability,
        'status', p.state, 'outcome', private.tw_usage_outcome(p.state), 'created_at', p.created_at, 'completed_at', p.completed_at,
        'credits_micros', p.actual_customer_micros::text, 'price_version', p.price_version, 'error', p.error_category,
        'api_key_id', p.api_key_id, 'api_key_name', k.name, 'input_tokens', p.input_tokens,
        'output_tokens', p.output_tokens, 'units', p.actual_units) order by p.created_at desc, p.id desc)
        from page p left join private.models m on m.id = p.model_id left join private.api_keys k on k.id = p.api_key_id), '[]'::jsonb))
  );
end $$;

-- Totals, UTC daily series and top models for one period; computed server-side so
-- dashboard figures never depend on how many rows a page happened to load.
create or replace function public.tw_usage_overview(p_account_id uuid, p_from timestamptz)
returns jsonb language sql stable security definer set search_path = pg_catalog, private as $$
  with scoped as (
    select r.*, private.tw_usage_outcome(r.state) as outcome from private.generation_requests r
    where r.account_id = p_account_id and (p_from is null or r.created_at >= p_from)
  )
  select jsonb_build_object(
    'totals', (select jsonb_build_object('requests', count(*),
      'completed', count(*) filter (where outcome = 'completed'), 'failed', count(*) filter (where outcome = 'failed'),
      'pending', count(*) filter (where outcome = 'pending'), 'unknown', count(*) filter (where outcome = 'unknown'),
      'credits_micros', coalesce(sum(actual_customer_micros) filter (where outcome = 'completed'), 0)::text) from scoped),
    'daily', coalesce((select jsonb_agg(d order by d->>'day') from (
      select jsonb_build_object('day', to_char(date_trunc('day', created_at at time zone 'UTC'), 'YYYY-MM-DD'),
        'requests', count(*), 'completed', count(*) filter (where outcome = 'completed'),
        'failed', count(*) filter (where outcome = 'failed'),
        'credits_micros', coalesce(sum(actual_customer_micros) filter (where outcome = 'completed'), 0)::text) d
      from scoped group by date_trunc('day', created_at at time zone 'UTC')) days), '[]'::jsonb),
    'models', coalesce((select jsonb_agg(t order by (t->>'credits_micros')::numeric desc, (t->>'requests')::bigint desc) from (
      select jsonb_build_object('model', s.model_id, 'name', coalesce(m.display_name, s.model_id), 'requests', count(*),
        'credits_micros', coalesce(sum(s.actual_customer_micros) filter (where s.outcome = 'completed'), 0)::text) t
      from scoped s left join private.models m on m.id = s.model_id group by s.model_id, m.display_name
      order by coalesce(sum(s.actual_customer_micros) filter (where s.outcome = 'completed'), 0) desc, count(*) desc limit 5) top), '[]'::jsonb))
$$;

-- Official list prices are a comparison reference only; they never affect charges.
alter table private.model_prices
  add column official_input_micros_per_million bigint check (official_input_micros_per_million is null or official_input_micros_per_million > 0),
  add column official_output_micros_per_million bigint check (official_output_micros_per_million is null or official_output_micros_per_million > 0),
  add column official_micros_per_unit bigint check (official_micros_per_unit is null or official_micros_per_unit > 0),
  add column official_source_note text;

create or replace function public.tw_admin_set_official_prices(p_actor uuid, p_reason text, p_model_id text,
  p_input_micros bigint, p_output_micros bigint, p_unit_micros bigint, p_source_note text)
returns integer language plpgsql security definer set search_path = pg_catalog, private as $$
declare m private.models%rowtype;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 or length(trim(coalesce(p_source_note,''))) not between 5 and 500 then raise exception 'reason_required'; end if;
  select * into m from private.models where id = p_model_id;
  if not found or m.current_price_version is null then raise exception 'model_unavailable'; end if;
  if (m.capability = 'text' and (p_input_micros is null or p_output_micros is null or p_unit_micros is not null))
    or (m.capability <> 'text' and (p_unit_micros is null or p_input_micros is not null or p_output_micros is not null))
    or coalesce(p_input_micros, 1) <= 0 or coalesce(p_output_micros, 1) <= 0 or coalesce(p_unit_micros, 1) <= 0 then
    raise exception 'pricing_unavailable';
  end if;
  update private.model_prices set official_input_micros_per_million = p_input_micros,
    official_output_micros_per_million = p_output_micros, official_micros_per_unit = p_unit_micros,
    official_source_note = trim(p_source_note)
    where model_id = p_model_id and version = m.current_price_version;
  insert into private.audit_log(actor, action, subject, reason, metadata)
  values (p_actor, 'official_prices_configured', p_model_id, trim(p_reason), jsonb_build_object('version', m.current_price_version,
    'input_micros', p_input_micros, 'output_micros', p_output_micros, 'unit_micros', p_unit_micros, 'source', trim(p_source_note)));
  return m.current_price_version;
end $$;

-- Only settled requests whose own price version carries a complete official reference
-- are compared; everything else is reported as excluded, never estimated.
create or replace function public.tw_savings_summary(p_account_id uuid, p_from timestamptz)
returns jsonb language sql stable security definer set search_path = pg_catalog, private as $$
  with scoped as (
    select r.*, p.official_input_micros_per_million oin, p.official_output_micros_per_million oout, p.official_micros_per_unit ounit
    from private.generation_requests r
    join private.model_prices p on p.model_id = r.model_id and p.version = r.price_version
    where r.account_id = p_account_id and (p_from is null or r.created_at >= p_from)
  ), classified as (
    select s.*, case
      when private.tw_usage_outcome(s.state) <> 'completed' or s.actual_customer_micros is null then 'not_settled'
      when s.capability = 'text' and (s.oin is null or s.oout is null or s.input_tokens is null or s.output_tokens is null) then 'no_reference'
      when s.capability <> 'text' and (s.ounit is null or s.actual_units is null) then 'no_reference'
      else 'compared' end as basis,
      case when s.capability = 'text' then ceil((s.input_tokens::numeric * s.oin + s.output_tokens::numeric * s.oout) / 1000000)
        else s.actual_units::numeric * s.ounit end as official_micros
    from scoped s
  )
  select jsonb_build_object(
    'compared_requests', count(*) filter (where basis = 'compared'),
    'excluded_not_settled', count(*) filter (where basis = 'not_settled'),
    'excluded_no_reference', count(*) filter (where basis = 'no_reference'),
    'official_micros', coalesce(sum(official_micros) filter (where basis = 'compared'), 0)::bigint::text,
    'charged_micros', coalesce(sum(actual_customer_micros) filter (where basis = 'compared'), 0)::text,
    'saved_micros', (coalesce(sum(official_micros) filter (where basis = 'compared'), 0)
      - coalesce(sum(actual_customer_micros) filter (where basis = 'compared'), 0))::bigint::text)
  from classified
$$;

create table private.account_preferences (
  account_id uuid primary key references private.accounts(id) on delete cascade,
  low_balance_enabled boolean not null default false,
  threshold_micros bigint check (threshold_micros is null or threshold_micros between 1 and 1000000000000000),
  product_updates boolean not null default false,
  alert_armed boolean not null default true,
  last_alert_at timestamptz,
  updated_at timestamptz not null default now(),
  check (not low_balance_enabled or threshold_micros is not null)
);

create or replace function public.tw_get_preferences(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare p private.account_preferences%rowtype;
begin
  perform public.tw_ensure_account(p_account_id);
  select * into p from private.account_preferences where account_id = p_account_id;
  return jsonb_build_object('low_balance_enabled', coalesce(p.low_balance_enabled, false),
    'threshold_micros', p.threshold_micros::text, 'product_updates', coalesce(p.product_updates, false),
    'last_alert_at', p.last_alert_at);
end $$;

-- Enabling or changing the threshold starts a new alert cycle (armed), matching the
-- accepted preview policy: one email per crossing below, re-armed once balance recovers.
create or replace function public.tw_save_preferences(p_account_id uuid, p_low_balance_enabled boolean,
  p_threshold_micros bigint, p_product_updates boolean)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  if p_low_balance_enabled is null or p_product_updates is null
    or (p_low_balance_enabled and p_threshold_micros is null)
    or (p_threshold_micros is not null and p_threshold_micros not between 1 and 1000000000000000) then
    raise exception 'invalid_preferences';
  end if;
  perform public.tw_ensure_account(p_account_id);
  insert into private.account_preferences(account_id, low_balance_enabled, threshold_micros, product_updates, alert_armed, updated_at)
  values (p_account_id, p_low_balance_enabled, p_threshold_micros, p_product_updates, true, now())
  on conflict (account_id) do update set low_balance_enabled = excluded.low_balance_enabled,
    threshold_micros = excluded.threshold_micros, product_updates = excluded.product_updates,
    alert_armed = case when not account_preferences.low_balance_enabled
      or account_preferences.threshold_micros is distinct from excluded.threshold_micros
      then true else account_preferences.alert_armed end,
    updated_at = now();
  return public.tw_get_preferences(p_account_id);
end $$;

-- Claims due alerts exactly once: concurrent cron runs skip rows another run holds.
create or replace function public.tw_claim_low_balance_alerts(p_limit integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_result jsonb;
begin
  update private.account_preferences p set alert_armed = true
    from private.accounts a
    where a.id = p.account_id and not p.alert_armed and a.available_credits_micros > p.threshold_micros;
  with due as (
    select p.account_id from private.account_preferences p join private.accounts a on a.id = p.account_id
    where p.low_balance_enabled and p.alert_armed and a.available_credits_micros < p.threshold_micros
    order by p.account_id limit greatest(1, least(coalesce(p_limit, 50), 200))
    for update of p skip locked
  ), claimed as (
    update private.account_preferences p set alert_armed = false, last_alert_at = now()
    from due where p.account_id = due.account_id
    returning p.account_id, p.threshold_micros
  )
  select coalesce(jsonb_agg(jsonb_build_object('account_id', c.account_id, 'threshold_micros', c.threshold_micros::text,
    'available_micros', a.available_credits_micros::text)), '[]'::jsonb) into v_result
  from claimed c join private.accounts a on a.id = c.account_id;
  return v_result;
end $$;

-- A claimed alert that could not be delivered (or whose email is unverified) stays pending.
create or replace function public.tw_rearm_low_balance_alert(p_account_id uuid)
returns void language sql security definer set search_path = pg_catalog, private as $$
  update private.account_preferences set alert_armed = true where account_id = p_account_id and low_balance_enabled
$$;

create table private.billing_profiles (
  account_id uuid primary key references private.accounts(id) on delete cascade,
  kind text check (kind in ('personal','business')),
  name text check (length(name) <= 120),
  company text check (length(company) <= 160),
  address_line1 text check (length(address_line1) <= 160),
  address_line2 text check (length(address_line2) <= 160),
  city text check (length(city) <= 100),
  postal_code text check (length(postal_code) <= 20),
  region text check (length(region) <= 100),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  vat_id text check (length(vat_id) <= 32),
  updated_at timestamptz not null default now()
);

create or replace function public.tw_get_billing_profile(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare b private.billing_profiles%rowtype;
begin
  select * into b from private.billing_profiles where account_id = p_account_id;
  return jsonb_build_object('kind', b.kind, 'name', b.name, 'company', b.company, 'address_line1', b.address_line1,
    'address_line2', b.address_line2, 'city', b.city, 'postal_code', b.postal_code, 'region', b.region,
    'country_code', b.country_code, 'vat_id', b.vat_id, 'updated_at', b.updated_at);
end $$;

create or replace function public.tw_save_billing_profile(p_account_id uuid, p_profile jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare v text;
begin
  if jsonb_typeof(p_profile) <> 'object' then raise exception 'invalid_billing_profile'; end if;
  perform public.tw_ensure_account(p_account_id);
  begin
    insert into private.billing_profiles(account_id, kind, name, company, address_line1, address_line2, city,
      postal_code, region, country_code, vat_id, updated_at)
    values (p_account_id, nullif(trim(p_profile->>'kind'), ''), nullif(trim(p_profile->>'name'), ''),
      nullif(trim(p_profile->>'company'), ''), nullif(trim(p_profile->>'address_line1'), ''),
      nullif(trim(p_profile->>'address_line2'), ''), nullif(trim(p_profile->>'city'), ''),
      nullif(trim(p_profile->>'postal_code'), ''), nullif(trim(p_profile->>'region'), ''),
      upper(nullif(trim(p_profile->>'country_code'), '')), nullif(trim(p_profile->>'vat_id'), ''), now())
    on conflict (account_id) do update set kind = excluded.kind, name = excluded.name, company = excluded.company,
      address_line1 = excluded.address_line1, address_line2 = excluded.address_line2, city = excluded.city,
      postal_code = excluded.postal_code, region = excluded.region, country_code = excluded.country_code,
      vat_id = excluded.vat_id, updated_at = now();
  exception when check_violation then raise exception 'invalid_billing_profile';
  end;
  return public.tw_get_billing_profile(p_account_id);
end $$;

create or replace function public.tw_get_payment(p_account_id uuid, p_payment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, private as $$
declare q private.stripe_quotes%rowtype;
begin
  select * into q from private.stripe_quotes where id = p_payment_id and account_id = p_account_id;
  if not found then raise exception 'payment_not_found'; end if;
  return jsonb_build_object('id', q.id, 'status', q.state, 'payment_intent_id', q.payment_intent_id);
end $$;

-- Published incidents only: an empty feed means "nothing reported", not verified health.
create table private.service_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 160),
  impact text not null check (length(impact) between 3 and 2000),
  service text not null check (length(service) between 2 and 80),
  model_ids text[] not null default '{}',
  timeline jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index service_incidents_recent on private.service_incidents(updated_at desc);

create or replace function public.tw_public_status()
returns jsonb language sql stable security definer set search_path = pg_catalog, private as $$
  select jsonb_build_object('checked_at', now(),
    'updated_at', (select max(updated_at) from private.service_incidents),
    'incidents', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'title', i.title, 'impact', i.impact,
      'service', i.service, 'model_ids', to_jsonb(i.model_ids), 'timeline', i.timeline, 'started_at', i.started_at,
      'updated_at', i.updated_at, 'resolved_at', i.resolved_at) order by i.resolved_at is not null, i.updated_at desc)
      from private.service_incidents i where i.resolved_at is null or i.resolved_at > now() - interval '7 days'), '[]'::jsonb))
$$;

create or replace function public.tw_admin_publish_incident(p_actor uuid, p_reason text, p_incident_id uuid,
  p_title text, p_impact text, p_service text, p_model_ids text[], p_message text, p_resolved boolean)
returns uuid language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_id uuid; v_entry jsonb;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  if length(trim(coalesce(p_message,''))) not between 3 and 1000 then raise exception 'invalid_incident'; end if;
  v_entry := jsonb_build_array(jsonb_build_object('at', now(), 'message', trim(p_message)));
  begin
    if p_incident_id is null then
      insert into private.service_incidents(title, impact, service, model_ids, timeline, resolved_at)
      values (trim(p_title), trim(p_impact), trim(p_service), coalesce(p_model_ids, '{}'), v_entry,
        case when p_resolved then now() end) returning id into v_id;
    else
      update private.service_incidents set title = coalesce(nullif(trim(p_title), ''), title),
        impact = coalesce(nullif(trim(p_impact), ''), impact), service = coalesce(nullif(trim(p_service), ''), service),
        model_ids = coalesce(p_model_ids, model_ids), timeline = v_entry || timeline, updated_at = now(),
        resolved_at = case when p_resolved then coalesce(resolved_at, now()) else null end
        where id = p_incident_id returning id into v_id;
      if v_id is null then raise exception 'incident_not_found'; end if;
    end if;
  exception when check_violation or not_null_violation then raise exception 'invalid_incident';
  end;
  insert into private.audit_log(actor, action, subject, reason, metadata)
  values (p_actor, 'incident_published', v_id::text, trim(p_reason), jsonb_build_object('resolved', p_resolved));
  return v_id;
end $$;

revoke all on all tables in schema private from public, anon, authenticated, service_role;
revoke all on function public.tw_list_usage_page(uuid,timestamptz,timestamptz,text,uuid,text,text,integer,integer) from public, anon, authenticated;
revoke all on function public.tw_usage_overview(uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.tw_admin_set_official_prices(uuid,text,text,bigint,bigint,bigint,text) from public, anon, authenticated;
revoke all on function public.tw_savings_summary(uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.tw_get_preferences(uuid) from public, anon, authenticated;
revoke all on function public.tw_save_preferences(uuid,boolean,bigint,boolean) from public, anon, authenticated;
revoke all on function public.tw_claim_low_balance_alerts(integer) from public, anon, authenticated;
revoke all on function public.tw_rearm_low_balance_alert(uuid) from public, anon, authenticated;
revoke all on function public.tw_get_billing_profile(uuid) from public, anon, authenticated;
revoke all on function public.tw_save_billing_profile(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.tw_get_payment(uuid,uuid) from public, anon, authenticated;
revoke all on function public.tw_public_status() from public, anon, authenticated;
revoke all on function public.tw_admin_publish_incident(uuid,text,uuid,text,text,text,text[],text,boolean) from public, anon, authenticated;
grant execute on function public.tw_list_usage_page(uuid,timestamptz,timestamptz,text,uuid,text,text,integer,integer) to service_role;
grant execute on function public.tw_usage_overview(uuid,timestamptz) to service_role;
grant execute on function public.tw_admin_set_official_prices(uuid,text,text,bigint,bigint,bigint,text) to service_role;
grant execute on function public.tw_savings_summary(uuid,timestamptz) to service_role;
grant execute on function public.tw_get_preferences(uuid) to service_role;
grant execute on function public.tw_save_preferences(uuid,boolean,bigint,boolean) to service_role;
grant execute on function public.tw_claim_low_balance_alerts(integer) to service_role;
grant execute on function public.tw_rearm_low_balance_alert(uuid) to service_role;
grant execute on function public.tw_get_billing_profile(uuid) to service_role;
grant execute on function public.tw_save_billing_profile(uuid,jsonb) to service_role;
grant execute on function public.tw_get_payment(uuid,uuid) to service_role;
grant execute on function public.tw_public_status() to service_role;
grant execute on function public.tw_admin_publish_incident(uuid,text,uuid,text,text,text,text[],text,boolean) to service_role;
