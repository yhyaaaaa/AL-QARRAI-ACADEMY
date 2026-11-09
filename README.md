# Qarrai Academy

**The Modern House of Knowledge.** An AI-powered learning platform for children and teenagers, built around three specialised AI mentors who share one tutoring engine. That engine validates every answer before a student sees it, and parents can follow their child's progress.

| Mentor                                 | Domain                                 | Method                                                             |
| -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| **Shamia Al-Muhasbi** · شامية المحاسبي | Mathematics, Logic & Statistics        | Step-by-step reasoning, pattern recognition, progressive exercises |
| **Draa Al-Mughamir** · ذراع المغامر    | Natural Sciences                       | Real-world hooks, thought experiments, discovery                   |
| **Ba9lewa Al Fe9ah** · بقلوة الفقاه    | Linguistics & Languages (AR / FR / EN) | Rules through examples, constructive correction                    |

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

| Command                                             | Purpose                                                                                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm run preview` | Web app                                                                                                                                                                           |
| `npm run check`                                     | typecheck + lint + unit tests + build                                                                                                                                             |
| `npm test`                                          | 75 unit/integration tests (incl. migrations on PGlite)                                                                                                                            |
| `npm run test:integration`                          | 20 tests against the running local Supabase (`INTEGRATION_AI=1` adds live AI); needs `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` exported from `npx supabase status -o env` |
| `npm run test:e2e`                                  | Browser E2E with real sign-up, email confirmation, parent linking (`E2E_AI=1` adds a live AI turn)                                                                                |
| `npm run db:reset`                                  | Re-apply migrations to the local DB (wipes local data)                                                                                                                            |

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
