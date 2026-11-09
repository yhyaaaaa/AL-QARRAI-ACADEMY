# Architecture

```mermaid
flowchart LR
  subgraph Browser["React SPA (nginx container)"]
    S[Student screens] & P[Parent dashboard]
  end
  S & P -->|"JWT · RLS reads"| PG[(Postgres + RLS)]
  S -->|upload own folder| ST[(Storage: materials)]
  S -->|JWT| MR[mentor-response]
  S -->|JWT| PD[process-document]
  S & P -->|JWT| AC[account]
  P -->|RPC| PG
  subgraph Edge["Supabase Edge Functions (Deno)"]
    MR & PD & AC --> CTX[auth · profile · quota gate · kill switch]
    MR --> ENG[tutoring engine]
  end
  CTX --> PG
  ENG -->|"Bearer AI_API_KEY"| LLM[(Organisers' OpenAI-compatible API)]
  PD -->|OCR| LLM
  AC -->|inviteUserByEmail| AUTH[Supabase Auth + SMTP]
```

## Tutoring turn

```mermaid
sequenceDiagram
  autonumber
  participant UI
  participant F as mentor-response
  participant DB as Postgres
  participant M as Models
  UI->>F: chat(mentorId, content, sessionId?)
  F->>F: verify JWT, load profile (students only)
  F->>F: redact PII · wellbeing / injection screening
  alt concern or injection
    F->>DB: log category, save messages (status=safety)
    F-->>UI: human-first / refusal reply (no model call)
  else normal
    F->>DB: consume_ai_quota (kill switch, rate, IP, tokens, abuse)
    F->>DB: load last 12 messages
    F->>M: draft (route: qwen2.5-3b · mistral-7b · coder)
    F->>F: deterministic arithmetic (incl. LaTeX)
    F->>M: validator llama3.1-8b → JSON verdict
    opt rejected
      F->>M: correction with issues → validate again
    end
    F->>DB: save messages (+ exercise, answer hidden) · record tokens
    F-->>UI: validated reply, or safe clarification
  end
```

## Learning activities

```mermaid
sequenceDiagram
  autonumber
  participant UI as Module (quiz, mind map, …)
  participant F as mentor-response
  participant DB as Postgres
  participant M as Models
  UI->>F: generate(kind, topic, options)
  F->>DB: consume_ai_quota
  F->>M: draft as JSON (persona + learner profile)
  F->>F: Zod schema · deterministic checks (one correct option)
  F->>M: validator (answer key spelled out)
  opt rejected
    F->>M: one correction → checks + validator again
  end
  F->>DB: learning_items (content | solution hidden)
  F-->>UI: item (no answers)
  UI->>F: check(itemId, part, answer)
  F->>DB: compare with solution · activity_attempts · points
  F-->>UI: correct? + explanation when revealed
```

Nine experiences share this engine: Chat & Explain and Ask-Why use `chat`; Smart Summary, Key Terms, Mind Map, Quiz, Flashcards, STEM Game, Teach Me Back and the onboarding warm-up use `generate`/`check`. Each module is a thin view in `src/features/learning/modules/` on top of shared pieces: `ModuleShell` (mentor character, states, back link), `ActivityFrame` (topic → options → generate → result → history) and `useActivity` (item in the URL, so every activity can be reopened).

## Interface language and accessibility

- `src/i18n/strings.ts`: typed dictionaries for English, French, Arabic and Tunisian Darija (Darija inherits Arabic and overrides what differs). Every key must exist in every language (enforced by the type). Mentor descriptions are localised in `src/data/mentorText.ts`. Arabic and Darija switch the document to `dir="rtl"`; layouts use logical properties.
- `src/store/prefsStore.ts` + `src/app/PrefsEffects.tsx`: preferences apply instantly through attributes on `<html>` (`data-text-size`, `data-contrast`, `data-spacing`, `data-motion`, `data-focus`) and `MotionConfig`. They are saved to the profile; local edits not yet saved win over the profile copy on reload (`pendingSync`).

## Code layout

```
supabase/functions/
  _shared/          api contract, http/CORS, auth context + quota gate, safety, grading
  mentor-response/  index (router) · chat · grade · learn (generate/check) · activities (schemas, prompts, checks, split) · orchestrator · validator · mathCheck · modelRouter · prompts/ · providers/
  process-document/ index · handler · extract (magic bytes, unpdf, OCR)
  account/          export · delete · invite_guardians
supabase/migrations/  schema · triggers & quota · RLS & privileges · storage & seed · accounts & guardians · learning experiences
src/
  services/         supabase client · api (functions) · data (RLS queries & RPCs) · documents (upload)
  store/            auth (session, profile, roles) · prefs (language, accessibility)
  i18n/             strings (en · fr · ar · tn) · languages
  features/learning/ experiences · ModuleShell · ActivityFrame · TopicField · hooks (character state, speech, sounds) · modules/
  pages/            Landing · Login · Register · Onboarding · Dashboard · Mentors · Learning (space + module) · Progress · Settings · Account · Parent · ParentWelcome
  components/       ui · layout (RequireAuth with roles and onboarding redirect) · chat · exercises · mentors (character art with four states) · account · dashboard · progress
deploy/nginx.conf.template · Dockerfile · docker-compose.yml
tests/integration (real Supabase) · tests/e2e (browser, real Supabase + Mailpit)
```

The engine modules are runtime-agnostic: Deno in production, Node in tests. Bare `zod`, `@supabase/supabase-js` and `unpdf` are mapped per function in `deno.json`.
