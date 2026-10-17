-- Hourly GrsAI catalogue sync (ADR-008, owner decisions 2026-10-17). The Worker reads
-- GrsAI's public model list and its USD 150 package; this migration applies the owner's
-- rules in one transaction per run:
--   * cost = list credits x USD 150 / package credits; the customer price keeps the
--     markup (2.0x), so a higher upstream price becomes a new price version at once;
--   * a lower upstream price waits for an admin (pending);
--   * a model GrsAI closes or drops is disabled; it is re-enabled only if the sync disabled it;
--   * a new upstream text/image model is added disabled with a candidate price (pending);
--   * a jump beyond 3x either way disables the model until an admin decides;
--   * a list less than half its previous size is rejected as a broken response.
-- Running requests keep the price version they reserved; nothing here touches them.

alter table private.models
  add column upstream_closed boolean not null default false,
  add column upstream_note text,
  add column sync_disabled_reason text
    check (sync_disabled_reason in ('upstream_closed', 'upstream_missing', 'suspicious_price', 'capability_changed'));

create table private.upstream_sync_state (
  singleton boolean primary key default true check (singleton),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  consecutive_failures integer not null default 0,
  failure_alerted boolean not null default false,
  last_error text,
  package_amount_minor bigint,
  package_credits bigint,
  model_count integer,
  snapshot jsonb
);
insert into private.upstream_sync_state(singleton) values (true) on conflict do nothing;

create table private.upstream_changes (
  id bigint generated always as identity primary key,
  model_id text not null references private.models(id),
  kind text not null check (kind in ('price_increase', 'price_decrease', 'suspicious_price', 'new_model',
    'closed', 'reopened', 'missing', 'capability_changed')),
  status text not null check (status in ('applied', 'pending', 'superseded', 'dismissed')),
  previous jsonb,
  proposed jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_reason text
);
create index upstream_changes_model on private.upstream_changes(model_id, id desc);
create index upstream_changes_recent on private.upstream_changes(created_at desc);
revoke all on all tables in schema private from public, anon, authenticated, service_role;

-- Exact cost in micros, rounded up so a cost is never understated.
create or replace function private.tw_credits_to_micros(p_credits bigint, p_amount_minor bigint, p_package_credits bigint)
returns bigint language sql immutable as $$
  select case when p_credits is null then null
    else ceil(p_credits::numeric * p_amount_minor * 10000 / p_package_credits)::bigint end
$$;

-- A new price version copies limits, markup and official references from the current one.
create or replace function private.tw_sync_price_version(p_model_id text, p_input bigint, p_output bigint,
  p_unit bigint, p_verified_by text, p_note text)
returns integer language plpgsql set search_path = pg_catalog, private as $$
declare m private.models%rowtype; p private.model_prices%rowtype; v_version integer;
begin
  select * into m from private.models where id = p_model_id for update;
  if not found then raise exception 'model_unavailable'; end if;
  select * into p from private.model_prices where model_id = m.id and version = m.current_price_version;
  select coalesce(max(version), 0) + 1 into v_version from private.model_prices where model_id = m.id;
  insert into private.model_prices(model_id, version, unit, provider_input_micros_per_million,
    provider_output_micros_per_million, provider_micros_per_unit, markup_bps, max_input_tokens,
    max_output_tokens, max_units, verified_at, verified_by, source_note, official_input_micros_per_million,
    official_output_micros_per_million, official_micros_per_unit, official_source_note)
  values (m.id, v_version, case when m.capability = 'text' then 'tokens' else 'request' end,
    p_input, p_output, p_unit, p.markup_bps,
    coalesce(p.max_input_tokens, case when m.capability = 'text' then 200000 end),
    coalesce(p.max_output_tokens, case when m.capability = 'text' then 16000 end),
    coalesce(p.max_units, case when m.capability = 'image' then 4 end),
    now(), p_verified_by, p_note, p.official_input_micros_per_million,
    p.official_output_micros_per_million, p.official_micros_per_unit, p.official_source_note);
  update private.models set current_price_version = v_version, updated_at = now() where id = m.id;
  return v_version;
end $$;

-- Only a model the admin had enabled is disabled with a sync reason, so the sync never
-- re-enables a model an admin switched off.
create or replace function private.tw_sync_disable(p_model_id text, p_reason text)
returns void language plpgsql set search_path = pg_catalog, private as $$
begin
  update private.models set enabled = false, sync_disabled_reason = p_reason, updated_at = now()
    where id = p_model_id and enabled;
  if found then
    insert into private.audit_log(actor, action, subject, reason, metadata)
    values ('00000000-0000-0000-0000-000000000000', 'model_disabled', p_model_id, 'upstream sync: ' || p_reason, '{}'::jsonb);
  end if;
end $$;

-- Restores a model the sync disabled once nothing blocks it any more.
create or replace function private.tw_sync_reenable(p_model_id text)
returns void language plpgsql set search_path = pg_catalog, private as $$
declare m private.models%rowtype; p private.model_prices%rowtype;
begin
  select * into m from private.models where id = p_model_id for update;
  if not found or m.enabled or m.sync_disabled_reason is null or m.sync_disabled_reason = 'capability_changed'
    or m.upstream_closed then return; end if;
  if exists (select 1 from private.upstream_changes where model_id = m.id and status = 'pending'
    and kind in ('suspicious_price', 'capability_changed')) then return; end if;
  select * into p from private.model_prices where model_id = m.id and version = m.current_price_version;
  if not found or p.verified_at is null
    or not ((m.capability = 'text' and p.unit = 'tokens' and p.provider_input_micros_per_million is not null
        and p.provider_output_micros_per_million is not null and p.max_input_tokens is not null and p.max_output_tokens is not null)
      or (m.capability = 'image' and p.unit = 'request' and p.provider_micros_per_unit is not null and p.max_units is not null))
    or jsonb_typeof(m.parameter_schema->'properties') is distinct from 'object' then return; end if;
  update private.models set enabled = true, sync_disabled_reason = null, updated_at = now() where id = m.id;
  insert into private.audit_log(actor, action, subject, reason, metadata)
  values ('00000000-0000-0000-0000-000000000000', 'model_enabled', m.id, 'upstream sync: available again',
    jsonb_build_object('price_version', m.current_price_version));
end $$;

create or replace function private.tw_record_sync_failure(p_error text)
returns jsonb language plpgsql set search_path = pg_catalog, private as $$
declare s private.upstream_sync_state%rowtype; v_alert boolean;
begin
  update private.upstream_sync_state set last_attempt_at = now(), consecutive_failures = consecutive_failures + 1,
    last_error = left(coalesce(p_error, 'unknown'), 300) where singleton returning * into s;
  -- Alert once after three consecutive hourly failures, again only after a success.
  v_alert := s.consecutive_failures >= 3 and not s.failure_alerted;
  if v_alert then update private.upstream_sync_state set failure_alerted = true where singleton; end if;
  return jsonb_build_object('status', 'failed', 'error', s.last_error, 'consecutive_failures', s.consecutive_failures, 'alert', v_alert);
end $$;

create or replace function public.tw_record_upstream_sync_failure(p_error text)
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select private.tw_record_sync_failure(p_error)
$$;

create or replace function public.tw_sync_upstream_catalog(p_snapshot jsonb, p_override_actor uuid default null,
  p_override_reason text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare
  v_amount bigint; v_package bigint; v_models jsonb; v_count integer;
  s private.upstream_sync_state%rowtype; m private.models%rowtype; p private.model_prices%rowtype;
  v_item jsonb; v_id text; v_capability text; v_closed boolean; v_note text;
  v_in bigint; v_out bigint; v_unit bigint; v_priced boolean;
  v_new bigint[]; v_old bigint[]; v_suspicious boolean; v_up boolean; v_kind text;
  v_proposed jsonb; v_previous jsonb; v_last private.upstream_changes%rowtype; v_seen text[] := '{}'; v_source text;
begin
  perform pg_advisory_xact_lock(hashtext('tw_sync_upstream_catalog'));
  begin
    v_amount := (p_snapshot->'package'->>'amount_minor')::bigint;
    v_package := (p_snapshot->'package'->>'credits')::bigint;
  exception when others then raise exception 'invalid_upstream_catalog';
  end;
  v_models := p_snapshot->'models';
  if v_amount is null or v_amount <= 0 or v_package is null or v_package <= 0
    or jsonb_typeof(v_models) is distinct from 'array' or jsonb_array_length(v_models) = 0 then
    raise exception 'invalid_upstream_catalog';
  end if;
  v_count := jsonb_array_length(v_models);
  select * into s from private.upstream_sync_state where singleton for update;
  -- A list that suddenly halves is more likely a broken response than a mass retirement.
  if s.model_count is not null and v_count * 2 < s.model_count then
    if p_override_actor is null then return private.tw_record_sync_failure('catalog_shrunk'); end if;
    if length(trim(coalesce(p_override_reason, ''))) not between 3 and 500 then raise exception 'reason_required'; end if;
    insert into private.audit_log(actor, action, subject, reason, metadata)
    values (p_override_actor, 'upstream_shrink_accepted', 'grsai-default', trim(p_override_reason),
      jsonb_build_object('previous_count', s.model_count, 'count', v_count));
  end if;
  v_source := 'GrsAI list ' || to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI') || ' UTC; USD '
    || (v_amount / 100.0)::numeric(12,2)::text || ' package = ' || v_package || ' credits';

  for v_item in select value from jsonb_array_elements(v_models) loop
    v_id := v_item->>'id';
    v_capability := v_item->>'capability';
    v_closed := (v_item->>'closed')::boolean;
    v_note := nullif(trim(coalesce(v_item->>'note', '')), '');
    if v_id is null or v_id !~ '^[a-z0-9][a-z0-9.-]{0,79}$' or v_capability not in ('text', 'image') or v_closed is null
      or v_id = any(v_seen) then raise exception 'invalid_upstream_catalog'; end if;
    v_seen := v_seen || v_id;
    if v_capability = 'text' then
      v_in := private.tw_credits_to_micros((v_item->>'input_credits')::bigint, v_amount, v_package);
      v_out := private.tw_credits_to_micros((v_item->>'output_credits')::bigint, v_amount, v_package);
      v_unit := null;
      v_priced := coalesce(v_in > 0 and v_out > 0, false);
    else
      v_in := null; v_out := null;
      v_unit := private.tw_credits_to_micros((v_item->>'unit_credits')::bigint, v_amount, v_package);
      v_priced := coalesce(v_unit > 0, false);
    end if;
    if not v_priced and not v_closed then raise exception 'invalid_upstream_catalog'; end if;
    v_proposed := jsonb_build_object('input_micros', v_in::text, 'output_micros', v_out::text, 'unit_micros', v_unit::text,
      'upstream', v_item - 'display_name', 'package_amount_minor', v_amount, 'package_credits', v_package);

    select * into m from private.models where id = v_id for update;
    if not found then
      if not v_priced then continue; end if;
      insert into private.models(id, display_name, capability, provider_model_id, provider_group_id,
        parameter_schema, upstream_closed, upstream_note)
      values (v_id, coalesce(nullif(trim(v_item->>'display_name'), ''), v_id), v_capability, v_id, 'grsai-default',
        '{"type":"object","properties":{}}'::jsonb, v_closed, v_note);
      perform private.tw_sync_price_version(v_id, v_in, v_out, v_unit, 'upstream-sync', v_source);
      insert into private.upstream_changes(model_id, kind, status, proposed) values (v_id, 'new_model', 'pending', v_proposed);
      continue;
    end if;

    if m.capability <> v_capability then
      if not exists (select 1 from private.upstream_changes where model_id = m.id and kind = 'capability_changed'
          and status in ('pending', 'dismissed') and proposed->>'capability' = v_capability) then
        insert into private.upstream_changes(model_id, kind, status, previous, proposed)
        values (m.id, 'capability_changed', 'pending', jsonb_build_object('capability', m.capability),
          jsonb_build_object('capability', v_capability, 'upstream', v_item));
        perform private.tw_sync_disable(m.id, 'capability_changed');
      end if;
      continue;
    end if;

    -- Availability first, so a reopened model is re-enabled only after its price is current.
    if v_closed and not m.upstream_closed then
      insert into private.upstream_changes(model_id, kind, status, previous, proposed)
      values (m.id, 'closed', 'applied', jsonb_build_object('enabled', m.enabled), jsonb_build_object('note', v_note));
      perform private.tw_sync_disable(m.id, 'upstream_closed');
    elsif not v_closed and m.upstream_closed then
      insert into private.upstream_changes(model_id, kind, status, previous, proposed)
      values (m.id, 'reopened', 'applied', jsonb_build_object('note', m.upstream_note), null);
    end if;
    update private.models set upstream_closed = v_closed, upstream_note = v_note where id = m.id;

    if v_priced then
      select * into p from private.model_prices where model_id = m.id and version = m.current_price_version;
      if not found then
        perform private.tw_sync_price_version(m.id, v_in, v_out, v_unit, 'upstream-sync', v_source);
        insert into private.upstream_changes(model_id, kind, status, proposed) values (m.id, 'new_model', 'pending', v_proposed);
      else
        v_new := array[v_in, v_out, v_unit];
        v_old := array[p.provider_input_micros_per_million, p.provider_output_micros_per_million, p.provider_micros_per_unit];
        v_previous := jsonb_build_object('version', p.version, 'input_micros', p.provider_input_micros_per_million::text,
          'output_micros', p.provider_output_micros_per_million::text, 'unit_micros', p.provider_micros_per_unit::text);
        if v_new is not distinct from v_old then
          update private.upstream_changes set status = 'superseded' where model_id = m.id and status = 'pending'
            and kind in ('price_decrease', 'suspicious_price');
        else
          v_suspicious := false; v_up := false;
          for i in 1..3 loop
            if v_new[i] is distinct from v_old[i] then
              if v_new[i] is null or v_old[i] is null or v_old[i] = 0
                or v_new[i] > v_old[i] * 3 or v_new[i] * 3 < v_old[i] then v_suspicious := true; end if;
              if v_new[i] > v_old[i] then v_up := true; end if;
            end if;
          end loop;
          v_kind := case when v_suspicious then 'suspicious_price' when v_up then 'price_increase' else 'price_decrease' end;
          -- The same proposal is raised once; an admin's dismissal also stands until upstream moves again.
          select * into v_last from private.upstream_changes where model_id = m.id
            and kind in ('price_decrease', 'suspicious_price') order by id desc limit 1;
          if v_kind <> 'price_increase' and found and v_last.kind = v_kind and v_last.status in ('pending', 'dismissed')
            and v_last.proposed->>'input_micros' is not distinct from v_in::text
            and v_last.proposed->>'output_micros' is not distinct from v_out::text
            and v_last.proposed->>'unit_micros' is not distinct from v_unit::text then
            null;
          else
            update private.upstream_changes set status = 'superseded' where model_id = m.id and status = 'pending'
              and kind in ('price_decrease', 'suspicious_price');
            if v_kind = 'price_increase' then
              perform private.tw_sync_price_version(m.id, v_in, v_out, v_unit, 'upstream-sync', v_source);
              insert into private.upstream_changes(model_id, kind, status, previous, proposed)
              values (m.id, v_kind, 'applied', v_previous, v_proposed);
            else
              insert into private.upstream_changes(model_id, kind, status, previous, proposed)
              values (m.id, v_kind, 'pending', v_previous, v_proposed);
              if v_kind = 'suspicious_price' then perform private.tw_sync_disable(m.id, 'suspicious_price'); end if;
            end if;
          end if;
        end if;
      end if;
    end if;
    perform private.tw_sync_reenable(m.id);
  end loop;

  for m in select * from private.models where provider_group_id = 'grsai-default' and capability in ('text', 'image')
      and not upstream_closed and not (id = any(v_seen)) for update loop
    update private.models set upstream_closed = true, upstream_note = 'Not in the GrsAI model list' where id = m.id;
    insert into private.upstream_changes(model_id, kind, status, previous)
    values (m.id, 'missing', 'applied', jsonb_build_object('enabled', m.enabled));
    perform private.tw_sync_disable(m.id, 'upstream_missing');
  end loop;

  update private.upstream_sync_state set last_attempt_at = now(), last_success_at = now(), consecutive_failures = 0,
    failure_alerted = false, last_error = null, package_amount_minor = v_amount, package_credits = v_package,
    model_count = v_count, snapshot = p_snapshot where singleton;
  -- now() is the transaction start, so this selects exactly the changes of this run.
  return jsonb_build_object('status', 'synced', 'models', v_count, 'changes', (select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'model', c.model_id, 'kind', c.kind, 'status', c.status, 'previous', c.previous,
    'proposed', c.proposed - 'upstream') order by c.id), '[]'::jsonb)
    from private.upstream_changes c where c.created_at = now()));
end $$;

create or replace function public.tw_admin_resolve_upstream_change(p_actor uuid, p_reason text, p_change_id bigint, p_apply boolean)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
declare c private.upstream_changes%rowtype;
begin
  if length(trim(coalesce(p_reason, ''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  perform pg_advisory_xact_lock(hashtext('tw_sync_upstream_catalog'));
  select * into c from private.upstream_changes where id = p_change_id for update;
  if not found or c.status <> 'pending' then raise exception 'upstream_change_not_pending'; end if;
  if p_apply and c.kind = 'capability_changed' then raise exception 'upstream_change_not_applicable'; end if;
  if p_apply and c.kind in ('price_decrease', 'suspicious_price') then
    perform private.tw_sync_price_version(c.model_id, (c.proposed->>'input_micros')::bigint,
      (c.proposed->>'output_micros')::bigint, (c.proposed->>'unit_micros')::bigint, p_actor::text,
      'Admin-approved GrsAI price (change ' || c.id || '): ' || trim(p_reason));
  end if;
  update private.upstream_changes set status = case when p_apply then 'applied' else 'dismissed' end,
    resolved_at = now(), resolved_by = p_actor, resolution_reason = trim(p_reason) where id = c.id;
  if c.kind = 'suspicious_price' then
    if p_apply then perform private.tw_sync_reenable(c.model_id);
    else
      -- Dismissed: the admin keeps the current price and decides enablement manually.
      update private.models set sync_disabled_reason = null where id = c.model_id and sync_disabled_reason = 'suspicious_price';
    end if;
  end if;
  insert into private.audit_log(actor, action, subject, reason, metadata)
  values (p_actor, case when p_apply then 'upstream_change_applied' else 'upstream_change_dismissed' end, c.model_id,
    trim(p_reason), jsonb_build_object('change_id', c.id, 'kind', c.kind, 'proposed', c.proposed - 'upstream'));
end $$;

create or replace function public.tw_admin_upstream_sync()
returns jsonb language sql stable security definer set search_path = pg_catalog, private as $$
  select jsonb_build_object(
    'state', (select jsonb_build_object('last_attempt_at', last_attempt_at, 'last_success_at', last_success_at,
      'consecutive_failures', consecutive_failures, 'last_error', last_error,
      'package_amount_minor', package_amount_minor, 'package_credits', package_credits::text, 'model_count', model_count)
      from private.upstream_sync_state where singleton),
    'changes', (select coalesce(jsonb_agg(item order by pending desc, id desc), '[]'::jsonb) from (
      select c.id, c.status = 'pending' as pending, jsonb_build_object('id', c.id, 'model', c.model_id,
        'name', m.display_name, 'capability', m.capability, 'kind', c.kind, 'status', c.status,
        'previous', c.previous, 'proposed', c.proposed - 'upstream', 'note', c.proposed->'upstream'->>'note',
        'created_at', c.created_at, 'resolved_at', c.resolved_at, 'resolution_reason', c.resolution_reason) as item
      from private.upstream_changes c join private.models m on m.id = c.model_id
      where c.status = 'pending' or c.created_at > now() - interval '30 days'
      order by c.status = 'pending' desc, c.id desc limit 200) recent))
$$;

-- Admin toggles now also clear a sync reason, and a model GrsAI has closed stays off.
create or replace function public.tw_admin_set_model_enabled(p_actor uuid, p_reason text, p_model_id text, p_enabled boolean)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
declare m private.models%rowtype; p private.model_prices%rowtype;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  select * into m from private.models where id=p_model_id for update;
  if not found then raise exception 'model_unavailable'; end if;
  if p_enabled then
    if m.upstream_closed then raise exception 'model_upstream_closed'; end if;
    select * into p from private.model_prices where model_id=m.id and version=m.current_price_version;
    if not found or p.verified_at is null
      or not ((m.capability='text' and p.unit='tokens' and p.provider_input_micros_per_million is not null
          and p.provider_output_micros_per_million is not null and p.max_input_tokens is not null and p.max_output_tokens is not null)
        or (m.capability='image' and p.unit='request' and p.provider_micros_per_unit is not null and p.max_units is not null)
        or (m.capability='video' and p.unit='second' and p.provider_micros_per_unit is not null and p.max_units is not null))
      or jsonb_typeof(m.parameter_schema)<>'object' or m.parameter_schema->>'type' is distinct from 'object'
      or jsonb_typeof(m.parameter_schema->'properties') is distinct from 'object' then raise exception 'pricing_unavailable'; end if;
  end if;
  update private.models set enabled=p_enabled,sync_disabled_reason=null,updated_at=now() where id=m.id;
  insert into private.audit_log(actor,action,subject,reason,metadata)
  values(p_actor,case when p_enabled then 'model_enabled' else 'model_disabled' end,m.id,trim(p_reason),
    jsonb_build_object('price_version',m.current_price_version));
end $$;

create or replace function public.tw_admin_model_catalog()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name,'capability',m.capability,
    'enabled',m.enabled,'provider_model_id',m.provider_model_id,'current_price_version',m.current_price_version,
    'price_verified_at',p.verified_at,'max_input_tokens',p.max_input_tokens,
    'max_output_tokens',p.max_output_tokens,'max_units',p.max_units,'unit',p.unit,
    'input_micros',p.provider_input_micros_per_million::text,'output_micros',p.provider_output_micros_per_million::text,
    'unit_micros',p.provider_micros_per_unit::text,'markup_bps',p.markup_bps::text,'source_note',p.source_note,
    'parameter_schema',m.parameter_schema,'responses_api',m.responses_api,'upstream_closed',m.upstream_closed,
    'upstream_note',m.upstream_note,'sync_disabled_reason',m.sync_disabled_reason) order by m.capability,m.id),'[]'::jsonb)
  from private.models m left join private.model_prices p
    on p.model_id=m.id and p.version=m.current_price_version
$$;

revoke all on function private.tw_credits_to_micros(bigint,bigint,bigint) from public;
revoke all on function private.tw_sync_price_version(text,bigint,bigint,bigint,text,text) from public;
revoke all on function private.tw_sync_disable(text,text) from public;
revoke all on function private.tw_sync_reenable(text) from public;
revoke all on function private.tw_record_sync_failure(text) from public;
revoke all on function public.tw_record_upstream_sync_failure(text) from public, anon, authenticated;
revoke all on function public.tw_sync_upstream_catalog(jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.tw_admin_resolve_upstream_change(uuid,text,bigint,boolean) from public, anon, authenticated;
revoke all on function public.tw_admin_upstream_sync() from public, anon, authenticated;
revoke all on function public.tw_admin_set_model_enabled(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.tw_admin_model_catalog() from public, anon, authenticated;
grant execute on function public.tw_record_upstream_sync_failure(text) to service_role;
grant execute on function public.tw_sync_upstream_catalog(jsonb,uuid,text) to service_role;
grant execute on function public.tw_admin_resolve_upstream_change(uuid,text,bigint,boolean) to service_role;
grant execute on function public.tw_admin_upstream_sync() to service_role;
grant execute on function public.tw_admin_set_model_enabled(uuid,text,text,boolean) to service_role;
grant execute on function public.tw_admin_model_catalog() to service_role;
