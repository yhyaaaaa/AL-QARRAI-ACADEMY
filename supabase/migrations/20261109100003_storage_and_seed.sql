-- ── Private storage for learning material ──────────────────────────────────
-- Paths MUST be "<auth.uid()>/<uuid>-<filename>". 10 MB max; text, PDF and images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials', 'materials', false, 10485760,
  array['text/plain', 'text/markdown', 'text/csv', 'application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "materials: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "materials: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "materials: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Reference data ─────────────────────────────────────────────────────────
insert into public.mentors (id, name, name_ar, domain, color, description) values
  ('ba9lewa',  'Ba9lewa', 'بقلوة', 'Mathematics, Logic and Statistics', '#C5A36B',
   'Analytical, patient and precise. Teaches through step-by-step reasoning and pattern recognition.'),
  ('ibnbatbuta',    'Ibn Batbuta',  'ابن بطبوطة',   'Natural Sciences',                   '#4C9C91',
   'Curious and energetic. Teaches physics, chemistry and biology through discovery and real-world examples.'),
  ('falfoul', 'Falfoul',  'فلفول',   'Linguistics and Languages',          '#D77C65',
   'Eloquent and witty. Teaches Arabic, French and English, from grammar to literature.')
on conflict (id) do update set
  name = excluded.name, name_ar = excluded.name_ar, domain = excluded.domain,
  color = excluded.color, description = excluded.description;

insert into public.subjects (id, name, mentor_id, parent_id) values
  ('mathematics', 'Mathematics, Logic & Statistics', 'ba9lewa', null),
  ('algebra', 'Algebra', 'ba9lewa', 'mathematics'),
  ('geometry', 'Geometry', 'ba9lewa', 'mathematics'),
  ('statistics', 'Probability & Statistics', 'ba9lewa', 'mathematics'),
  ('logic', 'Logic', 'ba9lewa', 'mathematics'),
  ('natural-sciences', 'Natural Sciences', 'ibnbatbuta', null),
  ('physics', 'Physics', 'ibnbatbuta', 'natural-sciences'),
  ('chemistry', 'Chemistry', 'ibnbatbuta', 'natural-sciences'),
  ('biology', 'Biology', 'ibnbatbuta', 'natural-sciences'),
  ('languages', 'Linguistics & Languages', 'falfoul', null),
  ('arabic', 'Arabic', 'falfoul', 'languages'),
  ('french', 'French', 'falfoul', 'languages'),
  ('english', 'English', 'falfoul', 'languages'),
  ('literature', 'Literature & Rhetoric', 'falfoul', 'languages')
on conflict (id) do nothing;
