-- A reservation is released exactly once, even if a late definite failure arrives
-- after the 24-hour unknown-release already returned the credits.
create or replace function public.tw_fail_generation(p_request_id uuid, p_error_category text, p_ambiguous boolean default false)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare r private.generation_requests%rowtype;
begin
  select * into r from private.generation_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if r.state in ('failed','succeeded','expired') or r.reservation_released_at is not null then
    return jsonb_build_object('request_id',r.id,'state',r.state);
  end if;
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

-- Never delete the encrypted payload of a job that has not been submitted yet: a queue
-- backlog would otherwise turn it into an unsubmittable job.
create or replace function public.tw_expired_objects()
returns jsonb language sql security definer set search_path = pg_catalog, private as $$
  with candidates as (
    select id, state, result_object_keys, payload_object_key from private.generation_requests
    where (state='succeeded' and result_expires_at<=now())
       or (state='unknown' and result_object_keys<>'[]'::jsonb and updated_at<now()-interval '1 hour')
       or (payload_object_key is not null and state not in ('queued','submitting') and created_at<now()-interval '1 hour')
    order by coalesce(result_expires_at, created_at+interval '1 hour') limit 100
  )
  select coalesce(jsonb_agg(jsonb_build_object('request_id',id,'state',state,'result_keys',result_object_keys,
    'payload_key',payload_object_key)), '[]'::jsonb) from candidates
$$;

-- Avoid a row write (and row-lock contention) on every authenticated request.
create or replace function public.tw_authenticate_api_key(p_secret_hash bytea)
returns jsonb language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_key private.api_keys%rowtype;
begin
  select * into v_key from private.api_keys k where k.secret_hash = p_secret_hash and k.revoked_at is null;
  if not found then return null; end if;
  if v_key.last_used_at is null or v_key.last_used_at < now()-interval '1 minute' then
    update private.api_keys set last_used_at = now() where id = v_key.id;
  end if;
  return jsonb_build_object('account_id', v_key.account_id, 'key_id', v_key.id, 'name', v_key.name);
end $$;
