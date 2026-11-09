-- ═════════════════════════════════════════════════════════════════════════════
-- Two account types (student, parent) and guardian links.
--
-- Linking rule (the core security property):
--   A student names a guardian EMAIL. A parent account becomes linked only when its
--   owner has CONFIRMED that exact email address (Supabase Auth email confirmation or
--   accepted invitation). Typing someone's address never grants access by itself.
--
-- What a parent can see: their linked children's profile basics, progress, session list
-- (subject, date, number of questions) and exercise results — NOT chat contents, session titles
-- (they are derived from the child's words), documents or safety logs.
-- ═════════════════════════════════════════════════════════════════════════════

create table public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  guardian_email text not null check (
    guardian_email = lower(guardian_email)
    and char_length(guardian_email) <= 254
    and guardian_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  parent_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  invited_at timestamptz,
  invite_count integer not null default 0 check (invite_count between 0 and 5),
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, guardian_email),
  constraint active_has_parent check (status <> 'active' or parent_id is not null)
);
create index guardian_links_email_pending_idx on public.guardian_links (guardian_email) where status = 'pending';
create index guardian_links_parent_idx on public.guardian_links (parent_id) where status = 'active';

alter table public.guardian_links enable row level security;
-- Supabase's default privileges auto-grant new tables to client roles: revoke, then grant back read only
revoke all on public.guardian_links from anon, authenticated;
grant select on public.guardian_links to authenticated;
grant all on public.guardian_links to service_role;
create policy "guardian_links: student or linked parent can read" on public.guardian_links
  for select to authenticated
  using (student_id = (select auth.uid()) or parent_id = (select auth.uid()));
-- no insert/update/delete for clients: changes go through the functions below

-- ── sign-up: validates metadata per account type; aborts sign-up on any violation ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  kind text := coalesce(meta ->> 'account_type', 'student');
  nick text := btrim(coalesce(meta ->> 'display_name', ''));
  band text := coalesce(meta ->> 'age_band', '');
  consent boolean := coalesce((meta ->> 'guardian_consent')::boolean, false);
  g_email text := nullif(lower(btrim(coalesce(meta ->> 'guardian_email', ''))), '');
  lang text := case when meta ->> 'preferred_language' in ('auto', 'en', 'fr', 'ar', 'tn') then meta ->> 'preferred_language' else 'auto' end;
begin
  if kind not in ('student', 'parent') then
    raise exception 'invalid_account_type' using errcode = '22023';
  end if;
  if char_length(nick) < 2 or char_length(nick) > 40 then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;

  if kind = 'parent' then
    insert into public.profiles (id, account_type, display_name, preferred_language)
    values (new.id, 'parent', nick, lang);
    insert into public.security_events (user_id, event, severity) values (new.id, 'parent_account_created', 'info');
    return new;
  end if;

  if band not in ('under_13', '13_15', '16_17', '18_plus') then
    raise exception 'invalid_age_band' using errcode = '22023';
  end if;
  if band <> '18_plus' then
    if not consent then
      raise exception 'guardian_consent_required' using errcode = '22023';
    end if;
    if g_email is null then
      raise exception 'guardian_email_required' using errcode = '22023';
    end if;
  end if;
  if g_email is not null then
    if g_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(g_email) > 254 then
      raise exception 'invalid_guardian_email' using errcode = '22023';
    end if;
    if g_email = lower(new.email) then
      raise exception 'guardian_email_must_differ' using errcode = '22023';
    end if;
  end if;

  insert into public.profiles (id, account_type, display_name, age_band, guardian_consent_at, preferred_language)
  values (new.id, 'student', nick, band, case when consent then now() end, lang);
  if g_email is not null then
    insert into public.guardian_links (student_id, guardian_email) values (new.id, g_email);
  end if;
  insert into public.security_events (user_id, event, severity) values (new.id, 'account_created', 'info');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── parent: claim every pending link addressed to the parent's CONFIRMED email ──
create or replace function public.claim_guardian_links()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  confirmed_email text;
  n integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = uid and account_type = 'parent') then
    raise exception 'parents_only' using errcode = '42501';
  end if;
  select lower(u.email) into confirmed_email
  from auth.users u
  where u.id = uid and u.email_confirmed_at is not null;
  if confirmed_email is null then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;

  update public.guardian_links
  set parent_id = uid, status = 'active', linked_at = now()
  where guardian_email = confirmed_email and status = 'pending';
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.security_events (user_id, event, severity, meta)
    values (uid, 'guardian_linked', 'info', jsonb_build_object('links', n));
  end if;
  return n;
end;
$$;

-- ── parent dashboard data: aggregates only, for actively linked children ──
create or replace function public.get_children_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and account_type = 'parent') then
    raise exception 'parents_only' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(child order by child ->> 'display_name'), '[]'::jsonb) into result
  from (
    select jsonb_build_object(
      'student_id', p.id,
      'display_name', p.display_name,
      'age_band', p.age_band,
      'linked_at', gl.linked_at,
      'member_since', p.created_at,
      'progress', coalesce((
        select jsonb_agg(jsonb_build_object(
          'subject_id', pr.subject_id,
          'subject_name', s.name,
          'mentor_id', s.mentor_id,
          'sessions', pr.sessions_count,
          'questions', pr.messages_count,
          'exercises_completed', pr.exercises_completed,
          'exercises_correct', pr.exercises_correct,
          'last_activity_at', pr.last_activity_at
        ) order by pr.last_activity_at desc)
        from public.progress pr join public.subjects s on s.id = pr.subject_id
        where pr.user_id = p.id
      ), '[]'::jsonb),
      'recent_sessions', coalesce((
        select jsonb_agg(x order by x ->> 'updated_at' desc) from (
          -- the free-text title is derived from the child's own words, so parents get the SUBJECT only
          select jsonb_build_object(
            'mentor_id', se.mentor_id,
            'subject', coalesce((select sub.name from public.subjects sub where sub.id = se.subject_id), 'General'),
            'updated_at', se.updated_at,
            'questions', (select count(*) from public.messages m where m.session_id = se.id and m.role = 'user')
          ) as x
          from public.sessions se
          where se.user_id = p.id
          order by se.updated_at desc
          limit 10
        ) q
      ), '[]'::jsonb),
      'recent_exercises', coalesce((
        select jsonb_agg(x order by x ->> 'completed_at' desc) from (
          select jsonb_build_object(
            'mentor_id', e.mentor_id,
            'question', e.question,
            'is_correct', e.is_correct,
            'attempts', e.attempts,
            'completed_at', e.completed_at
          ) as x
          from public.exercises e
          where e.user_id = p.id and e.status = 'completed'
          order by e.completed_at desc
          limit 10
        ) q
      ), '[]'::jsonb)
    ) as child
    from public.guardian_links gl
    join public.profiles p on p.id = gl.student_id
    where gl.parent_id = uid and gl.status = 'active'
  ) children;
  return result;
end;
$$;

-- ── student: add a guardian email after sign-up (max 3 active/pending) ──
create or replace function public.add_guardian_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  e text := lower(btrim(coalesce(p_email, '')));
  new_id uuid;
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and account_type = 'student') then
    raise exception 'students_only' using errcode = '42501';
  end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(e) > 254 then
    raise exception 'invalid_guardian_email' using errcode = '22023';
  end if;
  if e = (select lower(email) from auth.users where id = uid) then
    raise exception 'guardian_email_must_differ' using errcode = '22023';
  end if;
  if (select count(*) from public.guardian_links where student_id = uid and status <> 'revoked') >= 3 then
    raise exception 'too_many_guardians' using errcode = '22023';
  end if;
  insert into public.guardian_links (student_id, guardian_email)
  values (uid, e)
  on conflict (student_id, guardian_email) do update
    set status = case when public.guardian_links.status = 'revoked' then 'pending' else public.guardian_links.status end,
        parent_id = case when public.guardian_links.status = 'revoked' then null else public.guardian_links.parent_id end
  returning id into new_id;
  return new_id;
end;
$$;

-- ── revoke: a parent may unlink themselves; a minor must always keep at least one guardian ──
create or replace function public.revoke_guardian_link(p_link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  link public.guardian_links;
  band text;
begin
  select * into link from public.guardian_links where id = p_link;
  if link.id is null or (link.student_id <> uid and link.parent_id is distinct from uid) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if link.student_id = uid then
    select age_band into band from public.profiles where id = uid;
    if band <> '18_plus' and (
      select count(*) from public.guardian_links
      where student_id = uid and status <> 'revoked' and id <> p_link
    ) = 0 then
      raise exception 'minors_need_a_guardian' using errcode = '22023';
    end if;
  end if;
  update public.guardian_links set status = 'revoked' where id = p_link;
  insert into public.security_events (user_id, event, severity, meta)
  values (uid, 'guardian_link_revoked', 'info', jsonb_build_object('link', p_link));
end;
$$;

-- service-only helper for the invitation flow
create or replace function public.email_has_account(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where lower(email) = lower(btrim(p_email)));
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.claim_guardian_links() from public, anon;
revoke all on function public.get_children_overview() from public, anon;
revoke all on function public.add_guardian_email(text) from public, anon;
revoke all on function public.revoke_guardian_link(uuid) from public, anon;
revoke all on function public.email_has_account(text) from public, anon, authenticated;
grant execute on function public.claim_guardian_links() to authenticated;
grant execute on function public.get_children_overview() to authenticated;
grant execute on function public.add_guardian_email(text) to authenticated;
grant execute on function public.revoke_guardian_link(uuid) to authenticated;
grant execute on function public.email_has_account(text) to service_role;
