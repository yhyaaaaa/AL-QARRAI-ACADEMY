# Qarrai Academy: Technical Report

_Version 0.3 · 9 November 2026 · branch `feat/mvp-foundation`_

This report describes **what is implemented and tested today**. Items not done are listed in §16–17. There is no demo or simulated mode.

## 1. Introduction

Qarrai Academy is an AI-powered learning platform for children and teenagers. It is built around three specialised mentors: **Ba9lewa** (mathematics, logic, statistics), **Ibn Batbuta** (physics, chemistry, biology) and **Falfoul** (Arabic, French, English, literature). They share one tutoring engine that routes each request to a suitable open model and **validates every answer before delivery**. Parents get their own accounts and a dashboard showing their children's progress.

## 2. Objectives

1. Specialised pedagogy per discipline, rather than one generic chatbot.
2. Trustworthy answers for learners: no unvalidated draft is ever shown.
3. Safety and privacy appropriate for minors.
4. A genuinely functional full-stack product: real auth, persistence, AI and deployment.

## 3. Functional requirements: status

| Requirement                                                                                                                      | Status                                                                          | Evidence                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Student authentication (sign-up, email confirmation, sign-in, global sign-out)                                                   | ✅                                                                              | integration + E2E (real GoTrue, Mailpit)                                              |
| Parent accounts, guardian email at sign-up, invitation email, parent dashboard                                                   | ✅                                                                              | PGlite + integration + E2E                                                            |
| Persistent data (sessions, messages, exercises, documents, progress)                                                             | ✅                                                                              | integration (real Postgres)                                                           |
| Three mentors, independent configurations, one engine                                                                            | ✅                                                                              | unit (parity) + live AI                                                               |
| Real integration with the organisers' API                                                                                        | ✅                                                                              | `/models` verified; live integration + E2E                                            |
| Model routing                                                                                                                    | ✅                                                                              | unit; live runs use `qwen2.5-3b` and validator `llama3.1-8b`                          |
| Validation before delivery (deterministic + model, correction, fail-closed)                                                      | ✅                                                                              | unit (29+) + live runs                                                                |
| Conversation history (server-loaded)                                                                                             | ✅                                                                              | integration                                                                           |
| Exercise generation and server-side grading (answers hidden until solved)                                                        | ✅                                                                              | PGlite + live integration                                                             |
| Document upload and processing (text, PDF, image OCR)                                                                            | ✅ text + PDF tested · ⚠️ OCR wired but **not verified** against `deepseek-ocr` | unit (real PDF) + integration (text)                                                  |
| Progress tracking from stored activity                                                                                           | ✅                                                                              | PGlite triggers + E2E parent dashboard                                                |
| AuthN/AuthZ and DB security                                                                                                      | ✅                                                                              | [SECURITY.md](SECURITY.md)                                                            |
| Production build and deployment readiness                                                                                        | ✅ build, Docker image run hardened · ⚠️ not yet deployed to a hosted project   | `npm run check`, container test                                                       |
| Nine learning experiences per mentor (chat, Ask-Why, summary, key terms, mind map, quiz, flashcards, STEM game, teach-back)      | ✅                                                                              | live integration per kind + E2E (all modules render; live quiz) + browser walkthrough |
| Server-side checking, points, levels, saved history for every activity                                                           | ✅                                                                              | integration + E2E + browser                                                           |
| Onboarding with optional diagnostic warm-up; learner profile used in every prompt                                                | ✅                                                                              | E2E + browser (live Arabic diagnostic)                                                |
| Interface in EN / FR / AR / Tunisian Darija with RTL                                                                             | ✅ · ⚠️ copy needs native-speaker review                                        | E2E (dir/lang switch) + browser walkthrough in Darija                                 |
| Accessibility settings that change behaviour (text size, contrast, spacing, motion, focus, read-aloud, simpler language, breaks) | ✅                                                                              | E2E (focus mode) + browser (attributes, persistence)                                  |
| Progress page, achievements and dashboard from real data                                                                         | ✅                                                                              | browser (values checked against the database)                                         |

## 4. Non-functional requirements

- **Safety & privacy:** see [SECURITY.md](SECURITY.md). Highlights: data minimisation, PII redaction before storage and before the AI, wellbeing replies with no model call, parents never see chat contents.
- **Abuse resistance:** rate limits (per student and per IP), daily token budgets, kill switches, injection detection with temporary blocks.
- **Honesty:** no fake fallbacks. Provider failures become explicit errors and nothing is persisted.
- **Accessibility:** WCAG AA text contrast (ink 13.4:1; deep accents 5.4–6.0:1), labelled controls (localised), skip link, `aria-live` loading, keyboard alternatives for drag-and-drop and matching, charts with table equivalents, RTL for Arabic and Darija, no horizontal scrolling from 320 px. Learner settings apply instantly through `<html>` attributes and `MotionConfig`.
- **Performance (measured, organisers' API):** single model calls take 3–8 s when the service is quiet. A validated tutoring turn took 9.6–44 s; a validated activity takes 20–60 s, and up to ~2 min when the first draft is rejected and corrected. Under load, two draft + validation rounds can exceed the 120 s request deadline, and the student then gets the localised "service not responding" error with a retry button (observed once on 9 November).

## 5. Stack

React 19 + TypeScript (strict) + Vite 8, Tailwind 4, shadcn-style components, Zustand, React Router 7, react-markdown + KaTeX. Supabase: Postgres 17, GoTrue, Storage, Edge Functions on Deno 2. Zod 4 everywhere. Tests use Vitest, Testing Library, PGlite and Playwright (Edge). Deployment uses Supabase Cloud plus a Docker/nginx web image.

## 6–8. Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md). Key decisions:

- **All trusted writes happen server-side.** Clients only read (RLS) and make a few harmless edits.
- **History is loaded from the database**, never trusted from the client.
- **One quota gate** (`consume_ai_quota`) sits in front of every model call.
- **Engine code is runtime-agnostic**, so the same code is unit-tested in Node and runs in Deno.

## 9. Database

Sixteen tables and views, with RLS on all of them and default-deny privileges. See [DATABASE.md](DATABASE.md).

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

There are three configuration objects (`prompts/*.ts`), one engine, and a test that keeps the UI and server definitions in sync. The final character art is integrated: four states per mentor (idle, listening, thinking, talking), optimised to WebP (~178 KB for all twelve), driven by what the learner is doing.

## 12. Validation, and what real outputs taught us

The pipeline: draft → (1) deterministic arithmetic re-computation, now including LaTeX `\frac` → (2) validator JSON verdict (accept only with confidence ≥ 0.5) → one correction → otherwise a mentor-voiced clarification. Unparseable verdicts count as rejections.

Testing against the **organisers' real models** found five defects that hand-written tests had missed. All are fixed, and each has a regression test in `realOutputs.test.ts`:

1. Markdown bullets (`-   12 * 7 = 84`) were read as minus signs, so correct answers were withheld.
2. Exercise JSON with unescaped LaTeX (`\(`) failed to parse, and `\frac` would have silently become a form-feed character.
3. The validator punished the mentor's own method (ending with a practice question) and blamed the draft for the `[number removed]` placeholder in the student's text.
4. Correction meta-text ("Here is the revised response:") leaked to students.
5. The model stated a wrong quadratic root (1 instead of 2). This is the class of error the substitution check and validator exist to catch.

After the fixes, live runs validated on the first attempt (chat: 7 arithmetic statements checked; exercise: 3).

The learning activities added two more findings (9 November, browser walkthrough in Darija):

6. The validator rejected a correct diagnostic for chat-only reasons ("no numbered steps", "no final check") and with an invented error ("0.75 is greater than 1"). Activities are now reviewed in an **activity mode** that keeps every correctness and safety rule but does not demand chat structure.
7. A diagnostic was then **accepted with a wrong answer key** (Q1 "3/6 equals?" keyed to 2/3) and a question with **two correct options** (1/2 and 4/8). The validator only saw `"answer": 1`. Fixes: the reviewer now sees the key spelled out (`MARKED CORRECT: B) 2/3`), and a deterministic check rejects any choice question whose options are equal (including numerically equal fractions, decimals and percentages) before the model is asked. Both are regression tests built from the real output.

**Limitation:** the validator is a single 8B model, and a model judging another model's correction is not independent proof. In the walkthrough, a 3B-model Ask-Why answer about Arabic spelling (taa marbuta) and some Arabic science quiz questions were **validated although they were incoherent or wrong**. Deterministic checks cover arithmetic and answer-key structure; they cannot check linguistic or scientific explanations.

## 13. Security

See [SECURITY.md](SECURITY.md). Two leaks were found by tests and fixed:

- Session titles (the child's own words, possibly a wellbeing disclosure) were visible to parents.
- New tables were auto-granted to client roles.

## 14. Testing (all run against real dependencies where applicable)

| Suite            | Count  | Against                                                                                                                                                                                                  |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit / component | 85     | engine, safety, validator modes, activity checks, 6 real-output regressions, extraction (real PDF bytes), UI, KaTeX, migrations on PGlite (22)                                                           |
| Integration      | 31     | **real local Supabase** (GoTrue, PostgREST, Storage, Deno Edge Functions) + **organisers' API** (every activity kind generated and checked live)                                                         |
| Browser E2E      | 7      | real stack + Mailpit + organisers' API: sign-up → confirm → onboarding → learning space and all nine modules → RTL switch → focus mode → parent invite → parent dashboard → live chat answer → live quiz |
| Manual browser   | —      | full walkthrough in Tunisian Darija at desktop and 320–414 px: onboarding, live diagnostic, live quiz, Ask-Why, progress, settings persistence                                                           |
| Container        | manual | non-root, read-only, headers, 403 on dotfiles and source maps                                                                                                                                            |

`npm run check` (typecheck, lint, unit, build) passes.

## 15. Status

The backend, security, AI pipeline, accounts and data flows are complete and tested. The full product experience is built on them: final character art with four states, nine learning experiences per mentor, onboarding, personalisation, four interface languages with RTL, behavioural accessibility settings, and a progress page and dashboard computed from stored activity.

Fixed during the 9 November verification: header overflow on phones, RTL overlap in onboarding, preference changes lost on an immediate reload, the ungraded warm-up counted as a quiz, mentor texts and alt text not localised, two unlabelled navigation links on phones, and the validator issues in §12.

## 16. Limitations

- OCR is not verified against `deepseek-ocr`; DOCX is not supported; PDFs must have selectable text.
- Not yet deployed to a hosted Supabase project (needs a project ref/token, SMTP and Site URL).
- Pattern-based safety detection; no MFA or CAPTCHA; guardian consent is declared plus email-confirmed, not identity-verified.
- No streaming. Chat writes are not wrapped in one transaction.
- The organisers' API may only be available during scheduled hours. Outside them, students get a clear "service not responding" error.
- The entry JS chunk is 217 KB gzipped (715 KB raw, Vite warns above 500 KB); route-level splitting is already in place, so the next step is splitting the shared vendor code (motion, Supabase, KaTeX).
- **Content quality depends on small models.** Arabic and Darija generations by `qwen2.5-3b` are often awkward and sometimes wrong, and the 8B validator does not reliably catch it (§12). Recommended: route Arabic/Darija drafting to the strongest available model and measure on a fixed question set.
- French, Arabic and especially Tunisian Darija interface copy was written without a native-speaker review.
- Tunisian Darija replies are requested from the model, but the models write mostly Modern Standard Arabic.
- Read-aloud uses the browser's speech voices; Arabic voices are missing on some systems.

## 17. Next steps

1. Native-speaker review of FR / AR / TN copy; content-quality evaluation of the models in Arabic, then model routing by language.
2. Deploy: Supabase Cloud project, SMTP, secrets, the web container on a host with TLS.
3. Verify OCR with `deepseek-ocr` on real photos of notes.
4. CAPTCHA on sign-up, MFA for parents, scheduled data purge, transactional chat writes.
5. Measure validation pass and fallback rates per mentor and per activity kind on a fixed question set.
