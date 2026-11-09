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
  ('shamia',  'Shamia Al-Muhasbi', 'شامية المحاسبي', 'Mathematics, Logic and Statistics', '#4C9C91',
   'Analytical, patient and precise. Teaches through step-by-step reasoning and pattern recognition.'),
  ('draa',    'Draa Al-Mughamir',  'ذراع المغامر',   'Natural Sciences',                   '#D77C65',
   'Curious and energetic. Teaches physics, chemistry and biology through discovery and real-world examples.'),
  ('ba9lewa', 'Ba9lewa Al Fe9ah',  'بقلوة الفقاه',   'Linguistics and Languages',          '#C5A36B',
   'Eloquent and witty. Teaches Arabic, French and English, from grammar to literature.')
on conflict (id) do update set
  name = excluded.name, name_ar = excluded.name_ar, domain = excluded.domain,
  color = excluded.color, description = excluded.description;

insert into public.subjects (id, name, mentor_id, parent_id) values
  ('mathematics', 'Mathematics, Logic & Statistics', 'shamia', null),
  ('algebra', 'Algebra', 'shamia', 'mathematics'),
  ('geometry', 'Geometry', 'shamia', 'mathematics'),
  ('statistics', 'Probability & Statistics', 'shamia', 'mathematics'),
  ('logic', 'Logic', 'shamia', 'mathematics'),
  ('natural-sciences', 'Natural Sciences', 'draa', null),
  ('physics', 'Physics', 'draa', 'natural-sciences'),
  ('chemistry', 'Chemistry', 'draa', 'natural-sciences'),
  ('biology', 'Biology', 'draa', 'natural-sciences'),
  ('languages', 'Linguistics & Languages', 'ba9lewa', null),
  ('arabic', 'Arabic', 'ba9lewa', 'languages'),
  ('french', 'French', 'ba9lewa', 'languages'),
  ('english', 'English', 'ba9lewa', 'languages'),
  ('literature', 'Literature & Rhetoric', 'ba9lewa', 'languages')
on conflict (id) do nothing;
