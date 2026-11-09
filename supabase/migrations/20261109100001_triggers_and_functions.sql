-- ═════════════════════════════════════════════════════════════════════════════
-- Triggers (progress, session defaults) and server-only functions
-- (AI quota / rate limiting / kill switch, data retention).
-- ═════════════════════════════════════════════════════════════════════════════

-- default a session's subject to the mentor's top-level subject
create or replace function public.session_default_subject()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.subject_id is null then
    select s.id into new.subject_id
    from public.subjects s
    where s.mentor_id = new.mentor_id and s.parent_id is null
    order by s.id
    limit 1;
  end if;
  return new;
end;
$$;
create trigger sessions_default_subject before insert on public.sessions
  for each row execute function public.session_default_subject();

create or replace function public.progress_on_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.subject_id is not null then
    insert into public.progress (user_id, subject_id, sessions_count, last_activity_at)
    values (new.user_id, new.subject_id, 1, now())
    on conflict (user_id, subject_id)
    do update set sessions_count = public.progress.sessions_count + 1, last_activity_at = now();
  end if;
  return new;
end;
$$;
create trigger sessions_progress after insert on public.sessions
  for each row execute function public.progress_on_session();

-- count student questions and keep the session's "last activity" fresh
create or replace function public.on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  subj text;
begin
  update public.sessions set updated_at = now() where id = new.session_id returning subject_id into subj;
  if new.role = 'user' and subj is not null then
    insert into public.progress (user_id, subject_id, messages_count, last_activity_at)
    values (new.user_id, subj, 1, now())
    on conflict (user_id, subject_id)
    do update set messages_count = public.progress.messages_count + 1, last_activity_at = now();
  end if;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_insert();

create or replace function public.exercise_default_subject()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.subject_id is null then
    select coalesce(
      (select s.subject_id from public.sessions s where s.id = new.session_id),
      (select sub.id from public.subjects sub where sub.mentor_id = new.mentor_id and sub.parent_id is null order by sub.id limit 1)
    ) into new.subject_id;
  end if;
  return new;
end;
$$;
create trigger exercises_default_subject before insert on public.exercises
  for each row execute function public.exercise_default_subject();

create or replace function public.progress_on_exercise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.subject_id is not null then
    insert into public.progress (user_id, subject_id, exercises_completed, exercises_correct, last_activity_at)
    values (new.user_id, new.subject_id, 1, case when new.is_correct then 1 else 0 end, now())
    on conflict (user_id, subject_id)
    do update set
      exercises_completed = public.progress.exercises_completed + 1,
      exercises_correct = public.progress.exercises_correct + case when new.is_correct then 1 else 0 end,
      last_activity_at = now();
  end if;
  return new;
end;
$$;
create trigger exercises_progress after update on public.exercises
  for each row execute function public.progress_on_exercise();

-- ─────────────────────────────────────────────────────────────────────────────
-- consume_ai_quota: one atomic gate in front of EVERY model call.
--   • global kill switch (system_flags.ai_enabled)
--   • temporary block after repeated prompt-injection / abuse flags
--   • per-user burst (per minute) and sustained (per hour) request limits
--   • per-IP burst limit (flooding from one address with several accounts)
--   • per-user daily token budget
-- Returns { allowed, reason, retry_after_seconds, usage_id }.
-- Limits are passed by the caller so they are configurable without a migration.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.consume_ai_quota(
  p_user uuid,
  p_ip_hash text,
  p_kind text,
  p_per_minute integer,
  p_per_hour integer,
  p_ip_per_minute integer,
  p_daily_tokens integer,
  p_abuse_threshold integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  used bigint;
  new_id bigint;
begin
  -- serialise concurrent requests from the same student so limits can't be raced
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 42));

  if not coalesce((select enabled from public.system_flags where key = 'ai_enabled'), true) then
    return jsonb_build_object('allowed', false, 'reason', 'ai_disabled', 'retry_after_seconds', 300);
  end if;

  select count(*) into n from public.security_events
  where user_id = p_user and event in ('prompt_injection', 'abuse') and created_at > now() - interval '1 hour';
  if n >= p_abuse_threshold then
    return jsonb_build_object('allowed', false, 'reason', 'temporarily_blocked', 'retry_after_seconds', 3600);
  end if;

  select count(*) into n from public.ai_usage where user_id = p_user and created_at > now() - interval '1 minute';
  if n >= p_per_minute then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retry_after_seconds', 60);
  end if;

  select count(*) into n from public.ai_usage where user_id = p_user and created_at > now() - interval '1 hour';
  if n >= p_per_hour then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retry_after_seconds', 900);
  end if;

  if p_ip_hash is not null then
    select count(*) into n from public.ai_usage where ip_hash = p_ip_hash and created_at > now() - interval '1 minute';
    if n >= p_ip_per_minute then
      return jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retry_after_seconds', 60);
    end if;
  end if;

  select coalesce(sum(prompt_tokens + completion_tokens), 0) into used
  from public.ai_usage where user_id = p_user and created_at > now() - interval '24 hours';
  if used >= p_daily_tokens then
    return jsonb_build_object('allowed', false, 'reason', 'token_budget_exhausted', 'retry_after_seconds', 3600);
  end if;

  insert into public.ai_usage (user_id, ip_hash, kind) values (p_user, p_ip_hash, p_kind) returning id into new_id;
  return jsonb_build_object('allowed', true, 'usage_id', new_id, 'tokens_used_today', used);
end;
$$;

create or replace function public.record_ai_tokens(p_usage_id bigint, p_prompt integer, p_completion integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set prompt_tokens = greatest(0, p_prompt), completion_tokens = greatest(0, p_completion)
  where id = p_usage_id;
$$;

-- Data retention for operational logs (schedule daily with pg_cron on the hosted project).
create or replace function public.purge_operational_data()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ai_usage where created_at < now() - interval '30 days';
  delete from public.security_events where created_at < now() - interval '180 days';
$$;

-- These are server-only: no client role may call them.
revoke all on function public.consume_ai_quota(uuid, text, text, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.record_ai_tokens(bigint, integer, integer) from public, anon, authenticated;
revoke all on function public.purge_operational_data() from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, text, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.record_ai_tokens(bigint, integer, integer) to service_role;
grant execute on function public.purge_operational_data() to service_role;
