-- Admin panel support: an editable per-account concurrency limit, a cross-account
-- request feed without prompts or outputs, a model switch that reuses the current
-- verified price version, and the full settings the panel pre-fills its forms with.

drop function public.tw_set_operational_controls(uuid,text,boolean,integer);
create function public.tw_set_operational_controls(p_actor uuid, p_reason text,
  p_accepting_requests boolean default null, p_result_ttl_hours integer default null,
  p_max_concurrent_per_account integer default null)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  if p_result_ttl_hours is not null and p_result_ttl_hours not between 1 and 48 then raise exception 'invalid_result_ttl'; end if;
  if p_max_concurrent_per_account is not null and p_max_concurrent_per_account not between 1 and 100 then
    raise exception 'invalid_concurrency_limit'; end if;
  update private.app_control set accepting_requests=coalesce(p_accepting_requests,accepting_requests),
    result_ttl_hours=coalesce(p_result_ttl_hours,result_ttl_hours),
    max_concurrent_per_account=coalesce(p_max_concurrent_per_account,max_concurrent_per_account),
    updated_at=now(),updated_by=p_actor where singleton;
  insert into private.audit_log(actor,action,subject,reason,metadata)
  values(p_actor,'operational_controls','platform',trim(p_reason),jsonb_build_object('accepting_requests',p_accepting_requests,
    'result_ttl_hours',p_result_ttl_hours,'max_concurrent_per_account',p_max_concurrent_per_account));
end $$;

create or replace function public.tw_ops_summary()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select jsonb_build_object('accepting_requests',c.accepting_requests,'result_ttl_hours',c.result_ttl_hours,
    'markup_bps',c.markup_bps,'max_concurrent_per_account',c.max_concurrent_per_account,
    'active_accounts',(select count(*) from private.accounts where not suspended),
    'active_keys',(select count(*) from private.api_keys where revoked_at is null),
    'in_flight_requests',(select count(*) from private.generation_requests where state in ('queued','submitting','provider_pending')),
    'requests_1h',(select count(*) from private.generation_requests where created_at>now()-interval '1 hour'),
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

-- Metadata only: prompts and outputs are never stored, so none can be shown.
create or replace function public.tw_admin_recent_requests(p_state text, p_limit integer)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, private as $$
begin
  if (p_state is not null and p_state not in ('active','succeeded','failed','unknown','expired'))
    or p_limit is null or p_limit not between 1 and 200 then raise exception 'invalid_usage_filter'; end if;
  return (select coalesce(jsonb_agg(item order by created_at desc),'[]'::jsonb) from (
    select r.created_at, jsonb_build_object('id',r.id,'created_at',r.created_at,'completed_at',r.completed_at,
      'account_id',r.account_id,'api_key_prefix',k.prefix,'model',r.model_id,'capability',r.capability,
      'state',r.state,'error_category',r.error_category,'input_tokens',r.input_tokens,'output_tokens',r.output_tokens,
      'units',coalesce(r.actual_units,r.reserved_units),'reserved_micros',r.reserved_customer_micros::text,
      'charged_micros',r.actual_customer_micros::text,'provider_micros',r.actual_provider_micros::text,
      'duration_ms',case when r.completed_at is null then null
        else (extract(epoch from (r.completed_at-r.created_at))*1000)::bigint end) as item
    from private.generation_requests r left join private.api_keys k on k.id=r.api_key_id
    where p_state is null
      or (p_state='active' and r.state in ('queued','submitting','provider_pending'))
      or r.state=p_state
    order by r.created_at desc limit p_limit) recent);
end $$;

-- Enabling never creates a price version: it only reuses a complete, verified one.
create or replace function public.tw_admin_set_model_enabled(p_actor uuid, p_reason text, p_model_id text, p_enabled boolean)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
declare m private.models%rowtype; p private.model_prices%rowtype;
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  select * into m from private.models where id=p_model_id for update;
  if not found then raise exception 'model_unavailable'; end if;
  if p_enabled then
    select * into p from private.model_prices where model_id=m.id and version=m.current_price_version;
    if not found or p.verified_at is null
      or not ((m.capability='text' and p.unit='tokens' and p.provider_input_micros_per_million is not null
          and p.provider_output_micros_per_million is not null and p.max_input_tokens is not null and p.max_output_tokens is not null)
        or (m.capability='image' and p.unit='request' and p.provider_micros_per_unit is not null and p.max_units is not null)
        or (m.capability='video' and p.unit='second' and p.provider_micros_per_unit is not null and p.max_units is not null))
      or jsonb_typeof(m.parameter_schema)<>'object' or m.parameter_schema->>'type' is distinct from 'object'
      or jsonb_typeof(m.parameter_schema->'properties') is distinct from 'object' then raise exception 'pricing_unavailable'; end if;
  end if;
  update private.models set enabled=p_enabled,updated_at=now() where id=m.id;
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
    'parameter_schema',m.parameter_schema,'responses_api',m.responses_api) order by m.capability,m.id),'[]'::jsonb)
  from private.models m left join private.model_prices p
    on p.model_id=m.id and p.version=m.current_price_version
$$;

create or replace function public.tw_admin_list_offers()
returns jsonb language sql stable security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'currency',currency,'amount_minor',amount_minor,
    'credits_micros',credits_micros::text,'active',active,'price_version',price_version) order by currency,amount_minor),'[]'::jsonb)
  from private.purchase_offers
$$;

revoke all on function public.tw_set_operational_controls(uuid,text,boolean,integer,integer) from public, anon, authenticated;
revoke all on function public.tw_ops_summary() from public, anon, authenticated;
revoke all on function public.tw_admin_recent_requests(text,integer) from public, anon, authenticated;
revoke all on function public.tw_admin_set_model_enabled(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.tw_admin_model_catalog() from public, anon, authenticated;
revoke all on function public.tw_admin_list_offers() from public, anon, authenticated;
grant execute on function public.tw_set_operational_controls(uuid,text,boolean,integer,integer) to service_role;
grant execute on function public.tw_ops_summary() to service_role;
grant execute on function public.tw_admin_recent_requests(text,integer) to service_role;
grant execute on function public.tw_admin_set_model_enabled(uuid,text,text,boolean) to service_role;
grant execute on function public.tw_admin_model_catalog() to service_role;
grant execute on function public.tw_admin_list_offers() to service_role;
