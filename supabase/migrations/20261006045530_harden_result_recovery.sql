-- Access expiry remains stable after physical cleanup. Safe result delivery can
-- retry an accepted provider job, but never submit a second generation.
alter table private.generation_requests add column result_delivery_attempts integer not null default 0;

create or replace function public.tw_get_result(p_account_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare r private.generation_requests%rowtype;
begin
  select * into r from private.generation_requests where id=p_request_id and account_id=p_account_id;
  if not found then raise exception 'request_not_found'; end if;
  if r.state='expired' then raise exception 'result_expired'; end if;
  if r.state <> 'succeeded' then raise exception 'result_not_ready'; end if;
  if r.result_expires_at <= now() then raise exception 'result_expired'; end if;
  return coalesce(r.result_manifest,'{}'::jsonb);
end $$;

create or replace function public.tw_claim_media_poll(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare r private.generation_requests%rowtype;
begin
  update private.generation_requests set last_polled_at=now(), poll_after=now()+interval '15 minutes', updated_at=now()
    where id=p_request_id and state='provider_pending' and (poll_after is null or poll_after <= now())
    returning * into r;
  if not found then return null; end if;
  return jsonb_build_object('request_id',r.id,'provider_request_id',r.provider_request_id,
    'provider_key_id',r.provider_key_id,'provider_group_id',r.provider_group_id,'model_id',r.model_id,
    'capability',r.capability,'reserved_units',r.reserved_units);
end $$;

create or replace function public.tw_mark_media_pending(p_request_id uuid, p_provider_request_id text, p_provider_key_id text)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.generation_requests set state='provider_pending', provider_request_id=p_provider_request_id,
    provider_key_id=p_provider_key_id, poll_after=now()+interval '15 minutes', updated_at=now()
    where id=p_request_id and state='submitting' and provider_key_id=p_provider_key_id;
  return found;
end $$;

create or replace function public.tw_begin_result_delivery(p_request_id uuid)
returns integer language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_attempt integer;
begin
  update private.generation_requests set result_delivery_attempts=result_delivery_attempts+1,
    poll_after=now()+interval '15 minutes',updated_at=now()
    where id=p_request_id and state='provider_pending'
    returning result_delivery_attempts into v_attempt;
  return v_attempt;
end $$;
revoke all on function public.tw_begin_result_delivery(uuid) from public, anon, authenticated;
grant execute on function public.tw_begin_result_delivery(uuid) to service_role;

-- Renew before each bounded download so large manifests do not outlive the poll lease.
create or replace function public.tw_extend_result_delivery(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, private as $$
begin
  update private.generation_requests set poll_after=now()+interval '15 minutes',updated_at=now()
    where id=p_request_id and state='provider_pending';
  return found;
end $$;
revoke all on function public.tw_extend_result_delivery(uuid) from public, anon, authenticated;
grant execute on function public.tw_extend_result_delivery(uuid) to service_role;
