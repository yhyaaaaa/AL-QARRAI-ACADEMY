# API

All endpoints are Supabase Edge Functions: `POST {SUPABASE_URL}/functions/v1/<name>`. Each requires a valid user JWT (gateway `verify_jwt = true`, re-verified with Supabase Auth). The contract lives in `supabase/functions/_shared/api.ts` (Zod), and the frontend imports the same types.

Errors: `{ "error": { "code", "message", "retryAfterSeconds?" } }`, with a `Retry-After` header on 429/503.

| Status    | Code                                | When                                                       |
| --------- | ----------------------------------- | ---------------------------------------------------------- |
| 400 / 422 | `BAD_REQUEST`                       | Invalid body, unreadable document                          |
| 401       | `UNAUTHORIZED`                      | Missing, expired or revoked token                          |
| 403       | `FORBIDDEN`                         | Wrong account type, or someone else's resource             |
| 404       | `NOT_FOUND`                         | Session, exercise or document not found for this student   |
| 413       | `PAYLOAD_TOO_LARGE`                 | Body or file too large                                     |
| 429       | `RATE_LIMITED`                      | Per-student, per-IP, daily-token or abuse limits           |
| 502       | `PROVIDER_ERROR`                    | The AI provider failed or timed out (nothing is persisted) |
| 503       | `AI_DISABLED` / `AI_NOT_CONFIGURED` | Kill switch on, or `AI_BASE_URL` missing                   |

## `mentor-response` (students only)

### `chat`

```json
{
  "action": "chat",
  "mentorId": "ba9lewa|ibnbatbuta|falfoul",
  "content": "≤ 4000 chars",
  "sessionId": "uuid?",
  "intent": "chat|exercise",
  "mode": "explain|askwhy",
  "language": "auto|en|fr|ar|tn",
  "documentId": "uuid?"
}
```

The server loads history from the DB (never from the client), redacts personal data, screens for wellbeing concerns and injection, applies the quota gate, then runs the pipeline. It persists the user message, the assistant message (with validation metadata) and, for exercises, the exercise row.

`200 → { session, messages: [user, assistant], exercise? }`. Assistant `status` is one of:

- `validated`: passed validation
- `fallback`: no draft passed; a safe clarification is shown instead
- `safety`: wellbeing or injection reply; no model was called

`exercise.answer` is always `null` until the exercise is completed.

### `grade`

```json
{ "action": "grade", "exerciseId": "uuid", "answer": "≤ 500 chars" }
```

Numeric answers are compared deterministically. Text answers use exact/normalised matching, else a model judgement that must pass the validator; if it can't be validated, the attempt is not counted. Maximum 3 attempts, after which the solution is revealed. `200 → { exercise, correct: boolean|null, feedback }`.

### `generate`: create a learning activity

```json
{
  "action": "generate",
  "mentorId": "ba9lewa|ibnbatbuta|falfoul",
  "kind": "quiz|summary|mindmap|flashcards|keyterms|teachback|game|diagnostic",
  "topic": "2–200 chars",
  "language": "auto|en|fr|ar|tn",
  "documentId": "uuid?",
  "options": {
    "difficulty": "easy|medium|hard",
    "length": "short|standard|detailed",
    "count": 3,
    "level": 1
  }
}
```

Same pipeline as chat: quota gate → mentor persona + learner profile (level, styles, simplified language) → draft as strict JSON → Zod schema → **deterministic checks** (a choice question must have exactly one correct option: duplicates and numerically equal options such as `1/2` and `4/8` are rejected) → validator model, which sees the answer key spelled out (`MARKED CORRECT: B) 2/3`) and is told not to demand chat-style structure from short activity explanations → one correction → **422 fail closed** (`activity_rejected` is logged with the issues).

The draft is split before it is stored: `content` is what the student sees; `solution` (answer keys, rubrics, teach-back key points, the correct order of game steps) has **no client grant** and never leaves the server until it is revealed by `check`. Game match/sequence content is shuffled deterministically. `200 → { item }`.

### `check`: answer one part of an activity

```json
{
  "action": "check",
  "itemId": "uuid",
  "part": 0,
  "answer": "string | number | boolean | number[]",
  "hintUsed": false
}
```

- Quiz, diagnostic, game: deterministic comparison (index, boolean, normalised text, numbers, order), model judgement only for free-text short answers, and only if it validates. Two tries per part; the explanation and correct answer are revealed after a correct answer or the last try. Points: 10 on the first try, 5 on the second, halved with a hint, multiplied by difficulty (×1 / ×1.5 / ×2) or game level. Repeats return `alreadyDone: true` with 0 points.
- Teach-back: the student's explanation is evaluated against the hidden key points (understanding 0–3, correct ideas, missing ideas, misconceptions, next step). The evaluation itself is validated. `200 → { evaluation, points, attempt }`.

Flashcard reviews ("known" / "needs practice") are written by the client directly into `flashcard_reviews` (own rows only, and only for `flashcards` items).

### Chat modes

`chat` accepts `"mode": "explain" | "askwhy"`. Ask-Why answers end with up to three follow-up questions, which the server strips from the text and returns in `meta.followUps`.

## `process-document` (students only)

```json
{ "storagePath": "<uid>/<uuid>-<name>", "fileName": "notes.pdf" }
```

The student first uploads to the private `materials` bucket. The function verifies the path is in the student's folder, detects the type from the bytes, and extracts text: plain text directly, PDF via `unpdf`, images via OCR (`MODEL_OCR`, behind the quota gate). It scans for injection, then stores the text. `200 → { document, preview }`.

## `account` (students and parents)

- `{ "action": "export" }` returns all of the caller's data as JSON.
- `{ "action": "delete", "confirm": "DELETE MY ACCOUNT" }` removes files and the auth user; rows cascade.
- `{ "action": "invite_guardians" }` (students): emails pending guardians a Supabase invitation (max 3 per link, 24 h apart).

## Database RPCs (called with the user's JWT)

- `claim_guardian_links()`: parent with a confirmed email; activates links addressed to that email.
- `get_children_overview()`: parent; aggregated progress of linked children (no chat contents or titles).
- `get_learning_stats()` (security invoker, own rows only): activities by kind and mentor, points, game levels, quiz results (the onboarding warm-up is not graded and is excluded), teach-back scores, strengths and topics to practise, flashcard counts, active days, topics. Feeds the dashboard, Progress page and achievements.
- `add_guardian_email(p_email)` / `revoke_guardian_link(p_link)`: student guardian management.

Server-only (service role): `consume_ai_quota`, `record_ai_tokens`, `email_has_account`, `purge_operational_data`.

## Upstream AI provider

`POST {AI_BASE_URL}/chat/completions` with `Authorization: Bearer {AI_API_KEY}`, `stream: false`, and `max_tokens` capped by `AI_MAX_OUTPUT_TOKENS`. Verified model IDs on the organisers' endpoint (2026-11-09): `llama3.2-3b`, `qwen2.5-3b`, `llama3.1-8b`, `mistral-7b`, `qwen2.5-coder-7b`, `deepseek-ocr`, plus `qwen3.5-0.8b` and `qwen3-0.6b` (unused).
