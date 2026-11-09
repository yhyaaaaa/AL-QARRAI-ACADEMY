-- ═════════════════════════════════════════════════════════════════════════════
-- Qarrai Academy — core schema (v2, hardened for an audience of minors)
--
-- Security model
--   • Students may READ only their own rows (RLS).
--   • Everything that carries trust (AI messages, grades, extracted documents,
--     progress, usage) is WRITTEN only by Edge Functions using the service role.
--   • Students may change only a few harmless columns (column-level GRANTs).
--   • Personal data is minimised: a nickname and an age band, never a real name or birth date.
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── reference data ─────────────────────────────────────────────────────────
create table public.mentors (
  id text primary key check (id ~ '^[a-z0-9]+$'),
  name text not null,
  name_ar text not null,
  domain text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  mentor_id text not null references public.mentors (id) on delete restrict,
  parent_id text references public.subjects (id) on delete restrict,
  created_at timestamptz not null default now()
);
create index subjects_mentor_idx on public.subjects (mentor_id);

-- ── profiles ───────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  account_type text not null default 'student' check (account_type in ('student', 'parent')),
  display_name text not null check (char_length(display_name) between 2 and 40),
  -- students only; parents are adults by definition
  age_band text check (age_band in ('under_13', '13_15', '16_17', '18_plus')),
  -- when a parent/guardian consent was declared at sign-up (required for every minor)
  guardian_consent_at timestamptz,
  preferred_language text not null default 'auto' check (preferred_language in ('auto', 'en', 'fr', 'ar', 'tn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint age_band_matches_type check ((account_type = 'student') = (age_band is not null)),
  constraint minors_need_consent check (account_type = 'parent' or age_band = '18_plus' or guardian_consent_at is not null)
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Sign-up handling (handle_new_user) lives in the accounts & guardians migration.

-- ── sessions ───────────────────────────────────────────────────────────────
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mentor_id text not null references public.mentors (id) on delete restrict,
  subject_id text references public.subjects (id) on delete set null,
  title text not null default 'New session' check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_user_recent_idx on public.sessions (user_id, updated_at desc);
create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

-- ── messages (written only by the mentor-response function) ────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  -- assistant: validated | fallback | safety ; user: null
  status text check (status in ('validated', 'fallback', 'safety')),
  intent text not null default 'chat' check (intent in ('chat', 'exercise')),
  document_id uuid,
  -- personal data (emails, phone numbers) was removed before storage/AI
  redacted boolean not null default false,
  -- safety / injection categories detected (never the raw matched text)
  flags text[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_session_idx on public.messages (session_id, created_at);
create index messages_user_idx on public.messages (user_id);

-- ── documents (uploaded learning material) ─────────────────────────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 200),
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  extraction_method text check (extraction_method in ('text', 'pdf', 'ocr')),
  extracted_text text check (char_length(extracted_text) <= 60000),
  char_count integer,
  -- prompt-injection patterns found in the extracted text (the text is still treated as data)
  flags text[] not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_user_idx on public.documents (user_id, created_at desc);
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.messages
  add constraint messages_document_fk foreign key (document_id) references public.documents (id) on delete set null;

-- ── exercises (generated and graded only by the server) ─────────────────────
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  mentor_id text not null references public.mentors (id) on delete restrict,
  subject_id text references public.subjects (id) on delete set null,
  question text not null check (char_length(question) between 1 and 5000),
  hints jsonb not null default '[]'::jsonb check (jsonb_typeof(hints) = 'array'),
  answer text not null,
  answer_type text not null default 'text' check (answer_type in ('numeric', 'text')),
  explanation text not null,
  status text not null default 'assigned' check (status in ('assigned', 'completed')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  student_answer text check (char_length(student_answer) <= 2000),
  is_correct boolean,
  feedback text,
  graded_by text check (graded_by in ('deterministic', 'model')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint completed_consistency check ((status = 'completed') = (completed_at is not null))
);
create index exercises_user_idx on public.exercises (user_id, created_at desc);
create index exercises_session_idx on public.exercises (session_id);

-- ── progress (maintained by triggers) ──────────────────────────────────────
create table public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null references public.subjects (id) on delete cascade,
  sessions_count integer not null default 0 check (sessions_count >= 0),
  messages_count integer not null default 0 check (messages_count >= 0),
  exercises_completed integer not null default 0 check (exercises_completed >= 0),
  exercises_correct integer not null default 0 check (exercises_correct >= 0),
  last_activity_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

-- ── operational security tables (service role only) ────────────────────────
create table public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  ip_hash text,
  event text not null check (char_length(event) <= 64),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index security_events_user_idx on public.security_events (user_id, event, created_at desc);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  ip_hash text,
  kind text not null check (kind in ('chat', 'exercise', 'grade', 'ocr')),
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);
create index ai_usage_ip_idx on public.ai_usage (ip_hash, created_at desc);

-- Global switches that can be flipped instantly without a redeploy.
create table public.system_flags (
  key text primary key,
  enabled boolean not null,
  note text,
  updated_at timestamptz not null default now()
);
insert into public.system_flags (key, enabled, note) values
  ('ai_enabled', true, 'Kill switch: set to false to stop every AI call immediately.'),
  ('signups_enabled', true, 'Informational; enforce sign-up closure in Auth settings.');

