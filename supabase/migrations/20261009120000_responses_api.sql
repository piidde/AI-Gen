-- OpenAI Responses API support. Live checks on 2026-10-08 confirmed native function
-- calling through the provider's /v1/responses for these GPT models only; Gemini models
-- return "model not supported" there. The model list now also exposes token limits so
-- clients (Codex, SDKs, harnesses) can size requests.
alter table private.models add column responses_api boolean not null default false;
update private.models set responses_api = true
  where id in ('gpt-6-astra', 'gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-5.5');

create or replace function public.tw_list_models()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'name', m.display_name, 'capability', m.capability,
    'prices', jsonb_build_object(
      'input_micros_per_million', case when p.provider_input_micros_per_million is null then null else ceil(p.provider_input_micros_per_million::numeric * coalesce(p.markup_bps, c.markup_bps) / 10000)::bigint::text end,
      'output_micros_per_million', case when p.provider_output_micros_per_million is null then null else ceil(p.provider_output_micros_per_million::numeric * coalesce(p.markup_bps, c.markup_bps) / 10000)::bigint::text end,
      'unit_micros', case when p.provider_micros_per_unit is null then null else ceil(p.provider_micros_per_unit::numeric * coalesce(p.markup_bps, c.markup_bps) / 10000)::bigint::text end,
    'unit', p.unit), 'price_version', p.version, 'parameters', m.parameter_schema,
    'provider_group_id', m.provider_group_id, 'max_input_tokens', p.max_input_tokens,
    'max_output_tokens', p.max_output_tokens, 'max_units', p.max_units, 'responses_api', m.responses_api)
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

create or replace function public.tw_admin_set_responses_api(p_actor uuid, p_reason text, p_model_id text, p_enabled boolean)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'reason_required'; end if;
  update private.models set responses_api = p_enabled, updated_at = now() where id = p_model_id and capability = 'text';
  if not found then raise exception 'model_unavailable'; end if;
  insert into private.audit_log(actor, action, subject, reason, metadata)
  values (p_actor, 'responses_api_configured', p_model_id, trim(p_reason), jsonb_build_object('enabled', p_enabled));
end $$;

revoke all on all tables in schema private from public, anon, authenticated, service_role;
revoke all on function public.tw_list_models() from public, anon, authenticated;
revoke all on function public.tw_admin_set_responses_api(uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.tw_list_models() to service_role;
grant execute on function public.tw_admin_set_responses_api(uuid,text,text,boolean) to service_role;
