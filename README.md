# Qarrai Academy

**The Modern House of Knowledge.** An AI-powered learning platform for children and teenagers, built around three specialised AI mentors who share one tutoring engine. That engine validates every answer before a student sees it, and parents can follow their child's progress.

| Mentor                       | Character                                | Domain                          | Method                                                                 |
| ---------------------------- | ---------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| **Ba9lewa** · بقلوة          | a baklava with glasses, ruler and pencil | Mathematics, logic & statistics | Small steps, the reason behind each formula, finding misunderstandings |
| **Ibn Batbuta** · ابن بطبوطة | a batbout-bread explorer                 | Physics, chemistry & biology    | Everyday examples, thought experiments, discovery                      |
| **Falfoul** · فلفول          | a gummy-bear scholar                     | Arabic, French & English        | Rules through examples, kind corrections, correctness vs style         |

Each character has four illustrated states (idle, listening, thinking, talking) that follow what the learner is doing.

## What a learner can do

With every mentor, on any topic they choose:

- **Understand:** Chat & Explain · Ask-Why (follow-up questions suggested) · Smart Summary (very short / standard / detailed) · Key Terms (with pronunciation) · Mind Map (zoomable graph or list view)
- **Practise:** Interactive Quiz (multiple choice, true/false, short answer; hints, explanations, score) · Flashcards (flip, known / needs practice) · STEM Game (match, order and choose; points and levels)
- **Prove it:** Teach Me Back (explain in your own words; the mentor evaluates understanding and misconceptions)

Every generated activity is validated before it is shown and checked on the server when answered (answers never reach the browser early). Everything is saved and can be reopened.

**Personal, not generic:** a short onboarding (nickname, language, level, explanation styles, comfort settings, optional warm-up that suggests a level) shapes every answer. Interface in **English, French, Arabic and Tunisian Darija**, with full right-to-left layout. Comfort settings change behaviour, not just labels: larger text, high contrast, wider spacing, reduced motion, focus mode, read-aloud, simpler explanations, break reminders. The platform never asks about or infers medical conditions.

**Progress from real data:** dashboard, Progress page (charts with table equivalents, strengths, topics to practise, teach-back results) and achievements derived from stored activity. Parents see aggregates only.

Everything is real: Supabase Auth, PostgreSQL with Row Level Security, Storage, Edge Functions, and the organisers' OpenAI-compatible models. There is **no demo or simulated mode**: if a service is unavailable, the student gets a clear error.

## Run it locally

Prerequisites: Node 22+, Docker Desktop (running).

```bash
npm install
```

```bash
npx supabase start
```

The first run downloads the Supabase images. This starts Postgres, Auth, Storage, the Edge Functions runtime, Studio (http://127.0.0.1:54323) and Mailpit (http://127.0.0.1:54324, where local emails arrive).

**1. Frontend config.** Copy `.env.example` to `.env`, then fill it from `npx supabase status`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key>
```

**2. Server secrets.** Copy `supabase/functions/.env.example` to `supabase/functions/.env` and set at least `AI_BASE_URL`, `AI_API_KEY` and `IP_HASH_SALT`. This file is git-ignored and never reaches the browser. Restart so the functions load it:

```bash
npx supabase stop && npx supabase start
```

**3. Web app:**

```bash
npm run dev
```

Open http://localhost:5173.

> On Windows, prefer the functions runtime started by `supabase start` over `npm run functions:serve`. The latter's file watcher fires spuriously on Docker bind mounts and restarts the runtime mid-request.

## Commands

| Command                                             | Purpose                                                                                                                                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm run preview` | Web app                                                                                                                                                                                                          |
| `npm run check`                                     | typecheck + lint + unit tests + build                                                                                                                                                                            |
| `npm test`                                          | 85 unit tests (engine, safety, real model outputs, UI, migrations on PGlite)                                                                                                                                     |
| `npm run test:integration`                          | 31 tests against the running local Supabase (`INTEGRATION_AI=1` adds live AI, including every activity kind); needs `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` exported from `npx supabase status -o env` |
| `npm run test:e2e`                                  | Browser E2E with real sign-up, email confirmation, onboarding, learning space and modules, RTL, focus mode, parent linking (`E2E_AI=1` adds a live chat turn and a live quiz)                                    |
| `npm run db:reset`                                  | Re-apply migrations to the local DB (wipes local data)                                                                                                                                                           |

## Demo accounts

`scripts/demo-accounts.json` lists a linked demo pair: student **Mohamed Sehly** and parent **Yahya Ben Mohamed**. Create them on your **local** stack, then sign in at http://localhost:5173/login:

```bash
eval "$(npx supabase status -o env | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')" && ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY node scripts/create-demo-accounts.mjs
```

The script refuses any non-local URL. These passwords are public and demo-only: never create these accounts on a hosted project.

## Deploy

**Backend (Supabase Cloud):**

```bash
npx supabase link --project-ref <ref>
```

```bash
npx supabase db push
```

```bash
npx supabase secrets set --env-file supabase/functions/.env
```

```bash
npx supabase functions deploy
```

Then, in the dashboard: set Site URL and redirect URLs, enable email confirmation, configure SMTP, and schedule `select public.purge_operational_data()` daily with pg_cron.

**Frontend (Docker):** a non-root, read-only nginx image with strict security headers.

```bash
docker compose --env-file .env up --build
```

Or build it directly:

```bash
docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_ANON_KEY=... -t qarrai-web .
```

## Documentation

- [docs/SECURITY.md](docs/SECURITY.md): child safety, AI protections, authorisation
- [docs/TECHNICAL_REPORT.md](docs/TECHNICAL_REPORT.md): technical report (status, test evidence, limitations)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATABASE.md](docs/DATABASE.md), [docs/API.md](docs/API.md)
