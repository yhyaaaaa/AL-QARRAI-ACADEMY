# Security & child safety

Qarrai Academy is used by **minors**. This document lists every protection that is implemented, where it lives, and how it is tested. Anything not listed here is not implemented.

## 1. Accounts and identity

| Control                                                                                                                   | Where                                                         | Tested by                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Email/password auth (Supabase GoTrue) with **mandatory email confirmation**                                               | `supabase/config.toml` `[auth.email] enable_confirmations`    | integration `does not allow sign-in before email confirmation`, E2E |
| Password policy: ≥ 10 chars, upper + lower + digit (server-enforced; mirrored in UI)                                      | `config.toml` `password_requirements`                         | integration `enforces the password policy`                          |
| Short-lived access tokens (1 h), refresh-token rotation, **"sign out on all devices"** revokes every refresh token        | `config.toml`, `AccountPage` → `signOut({ scope: "global" })` | manual                                                              |
| Two account types: `student`, `parent` (type cannot be changed by the user)                                               | `profiles.account_type` + column grants                       | PGlite `allows only harmless column updates`                        |
| **Data minimisation**: nickname (UI rejects emails/phone numbers in it), age _band_, no real name, no birth date          | `profiles`, `handle_new_user()`                               | PGlite, unit                                                        |
| Minors must declare guardian consent **and** give a guardian email; enforced in the DB trigger (sign-up aborts otherwise) | `handle_new_user()`                                           | PGlite, integration, E2E                                            |

## 2. Parent ↔ child linking

- A student names a guardian **email**. A link becomes active only when a **parent account whose email is confirmed** for that exact address calls `claim_guardian_links()`. Typing someone's address never grants access.
- Students under 18 cannot remove their last guardian (`revoke_guardian_link`).
- Invitations are sent by the server (`account` → `invite_guardians`, Supabase `inviteUserByEmail`), at most 3 per link, 24 h apart.
- **What parents see** (`get_children_overview()`): progress counters, subject of each session, number of questions, exercise results. **Not** chat contents, **not** session titles (they derive from the child's words), **not** documents, **not** safety logs. A child's wellbeing disclosure is never shown to a parent, because the adult involved could be the cause.
- Tested: PGlite (`links the confirmed owner…`, `gives other parents nothing…`, `keeps at least one guardian…`), integration and E2E (the E2E caught an early version that leaked session titles).

## 3. Database authorisation (default-deny)

- RLS enabled on **every** table; client roles have privileges revoked and re-granted per table/column (Supabase auto-grants new tables, so each migration revokes explicitly).
- Students **read** only their own rows. They **write** only: nickname, language, session title, session delete, document delete.
- AI messages, exercises, grades, documents, progress, usage and security events are written **only by Edge Functions** (service role). Students cannot fabricate an "AI-validated" message or mark their own exercise correct.
- Exercise answers are hidden until the exercise is completed: the `exercises` table is not readable by clients; the `my_exercises` view masks `answer`/`explanation`.
- Learning activities (quiz, game, flashcards, teach-back, diagnostic…): answer keys and rubrics are stored in `learning_items.solution`, a column with **no client grant**. Answers are checked by the Edge Function (`check`), at most two tries per part, and attempts and points are written only by the server. Students can write only their own flashcard reviews, and only for their own flashcard items.
- Learner preferences (level, styles, goals, accessibility) are chosen by the student and validated server-side. The platform never asks about or stores medical conditions.
- Storage: private `materials` bucket, 10 MB, MIME allow-list; objects must live under `<auth.uid()>/`.
- Tested: 22 PGlite tests run the real migrations; 31 integration tests run against the real local Supabase stack.

## 4. AI protections

| Threat                             | Protection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Where                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Cost / abuse / DDoS                | `consume_ai_quota()` gate before **every** model call: per-student burst (6/min) and hourly (60/h) limits, **per-IP** limit across accounts (30/min, IP stored only as salted SHA-256), serialised with an advisory lock so it can't be raced                                                                                                                                                                                                                                                 | migration 1, `_shared/context.ts`                       |
| Runaway token spend ("token kill") | Per-student **daily token budget** (150k), token usage recorded per request from provider `usage`; hard `max_tokens` ceiling per call; whole-request deadline aborts in-flight calls                                                                                                                                                                                                                                                                                                          | `config.ts`, `openaiCompatible.ts`                      |
| Emergency stop                     | **Kill switches**: `AI_KILL_SWITCH=true` (env) or `update system_flags set enabled=false where key='ai_enabled'` (instant, no redeploy)                                                                                                                                                                                                                                                                                                                                                       | `context.ts`, `system_flags`                            |
| Prompt injection                   | (1) deterministic detection (EN/FR/AR patterns) → safe reply **without calling a model**, event logged; repeated attempts → **temporary block** (5/h); (2) safety rules first in the system prompt, untrusted content declared as data; (3) uploaded material wrapped in a **random per-request boundary** with delimiter look-alikes stripped; (4) document text scanned and flagged; (5) output-side **prompt-leak detector**; (6) validator rejects drafts that obey embedded instructions | `_shared/safety.ts`, `prompts/index.ts`, `validator.ts` |
| Personal data to the AI provider   | Emails / phone numbers **redacted before storage and before the provider**; the student is told                                                                                                                                                                                                                                                                                                                                                                                               | `redactPersonalData`                                    |
| Wellbeing disclosures              | Self-harm / abuse disclosures (EN/FR/AR) get a human-first reply pointing to a trusted adult / emergency services, **no model call**; only the category is logged (`critical`), never the words                                                                                                                                                                                                                                                                                               | `detectWellbeingConcern`                                |
| Unvalidated / wrong answers        | Every reply: deterministic arithmetic re-computation (incl. LaTeX) + validator model (`llama3.1-8b`); one correction; otherwise a safe clarification. Validator parse failure = reject                                                                                                                                                                                                                                                                                                        | `orchestrator.ts`, `validator.ts`, `mathCheck.ts`       |
| Malicious uploads                  | Type decided from **magic bytes**, not the client; 10 MB; PDF ≤ 60 pages; text must be valid UTF-8; failed files deleted                                                                                                                                                                                                                                                                                                                                                                      | `process-document/extract.ts`                           |

## 5. Web & infrastructure

- Edge Functions: JWT verified by the gateway **and** re-verified with Supabase Auth; bodies size-limited (32 KB chat); Zod validation; errors never leak internals; logs contain metadata only.
- CORS allow-list (`ALLOWED_ORIGINS`). _Note:_ the **local** CLI gateway adds `Access-Control-Allow-Origin: *` itself; hosted Supabase does not. CORS is defence-in-depth — authentication is the real boundary.
- Web container: non-root nginx (uid 101), read-only root FS, all capabilities dropped, `no-new-privileges`; strict **CSP**, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy; dotfiles and source maps return 403. Verified by running the image.
- Secrets: AI key and service-role key only in `supabase/functions/.env` (git-ignored) or Supabase secrets; only public `VITE_*` values reach the browser. Model output rendered without raw HTML (tested).

## 6. Data rights & retention

- **Export** all of a student's data (JSON) and **delete** the account (files, then auth user → every row cascades) from the account page.
- `purge_operational_data()` deletes `ai_usage` > 30 days and `security_events` > 180 days — schedule it daily with pg_cron on the hosted project.

## 7. Known limitations (honest)

- Injection / wellbeing detection is pattern-based: it reduces risk, it does not eliminate it. The validator is a single 8B model.
- Guardian consent is a declaration plus a confirmed guardian email; it is **not** verified parental consent in the strict COPPA sense (no identity check of the parent).
- No MFA yet; no CAPTCHA on sign-up (Supabase supports hCaptcha/Turnstile — recommended before public launch).
- Multi-step writes in `mentor-response` are not wrapped in one DB transaction (a failure mid-way can leave a session without its reply).
- Locally, `supabase functions serve` on Windows restarts on spurious file events and can kill long AI requests; use the edge runtime started by `supabase start` (see README).
