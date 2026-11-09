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
  "mentorId": "shamia|draa|ba9lewa",
  "content": "≤ 4000 chars",
  "sessionId": "uuid?",
  "intent": "chat|exercise",
  "language": "auto|en|fr|ar",
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
- `add_guardian_email(p_email)` / `revoke_guardian_link(p_link)`: student guardian management.

Server-only (service role): `consume_ai_quota`, `record_ai_tokens`, `email_has_account`, `purge_operational_data`.

## Upstream AI provider

`POST {AI_BASE_URL}/chat/completions` with `Authorization: Bearer {AI_API_KEY}`, `stream: false`, and `max_tokens` capped by `AI_MAX_OUTPUT_TOKENS`. Verified model IDs on the organisers' endpoint (2026-11-09): `llama3.2-3b`, `qwen2.5-3b`, `llama3.1-8b`, `mistral-7b`, `qwen2.5-coder-7b`, `deepseek-ocr`, plus `qwen3.5-0.8b` and `qwen3-0.6b` (unused).
