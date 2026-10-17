-- Product announcements for signed-in customers: administrators paste a title and
-- plain-text body in the admin panel; every publish, edit and deletion is audited.

create table private.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 160),
  body text not null check (length(body) between 1 and 20000),
  category text not null check (category in ('feature','important','platform')),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index announcements_recent on private.announcements(published_at desc);

create or replace function public.tw_list_announcements()
returns jsonb language sql stable security definer set search_path = pg_catalog, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'category',category,
    'published_at',published_at,'updated_at',updated_at) order by published_at desc),'[]'::jsonb)
  from (select * from private.announcements order by published_at desc limit 200) recent
$$;

-- p_id null publishes a new announcement; otherwise it edits one in place.
create or replace function public.tw_admin_save_announcement(p_actor uuid, p_id uuid, p_title text, p_body text, p_category text)
returns uuid language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_id uuid;
begin
  begin
    if p_id is null then
      insert into private.announcements(title, body, category)
      values (trim(p_title), trim(p_body), p_category) returning id into v_id;
    else
      update private.announcements set title=trim(p_title), body=trim(p_body), category=p_category, updated_at=now()
        where id=p_id returning id into v_id;
      if v_id is null then raise exception 'announcement_not_found'; end if;
    end if;
  exception when check_violation or not_null_violation then raise exception 'invalid_announcement';
  end;
  insert into private.audit_log(actor,action,subject,reason,metadata)
  values (p_actor, case when p_id is null then 'announcement_published' else 'announcement_edited' end, v_id::text,
    'announcement', jsonb_build_object('title',trim(p_title),'category',p_category));
  return v_id;
end $$;

create or replace function public.tw_admin_delete_announcement(p_actor uuid, p_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, private as $$
declare v_title text;
begin
  delete from private.announcements where id=p_id returning title into v_title;
  if v_title is null then raise exception 'announcement_not_found'; end if;
  insert into private.audit_log(actor,action,subject,reason,metadata)
  values (p_actor, 'announcement_deleted', p_id::text, 'announcement', jsonb_build_object('title',v_title));
end $$;

revoke all on table private.announcements from public, anon, authenticated, service_role;
revoke all on function public.tw_list_announcements() from public, anon, authenticated;
revoke all on function public.tw_admin_save_announcement(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.tw_admin_delete_announcement(uuid,uuid) from public, anon, authenticated;
grant execute on function public.tw_list_announcements() to service_role;
grant execute on function public.tw_admin_save_announcement(uuid,uuid,text,text,text) to service_role;
grant execute on function public.tw_admin_delete_announcement(uuid,uuid) to service_role;
