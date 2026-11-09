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

## Code layout

```
supabase/functions/
  _shared/          api contract, http/CORS, auth context + quota gate, safety, grading
  mentor-response/  index (router) · chat · grade · orchestrator · validator · mathCheck · modelRouter · prompts/ · providers/
  process-document/ index · handler · extract (magic bytes, unpdf, OCR)
  account/          export · delete · invite_guardians
supabase/migrations/  schema · triggers & quota · RLS & privileges · storage & seed · accounts & guardians
src/
  services/         supabase client · api (functions) · data (RLS queries & RPCs) · documents (upload)
  store/            auth (session, profile, roles) · prefs (language)
  pages/            Landing · Login · Register · Dashboard · Mentors · Learning · Progress · Account · Parent · ParentWelcome
  components/       ui · layout (RequireAuth with roles) · chat · exercises · mentors · account · dashboard · progress
deploy/nginx.conf.template · Dockerfile · docker-compose.yml
tests/integration (real Supabase) · tests/e2e (browser, real Supabase + Mailpit)
```

The engine modules are runtime-agnostic: Deno in production, Node in tests. Bare `zod`, `@supabase/supabase-js` and `unpdf` are mapped per function in `deno.json`.
