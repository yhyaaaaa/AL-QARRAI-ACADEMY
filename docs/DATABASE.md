# Database

PostgreSQL 17 (Supabase). Migrations are in `supabase/migrations/`. They are verified in two ways: on PGlite (`supabase/migrations.test.ts`, 22 tests), and applied to the real local Supabase stack by `supabase db reset` and exercised by `tests/integration` (31 tests).

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "trigger"
  AUTH_USERS ||--o{ GUARDIAN_LINKS : "student"
  AUTH_USERS |o--o{ GUARDIAN_LINKS : "parent (after confirmed email)"
  AUTH_USERS ||--o{ SESSIONS : owns
  SESSIONS ||--o{ MESSAGES : contains
  SESSIONS ||--o{ EXERCISES : contains
  MESSAGES |o--o| EXERCISES : "generated"
  AUTH_USERS ||--o{ DOCUMENTS : uploads
  DOCUMENTS |o--o{ MESSAGES : "context"
  MENTORS ||--o{ SUBJECTS : teaches
  SUBJECTS ||--o{ PROGRESS : tracks
  AUTH_USERS ||--o{ PROGRESS : "trigger-maintained"
  AUTH_USERS ||--o{ AI_USAGE : "quota & tokens"
  AUTH_USERS ||--o{ SECURITY_EVENTS : "audit"
  AUTH_USERS ||--o{ LEARNING_ITEMS : "generated activities"
  LEARNING_ITEMS ||--o{ ACTIVITY_ATTEMPTS : "server-checked answers"
  LEARNING_ITEMS ||--o{ FLASHCARD_REVIEWS : "known / practise"
```

| Table                 | Purpose                                                                                                                                                                          | Client access                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `profiles`            | `account_type` (student/parent), nickname, age band, guardian consent time, language (`en`/`fr`/`ar`/`tn`), level, learning styles, goals, accessibility (jsonb), `onboarded_at` | read own; update nickname, language and learning/accessibility preferences only                      |
| `guardian_links`      | student ↔ guardian email ↔ parent; `pending` / `active` / `revoked`                                                                                                              | read (student or linked parent); changes via RPCs                                                    |
| `mentors`, `subjects` | Reference data                                                                                                                                                                   | read (everyone)                                                                                      |
| `sessions`            | Learning sessions                                                                                                                                                                | read, rename, delete own                                                                             |
| `messages`            | Conversation history; status, validation metadata, redaction flag, safety flags                                                                                                  | read own                                                                                             |
| `exercises`           | Questions, hidden answers, attempts, grading                                                                                                                                     | **none** (read through the `my_exercises` view, which masks answers until completed)                 |
| `documents`           | Uploaded material, extracted text, injection flags                                                                                                                               | read, delete own                                                                                     |
| `progress`            | Per subject: sessions, questions, exercises completed/correct                                                                                                                    | read own (trigger-maintained)                                                                        |
| `ai_usage`            | One row per AI request, with prompt/completion tokens                                                                                                                            | none (service only)                                                                                  |
| `security_events`     | Audit: sign-ups, injections, wellbeing categories, quota blocks, links, exports                                                                                                  | none                                                                                                 |
| `system_flags`        | `ai_enabled` kill switch                                                                                                                                                         | none                                                                                                 |
| `learning_items`      | Generated activities: kind (quiz, summary, mindmap, flashcards, keyterms, teachback, game, diagnostic), topic, options, `content`, **`solution`**, validation meta               | read own, **every column except `solution`** (column-level grant); written by the Edge Function only |
| `activity_attempts`   | One row per checked answer: part, answer (redacted), correctness, score, points, hint used, teach-back evaluation                                                                | read own; written by the Edge Function only                                                          |
| `flashcard_reviews`   | Per card: `known` / `practice`                                                                                                                                                   | read and upsert own rows, only for own `flashcards` items                                            |

Accessibility preferences are learning settings chosen by the student (text size, contrast, spacing, motion, focus mode, read-aloud, sounds, simpler explanations, break reminders). The platform never asks for or infers medical conditions.

**Triggers:**

- `handle_new_user`: validates sign-up metadata per account type; aborts on missing consent or guardian email for minors
- `session_default_subject`, `exercise_default_subject`
- `progress_on_session`, `on_message_insert`, `progress_on_exercise`

**Functions:** see [API.md](API.md#database-rpcs-called-with-the-users-jwt) and [SECURITY.md](SECURITY.md). Security-definer functions pin `search_path = ''`; server-only functions have `EXECUTE` revoked from client roles.

**Storage:** private `materials` bucket (10 MB, text/PDF/images); policies restrict objects to `<auth.uid()>/…`.
