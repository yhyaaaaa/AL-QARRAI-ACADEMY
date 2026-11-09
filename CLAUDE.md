# CLAUDE.md: working notes for AI assistants on Qarrai Academy

## What this is

A real learning platform for **minors**: three AI mentors, student and parent accounts, Supabase backend. **There is no demo or simulated mode.** Never add fake fallbacks, mocked AI or local-only persistence.

## Stack

React 19, TypeScript strict, Vite 8, Tailwind 4, Zustand, React Router 7, react-markdown + KaTeX. Supabase: Postgres + RLS, Auth, Storage, and Edge Functions on Deno. The AI is the organisers' OpenAI-compatible API (`supabase/functions/.env`).

## Golden rules

- **Trusted writes are server-side only.** Messages, exercises, grades, documents, progress and usage are written by Edge Functions (service role). Clients read through RLS.
- **Every new table** needs RLS enabled, `revoke all ... from anon, authenticated` (Supabase auto-grants), explicit grants, and tests in `supabase/migrations.test.ts`.
- **Every model call** goes through `openAiSession()` (`_shared/context.ts`), which handles the kill switch, rate limits and token budget. Never call the provider directly.
- **Never deliver unvalidated drafts.** Use the pipeline in `mentor-response/orchestrator.ts`. Validator parse failure means reject.
- **Parents never see chat contents or session titles**: only aggregates via `get_children_overview()`.
- **Secrets:** AI keys and service-role keys only in `supabase/functions/.env` or Supabase secrets. Only `VITE_*` values in browser code.
- Engine modules (everything except `*/index.ts`) must stay runtime-agnostic: `.ts` relative imports, bare npm specifiers mapped in each function's `deno.json`.
- When a real model output breaks something, add it to `mentor-response/realOutputs.test.ts`.

## Commands

`npx supabase start` · `npm run dev` · `npm run check` · `npm run test:integration` · `npm run test:e2e` · `npm run db:reset`

## Conventions

Logical CSS properties for RTL; `dir="auto"` on user/AI text; `*-deep` colour tokens for text. Git: feature branches, no direct commits to `main`, no pushes without the lead's approval.
