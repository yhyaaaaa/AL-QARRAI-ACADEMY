# Qarrai Academy: Technical Report

_Version 0.2 · 9 November 2026 · branch `feat/mvp-foundation`_

This report describes **what is implemented and tested today**. Items not done are listed in §16–17. There is no demo or simulated mode.

## 1. Introduction

Qarrai Academy is an AI-powered learning platform for children and teenagers. It is built around three specialised mentors: **Shamia Al-Muhasbi** (mathematics, logic, statistics), **Draa Al-Mughamir** (physics, chemistry, biology) and **Ba9lewa Al Fe9ah** (Arabic, French, English, literature). They share one tutoring engine that routes each request to a suitable open model and **validates every answer before delivery**. Parents get their own accounts and a dashboard showing their children's progress.

## 2. Objectives

1. Specialised pedagogy per discipline, rather than one generic chatbot.
2. Trustworthy answers for learners: no unvalidated draft is ever shown.
3. Safety and privacy appropriate for minors.
4. A genuinely functional full-stack product: real auth, persistence, AI and deployment.

## 3. Functional requirements: status

| Requirement                                                                    | Status                                                                          | Evidence                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Student authentication (sign-up, email confirmation, sign-in, global sign-out) | ✅                                                                              | integration + E2E (real GoTrue, Mailpit)                     |
| Parent accounts, guardian email at sign-up, invitation email, parent dashboard | ✅                                                                              | PGlite + integration + E2E                                   |
| Persistent data (sessions, messages, exercises, documents, progress)           | ✅                                                                              | integration (real Postgres)                                  |
| Three mentors, independent configurations, one engine                          | ✅                                                                              | unit (parity) + live AI                                      |
| Real integration with the organisers' API                                      | ✅                                                                              | `/models` verified; live integration + E2E                   |
| Model routing                                                                  | ✅                                                                              | unit; live runs use `qwen2.5-3b` and validator `llama3.1-8b` |
| Validation before delivery (deterministic + model, correction, fail-closed)    | ✅                                                                              | unit (29+) + live runs                                       |
| Conversation history (server-loaded)                                           | ✅                                                                              | integration                                                  |
| Exercise generation and server-side grading (answers hidden until solved)      | ✅                                                                              | PGlite + live integration                                    |
| Document upload and processing (text, PDF, image OCR)                          | ✅ text + PDF tested · ⚠️ OCR wired but **not verified** against `deepseek-ocr` | unit (real PDF) + integration (text)                         |
| Progress tracking from stored activity                                         | ✅                                                                              | PGlite triggers + E2E parent dashboard                       |
| AuthN/AuthZ and DB security                                                    | ✅                                                                              | [SECURITY.md](SECURITY.md)                                   |
| Production build and deployment readiness                                      | ✅ build, Docker image run hardened · ⚠️ not yet deployed to a hosted project   | `npm run check`, container test                              |

## 4. Non-functional requirements

- **Safety & privacy:** see [SECURITY.md](SECURITY.md). Highlights: data minimisation, PII redaction before storage and before the AI, wellbeing replies with no model call, parents never see chat contents.
- **Abuse resistance:** rate limits (per student and per IP), daily token budgets, kill switches, injection detection with temporary blocks.
- **Honesty:** no fake fallbacks. Provider failures become explicit errors and nothing is persisted.
- **Accessibility:** WCAG AA text contrast (ink 13.4:1; deep accents 5.4–6.0:1), labelled controls, `aria-live` loading, RTL for Arabic.
- **Performance (measured, organisers' API):** single model calls take 3–8 s. A validated tutoring turn took 9.6 s; an exercise took 15.2 s.

## 5. Stack

React 19 + TypeScript (strict) + Vite 8, Tailwind 4, shadcn-style components, Zustand, React Router 7, react-markdown + KaTeX. Supabase: Postgres 17, GoTrue, Storage, Edge Functions on Deno 2. Zod 4 everywhere. Tests use Vitest, Testing Library, PGlite and Playwright (Edge). Deployment uses Supabase Cloud plus a Docker/nginx web image.

## 6–8. Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md). Key decisions:

- **All trusted writes happen server-side.** Clients only read (RLS) and make a few harmless edits.
- **History is loaded from the database**, never trusted from the client.
- **One quota gate** (`consume_ai_quota`) sits in front of every model call.
- **Engine code is runtime-agnostic**, so the same code is unit-tested in Node and runs in Deno.

## 9. Database

Thirteen tables and views, with RLS on all of them and default-deny privileges. See [DATABASE.md](DATABASE.md).

## 10. AI orchestration & routing

| Role                   | Model (verified ID) |
| ---------------------- | ------------------- |
| Draft: maths, sciences | `qwen2.5-3b`        |
| Language and writing   | `mistral-7b`        |
| Code                   | `qwen2.5-coder-7b`  |
| Optional classifier    | `llama3.2-3b`       |
| Validator              | `llama3.1-8b`       |
| OCR                    | `deepseek-ocr`      |

The mentor persona and the safety rules are injected independently of the routed model. The age band adapts the register (children under 13 get simpler language).

## 11. Mentors

There are three configuration objects (`prompts/*.ts`), one engine, and a test that keeps the UI and server definitions in sync. Character illustrations are provisional SVGs; the final designs and frontend brief will be supplied by the team.

## 12. Validation, and what real outputs taught us

The pipeline: draft → (1) deterministic arithmetic re-computation, now including LaTeX `\frac` → (2) validator JSON verdict (accept only with confidence ≥ 0.5) → one correction → otherwise a mentor-voiced clarification. Unparseable verdicts count as rejections.

Testing against the **organisers' real models** found five defects that hand-written tests had missed. All are fixed, and each has a regression test in `realOutputs.test.ts`:

1. Markdown bullets (`-   12 * 7 = 84`) were read as minus signs, so correct answers were withheld.
2. Exercise JSON with unescaped LaTeX (`\(`) failed to parse, and `\frac` would have silently become a form-feed character.
3. The validator punished the mentor's own method (ending with a practice question) and blamed the draft for the `[number removed]` placeholder in the student's text.
4. Correction meta-text ("Here is the revised response:") leaked to students.
5. The model stated a wrong quadratic root (1 instead of 2). This is the class of error the substitution check and validator exist to catch.

After the fixes, live runs validated on the first attempt (chat: 7 arithmetic statements checked; exercise: 3).

**Limitation:** the validator is a single 8B model, and a model judging another model's correction is not independent proof.

## 13. Security

See [SECURITY.md](SECURITY.md). Two leaks were found by tests and fixed:

- Session titles (the child's own words, possibly a wellbeing disclosure) were visible to parents.
- New tables were auto-granted to client roles.

## 14. Testing (all run against real dependencies where applicable)

| Suite            | Count  | Against                                                                                                                |
| ---------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Unit / component | 75     | engine, safety, extraction (real PDF bytes), grading, UI, KaTeX, migrations on PGlite (17)                             |
| Integration      | 20     | **real local Supabase** (GoTrue, PostgREST, Storage, Deno Edge Functions) + **organisers' API**                        |
| Browser E2E      | 5      | real stack + Mailpit + organisers' API (sign-up → confirm → learn → parent invite → parent dashboard → live AI answer) |
| Container        | manual | non-root, read-only, headers, 403 on dotfiles and source maps                                                          |

`npm run check` (typecheck, lint, unit, build) passes.

## 15. Status

The backend, security, AI pipeline, accounts and data flows are complete and tested. The frontend is **functional but intentionally plain**: the final frontend brief and character designs will come from the team.

## 16. Limitations

- OCR is not verified against `deepseek-ocr`; DOCX is not supported; PDFs must have selectable text.
- Not yet deployed to a hosted Supabase project (needs a project ref/token, SMTP and Site URL).
- Pattern-based safety detection; no MFA or CAPTCHA; guardian consent is declared plus email-confirmed, not identity-verified.
- No streaming. Chat writes are not wrapped in one transaction.
- The organisers' API may only be available during scheduled hours. Outside them, students get a clear "service not responding" error.
- The entry JS chunk is 164 KB gzipped; tune it during the frontend redesign.

## 17. Next steps

1. Deploy: Supabase Cloud project, SMTP, secrets, the web container on a host with TLS.
2. Verify OCR with `deepseek-ocr` on real photos of notes.
3. Frontend redesign from the team's brief and character art.
4. CAPTCHA on sign-up, MFA for parents, scheduled data purge, transactional chat writes.
5. Measure validation pass and fallback rates per mentor on a fixed question set.
