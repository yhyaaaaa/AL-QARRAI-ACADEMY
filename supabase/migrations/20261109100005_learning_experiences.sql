-- ═════════════════════════════════════════════════════════════════════════════
-- Learning experiences: learner preferences, generated learning items
-- (quiz, summary, mind map, flashcards, key terms, teach-back, game, diagnostic),
-- attempts (server-checked) and flashcard reviews.
--
-- Security model (unchanged): students read their own rows; answers and rubrics
-- (learning_items.solution) are NEVER readable by clients; scored attempts are
-- written only by the mentor-response function. Flashcard "known / needs practice"
-- is a self-assessment, so students may write it themselves.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── learner preferences (explicitly chosen by the learner, never inferred) ──
alter table public.profiles
  add column level text not null default 'intermediate'
    check (level in ('beginner', 'intermediate', 'advanced')),
  add column learning_styles text[] not null default '{}'
    check (learning_styles <@ array['visual', 'analogies', 'step_by_step', 'practical', 'repetition', 'direct']::text[]),
  add column goals text check (char_length(goals) <= 300),
  -- accessibility & comfort settings: { textSize, highContrast, spacing, reducedMotion,
  -- focusMode, readAloud, sounds, simplified, breakReminders } — validated in the app
  add column accessibility jsonb not null default '{}'::jsonb
    check (jsonb_typeof(accessibility) = 'object' and pg_column_size(accessibility) < 2048),
  add column onboarded_at timestamptz;

grant update (level, learning_styles, goals, accessibility, onboarded_at) on public.profiles to authenticated;

-- ── generated learning items ──
create table public.learning_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mentor_id text not null references public.mentors (id) on delete restrict,
  subject_id text references public.subjects (id) on delete set null,
  kind text not null check (kind in ('quiz', 'summary', 'mindmap', 'flashcards', 'keyterms', 'teachback', 'game', 'diagnostic')),
  topic text not null check (char_length(topic) between 1 and 200),
  language text not null default 'auto' check (language in ('auto', 'en', 'fr', 'ar', 'tn')),
  options jsonb not null default '{}'::jsonb,
  -- what the student sees
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  -- answers, explanations of answers, rubrics: server-side only
  solution jsonb not null default '{}'::jsonb,
  -- validation metadata (models, attempts, latency) for transparency
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index learning_items_user_idx on public.learning_items (user_id, created_at desc);
create index learning_items_user_kind_idx on public.learning_items (user_id, mentor_id, kind);

create or replace function public.learning_item_default_subject()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.subject_id is null then
    select s.id into new.subject_id from public.subjects s
    where s.mentor_id = new.mentor_id and s.parent_id is null order by s.id limit 1;
  end if;
  return new;
end;
$$;
create trigger learning_items_default_subject before insert on public.learning_items
  for each row execute function public.learning_item_default_subject();

-- ── attempts (answers checked on the server) ──
create table public.activity_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.learning_items (id) on delete cascade,
  mentor_id text not null references public.mentors (id) on delete restrict,
  kind text not null,
  part integer not null default 0 check (part between 0 and 50),
  answer jsonb not null,
  is_correct boolean,
  -- teach-back: understanding 0–3; quiz/game: 0 or 1
  score numeric(4, 2),
  points integer not null default 0 check (points between 0 and 100),
  hint_used boolean not null default false,
  feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_attempts_user_idx on public.activity_attempts (user_id, created_at desc);
create index activity_attempts_item_idx on public.activity_attempts (item_id, part);

-- ── flashcard self-assessment ──
create table public.flashcard_reviews (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.learning_items (id) on delete cascade,
  card_index integer not null check (card_index between 0 and 50),
  status text not null check (status in ('known', 'practice')),
  reviewed_at timestamptz not null default now(),
  primary key (user_id, item_id, card_index)
);

-- ── RLS & privileges (Supabase auto-grants new tables: revoke first) ──
alter table public.learning_items enable row level security;
alter table public.activity_attempts enable row level security;
alter table public.flashcard_reviews enable row level security;
revoke all on public.learning_items, public.activity_attempts, public.flashcard_reviews from anon, authenticated;

-- learning_items: every column EXCEPT solution
grant select (id, user_id, mentor_id, subject_id, kind, topic, language, options, content, meta, created_at)
  on public.learning_items to authenticated;
grant delete on public.learning_items to authenticated;
create policy "learning_items: read own" on public.learning_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "learning_items: delete own" on public.learning_items
  for delete to authenticated using (user_id = (select auth.uid()));

grant select on public.activity_attempts to authenticated;
create policy "activity_attempts: read own" on public.activity_attempts
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.flashcard_reviews to authenticated;
create policy "flashcard_reviews: own" on public.flashcard_reviews
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_items i
      where i.id = item_id and i.user_id = (select auth.uid()) and i.kind = 'flashcards'
    )
  );

grant all on public.learning_items, public.activity_attempts, public.flashcard_reviews to service_role;

-- ── learning statistics for the progress page (runs with the caller's rights: RLS applies) ──
create or replace function public.get_learning_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with attempts as (
    select a.*, i.topic, i.kind as item_kind
    from public.activity_attempts a join public.learning_items i on i.id = a.item_id
    where a.user_id = (select auth.uid())
  ),
  quiz_results as (
    select i.id, i.mentor_id, i.topic, i.created_at,
      jsonb_array_length(i.content -> 'questions') as total,
      count(distinct a.part) filter (where a.is_correct) as correct,
      count(distinct a.part) as answered
    from public.learning_items i
    left join public.activity_attempts a on a.item_id = i.id
    where i.user_id = (select auth.uid()) and i.kind = 'quiz'
    group by i.id
  ),
  topic_accuracy as (
    select mentor_id, topic,
      count(*) filter (where is_correct is not null) as graded,
      avg(case when is_correct then 1.0 when is_correct = false then 0.0 end) as accuracy
    from attempts where item_kind in ('quiz', 'game')
    group by mentor_id, topic
  )
  select jsonb_build_object(
    'items_by_kind', coalesce((
      select jsonb_object_agg(kind, n) from (
        select kind, count(*) as n from public.learning_items where user_id = (select auth.uid()) group by kind
      ) k), '{}'::jsonb),
    'items_by_mentor', coalesce((
      select jsonb_object_agg(mentor_id, n) from (
        select mentor_id, count(*) as n from public.learning_items where user_id = (select auth.uid()) group by mentor_id
      ) m), '{}'::jsonb),
    'points', coalesce((select sum(points) from attempts), 0),
    'game_points_by_mentor', coalesce((
      select jsonb_object_agg(mentor_id, p) from (
        select mentor_id, sum(points) as p from attempts where kind = 'game' group by mentor_id
      ) g), '{}'::jsonb),
    'game_levels_by_mentor', coalesce((
      select jsonb_object_agg(mentor_id, lvl) from (
        select i.mentor_id, max((i.options ->> 'level')::int) as lvl
        from public.learning_items i
        where i.user_id = (select auth.uid()) and i.kind = 'game'
          and exists (select 1 from public.activity_attempts a where a.item_id = i.id and a.is_correct)
        group by i.mentor_id
      ) gl), '{}'::jsonb),
    'quizzes', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'mentor_id', mentor_id, 'topic', topic, 'total', total,
        'answered', answered, 'correct', correct, 'created_at', created_at) order by created_at desc)
      from (select * from quiz_results order by created_at desc limit 20) q), '[]'::jsonb),
    'teachback', coalesce((
      select jsonb_agg(jsonb_build_object('mentor_id', mentor_id, 'topic', topic, 'score', score, 'created_at', created_at)
        order by created_at desc)
      from (select * from attempts where kind = 'teachback' order by created_at desc limit 20) t), '[]'::jsonb),
    'strengths', coalesce((
      select jsonb_agg(jsonb_build_object('mentor_id', mentor_id, 'topic', topic, 'accuracy', round(accuracy, 2)))
      from (select * from topic_accuracy where graded >= 3 and accuracy >= 0.8 order by accuracy desc limit 6) s), '[]'::jsonb),
    'needs_practice', coalesce((
      select jsonb_agg(jsonb_build_object('mentor_id', mentor_id, 'topic', topic, 'accuracy', round(accuracy, 2)))
      from (select * from topic_accuracy where graded >= 2 and accuracy < 0.6 order by accuracy limit 6) w), '[]'::jsonb),
    'flashcards', jsonb_build_object(
      'known', (select count(*) from public.flashcard_reviews where user_id = (select auth.uid()) and status = 'known'),
      'practice', (select count(*) from public.flashcard_reviews where user_id = (select auth.uid()) and status = 'practice')
    ),
    'active_days', (
      select count(distinct d) from (
        select created_at::date as d from public.learning_items where user_id = (select auth.uid())
        union select created_at::date from public.messages where user_id = (select auth.uid())
      ) days),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('mentor_id', mentor_id, 'topic', topic, 'last', last) order by last desc)
      from (
        select mentor_id, topic, max(created_at) as last from public.learning_items
        where user_id = (select auth.uid()) group by mentor_id, topic order by last desc limit 15
      ) tp), '[]'::jsonb)
  );
$$;
revoke all on function public.get_learning_stats() from public, anon;
grant execute on function public.get_learning_stats() to authenticated;
