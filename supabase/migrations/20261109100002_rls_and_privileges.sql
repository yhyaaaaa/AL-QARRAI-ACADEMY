-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security + table privileges.
-- Default-deny: privileges are revoked from client roles and granted back
-- explicitly, column by column where students may write.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.mentors          enable row level security;
alter table public.subjects         enable row level security;
alter table public.profiles         enable row level security;
alter table public.sessions         enable row level security;
alter table public.messages         enable row level security;
alter table public.documents        enable row level security;
alter table public.exercises        enable row level security;
alter table public.progress         enable row level security;
alter table public.security_events  enable row level security;
alter table public.ai_usage         enable row level security;
alter table public.system_flags     enable row level security;

-- start from zero for client roles
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- reference data: readable by everyone
grant select on public.mentors, public.subjects to anon, authenticated;
create policy "mentors: readable" on public.mentors for select to anon, authenticated using (is_active);
create policy "subjects: readable" on public.subjects for select to anon, authenticated using (true);

-- profiles: read own; may change only nickname and language
grant select on public.profiles to authenticated;
grant update (display_name, preferred_language) on public.profiles to authenticated;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- sessions: read, rename, delete own (creation happens server-side)
grant select, delete on public.sessions to authenticated;
grant update (title) on public.sessions to authenticated;
create policy "sessions: read own" on public.sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "sessions: rename own" on public.sessions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sessions: delete own" on public.sessions
  for delete to authenticated using (user_id = (select auth.uid()));

-- messages / progress: read-only for the owner
grant select on public.messages, public.progress to authenticated;
create policy "messages: read own" on public.messages
  for select to authenticated using (user_id = (select auth.uid()));

-- exercises: NOT readable directly — the answer must stay secret until the exercise is completed.
-- Students read them through my_exercises, which masks answer/explanation while unsolved.
create policy "exercises: read own" on public.exercises
  for select to authenticated using (user_id = (select auth.uid()));
create view public.my_exercises
with (security_barrier = true)
as
select
  e.id, e.user_id, e.session_id, e.message_id, e.mentor_id, e.subject_id,
  e.question, e.hints, e.answer_type, e.status, e.attempts, e.student_answer,
  e.is_correct, e.feedback, e.graded_by, e.created_at, e.completed_at,
  case when e.status = 'completed' then e.answer end as answer,
  case when e.status = 'completed' then e.explanation end as explanation
from public.exercises e
where e.user_id = (select auth.uid());
-- the view runs with its owner's rights (needed to read the masked columns) and filters by auth.uid()
revoke all on public.my_exercises from anon, authenticated;
grant select on public.my_exercises to authenticated;
create policy "progress: read own" on public.progress
  for select to authenticated using (user_id = (select auth.uid()));

-- documents: read and delete own (upload is processed server-side)
grant select, delete on public.documents to authenticated;
create policy "documents: read own" on public.documents
  for select to authenticated using (user_id = (select auth.uid()));
create policy "documents: delete own" on public.documents
  for delete to authenticated using (user_id = (select auth.uid()));

-- security_events, ai_usage, system_flags: no client access at all (RLS on, no policies, no grants)

-- service role (Edge Functions) keeps full access
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
