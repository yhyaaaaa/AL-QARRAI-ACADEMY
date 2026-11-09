// @vitest-environment node
/**
 * Fast, in-process verification of the real migration files on PGlite (Postgres compiled to WASM)
 * with a minimal stand-in for Supabase's auth/storage schemas. Complements the full integration
 * tests in tests/integration (which run against a real local Supabase stack).
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = fileURLToPath(new URL("./migrations", import.meta.url));
const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";

const SUPABASE_SHIM = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
  grant all on all tables in schema storage to authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

let db: PGlite;

async function as<T>(
  role: "authenticated" | "service_role" | "anon",
  userId: string | null,
  fn: () => Promise<T>,
) {
  await db.exec(`set role ${role}; set request.jwt.claim.sub = '${userId ?? ""}';`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub;`);
  }
}

const newUser = (
  id: string,
  meta: Record<string, unknown>,
  email = `${id.slice(0, 4)}@example.com`,
) =>
  db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    id,
    email,
    JSON.stringify(meta),
  ]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const file of readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  await newUser(ALICE, {
    display_name: "Alice",
    age_band: "13_15",
    guardian_consent: true,
    guardian_email: "Mum@Family.example",
  });
  await newUser(BOB, { display_name: "Bob", age_band: "18_plus" });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("sign-up rules (handle_new_user)", () => {
  it("creates minimal profiles and records consent for minors", async () => {
    const p = await db.query<{ display_name: string; age_band: string; consent: boolean }>(
      "select display_name, age_band, guardian_consent_at is not null as consent from public.profiles order by display_name",
    );
    expect(p.rows).toEqual([
      { display_name: "Alice", age_band: "13_15", consent: true },
      { display_name: "Bob", age_band: "18_plus", consent: false },
    ]);
    const links = await db.query("select guardian_email, status from public.guardian_links");
    expect(links.rows).toEqual([{ guardian_email: "mum@family.example", status: "pending" }]);
  });

  it("rejects a minor without guardian consent and invalid metadata", async () => {
    await expect(
      newUser("33333333-3333-3333-3333-333333333333", {
        display_name: "Kid",
        age_band: "under_13",
        guardian_email: "p@x.org",
      }),
    ).rejects.toThrow(/guardian_consent_required/);
    await expect(
      newUser("33333333-3333-3333-3333-333333333333", {
        display_name: "Kid",
        age_band: "under_13",
        guardian_consent: true,
      }),
    ).rejects.toThrow(/guardian_email_required/);
    await expect(
      newUser(
        "33333333-3333-3333-3333-333333333333",
        {
          display_name: "Kid",
          age_band: "16_17",
          guardian_consent: true,
          guardian_email: "kid@me.org",
        },
        "kid@me.org",
      ),
    ).rejects.toThrow(/guardian_email_must_differ/);
    await expect(
      newUser("44444444-4444-4444-4444-444444444444", { display_name: "X", age_band: "18_plus" }),
    ).rejects.toThrow(/invalid_display_name/);
    await expect(
      newUser("55555555-5555-5555-5555-555555555555", {
        display_name: "Nobody",
        age_band: "toddler",
      }),
    ).rejects.toThrow(/invalid_age_band/);
  });
});

describe("row level security and privileges", () => {
  let aliceSession: string;

  beforeAll(async () => {
    aliceSession = await as("service_role", null, async () => {
      const s = await db.query<{ id: string }>(
        "insert into public.sessions (user_id, mentor_id, title) values ($1, 'shamia', 'Fractions') returning id",
        [ALICE],
      );
      await db.query(
        "insert into public.messages (session_id, user_id, role, content) values ($1, $2, 'user', 'What is 1/2 + 1/4?')",
        [s.rows[0].id, ALICE],
      );
      await db.query(
        "insert into public.messages (session_id, user_id, role, content, status) values ($1, $2, 'assistant', '3/4', 'validated')",
        [s.rows[0].id, ALICE],
      );
      return s.rows[0].id;
    });
  });

  it("lets a student read only their own data", async () => {
    await as("authenticated", ALICE, async () => {
      expect((await db.query("select * from public.messages")).rows).toHaveLength(2);
    });
    await as("authenticated", BOB, async () => {
      expect((await db.query("select * from public.sessions")).rows).toHaveLength(0);
      expect((await db.query("select * from public.messages")).rows).toHaveLength(0);
      expect((await db.query("select * from public.progress")).rows).toHaveLength(0);
      expect((await db.query("select * from public.profiles")).rows).toHaveLength(1);
    });
  });

  it("forbids students from writing AI messages, sessions, exercises or progress directly", async () => {
    await as("authenticated", ALICE, async () => {
      await expect(
        db.query(
          "insert into public.messages (session_id, user_id, role, content, status) values ($1, $2, 'assistant', 'fake', 'validated')",
          [aliceSession, ALICE],
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("insert into public.sessions (user_id, mentor_id) values ($1, 'draa')", [ALICE]),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query("update public.messages set content = 'edited'")).rejects.toThrow(
        /permission denied/,
      );
      await expect(db.query("update public.progress set exercises_correct = 999")).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  it("allows only harmless column updates (nickname, language, session title)", async () => {
    await as("authenticated", ALICE, async () => {
      await db.query("update public.profiles set display_name = 'Alice B' where id = $1", [ALICE]);
      await db.query("update public.sessions set title = 'Fractions practice' where id = $1", [
        aliceSession,
      ]);
      await expect(
        db.query("update public.profiles set age_band = '18_plus' where id = $1", [ALICE]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("update public.sessions set user_id = $1 where id = $2", [BOB, aliceSession]),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("hides operational tables and server functions from clients", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await as(role, ALICE, async () => {
        await expect(db.query("select * from public.ai_usage")).rejects.toThrow(
          /permission denied/,
        );
        await expect(db.query("select * from public.security_events")).rejects.toThrow(
          /permission denied/,
        );
        await expect(db.query("update public.system_flags set enabled = false")).rejects.toThrow(
          /permission denied/,
        );
        await expect(
          db.query("select public.consume_ai_quota($1, null, 'chat', 99, 99, 99, 999999, 99)", [
            ALICE,
          ]),
        ).rejects.toThrow(/permission denied/);
      });
    }
  });

  it("restricts material uploads to the student's own folder", async () => {
    await as("authenticated", ALICE, async () => {
      await db.query(
        `insert into storage.objects (bucket_id, name) values ('materials', '${ALICE}/notes.txt')`,
      );
      await expect(
        db.query(
          `insert into storage.objects (bucket_id, name) values ('materials', '${BOB}/evil.txt')`,
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });
});

describe("progress triggers", () => {
  it("counts sessions, questions and graded exercises", async () => {
    await as("service_role", null, async () => {
      const ex = await db.query<{ id: string }>(
        `insert into public.exercises (user_id, mentor_id, question, answer, answer_type, explanation)
         values ($1, 'shamia', 'Compute 2+2', '4', 'numeric', '2+2 = 4') returning id`,
        [ALICE],
      );
      await db.query(
        "update public.exercises set status = 'completed', is_correct = true, student_answer = '4', completed_at = now(), graded_by = 'deterministic' where id = $1",
        [ex.rows[0].id],
      );
    });
    const p = await db.query(
      "select sessions_count, messages_count, exercises_completed, exercises_correct from public.progress where user_id = $1 and subject_id = 'mathematics'",
      [ALICE],
    );
    expect(p.rows[0]).toEqual({
      sessions_count: 1,
      messages_count: 1,
      exercises_completed: 1,
      exercises_correct: 1,
    });
  });
});

describe("exercise answers stay secret until solved", () => {
  it("masks answer and explanation in my_exercises and blocks the base table", async () => {
    await as("service_role", null, () =>
      db.query(
        `insert into public.exercises (user_id, mentor_id, question, answer, answer_type, explanation)
         values ($1, 'draa', 'How many protons in carbon?', '6', 'numeric', 'Atomic number 6')`,
        [ALICE],
      ),
    );
    await as("authenticated", ALICE, async () => {
      await expect(db.query("select answer from public.exercises")).rejects.toThrow(
        /permission denied/,
      );
      const rows = await db.query<{ question: string; answer: string | null; status: string }>(
        "select question, answer, status from public.my_exercises order by created_at",
      );
      const open = rows.rows.find((r) => r.status === "assigned");
      const done = rows.rows.find((r) => r.status === "completed");
      expect(open?.answer).toBeNull();
      expect(done?.answer).toBe("4");
    });
    await as("authenticated", BOB, async () => {
      expect((await db.query("select * from public.my_exercises")).rows).toHaveLength(0);
    });
  });
});

describe("consume_ai_quota", () => {
  const call = (user: string, ip: string | null, perMinute = 3, dailyTokens = 1000) =>
    as("service_role", null, async () => {
      const r = await db.query<{ q: { allowed: boolean; reason?: string; usage_id?: number } }>(
        "select public.consume_ai_quota($1, $2, 'chat', $3, 100, 5, $4, 3) as q",
        [user, ip, perMinute, dailyTokens],
      );
      return r.rows[0].q;
    });

  it("enforces the per-user burst limit", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await call(BOB, "ip-b"));
    expect(results.slice(0, 3).every((r) => r.allowed)).toBe(true);
    expect(results[3]).toMatchObject({ allowed: false, reason: "rate_limited" });
  });

  it("enforces the per-IP limit across accounts", async () => {
    // BOB has 3 accepted requests from ip-b (the rejected one is not recorded);
    // ALICE on the same IP gets 2 more before the 5/min IP limit applies.
    expect((await call(ALICE, "ip-b", 10)).allowed).toBe(true);
    expect((await call(ALICE, "ip-b", 10)).allowed).toBe(true);
    expect(await call(ALICE, "ip-b", 10)).toMatchObject({ allowed: false, reason: "rate_limited" });
  });

  it("enforces the daily token budget", async () => {
    const r = await call(ALICE, null, 50, 1000);
    await as("service_role", null, () =>
      db.query("select public.record_ai_tokens($1, 900, 200)", [r.usage_id]),
    );
    expect(await call(ALICE, null, 50, 1000)).toMatchObject({
      allowed: false,
      reason: "token_budget_exhausted",
    });
  });

  it("blocks after repeated abuse flags and honours the kill switch", async () => {
    await as("service_role", null, async () => {
      for (let i = 0; i < 3; i++) {
        await db.query(
          "insert into public.security_events (user_id, event, severity) values ($1, 'prompt_injection', 'warning')",
          [BOB],
        );
      }
    });
    expect(await call(BOB, null, 50, 10_000_000)).toMatchObject({
      allowed: false,
      reason: "temporarily_blocked",
    });

    await db.query("update public.system_flags set enabled = false where key = 'ai_enabled'");
    expect(await call(ALICE, null, 50, 10_000_000)).toMatchObject({
      allowed: false,
      reason: "ai_disabled",
    });
    await db.query("update public.system_flags set enabled = true where key = 'ai_enabled'");
  });
});

describe("parent accounts and guardian links", () => {
  const MUM = "66666666-6666-6666-6666-666666666666";
  const STRANGER = "77777777-7777-7777-7777-777777777777";

  beforeAll(async () => {
    await newUser(MUM, { account_type: "parent", display_name: "Mum" }, "mum@family.example");
    await newUser(
      STRANGER,
      { account_type: "parent", display_name: "Stranger" },
      "stranger@evil.example",
    );
  });

  it("does not link a parent whose email is not confirmed yet", async () => {
    await as("authenticated", MUM, async () => {
      await expect(db.query("select public.claim_guardian_links()")).rejects.toThrow(
        /email_not_confirmed/,
      );
    });
  });

  it("links the confirmed owner of the guardian email and shows progress, not chats", async () => {
    await db.query("update auth.users set email_confirmed_at = now() where id in ($1, $2)", [
      MUM,
      STRANGER,
    ]);
    await as("authenticated", MUM, async () => {
      const r = await db.query<{ n: number }>("select public.claim_guardian_links() as n");
      expect(r.rows[0].n).toBe(1);
      const o = await db.query<{
        o: { display_name: string; progress: unknown[]; recent_sessions: unknown[] }[];
      }>("select public.get_children_overview() as o");
      expect(o.rows[0].o).toHaveLength(1);
      expect(o.rows[0].o[0].display_name).toMatch(/Alice/);
      expect(o.rows[0].o[0].progress.length).toBeGreaterThan(0);
      expect(JSON.stringify(o.rows[0].o)).not.toContain("What is 1/2 + 1/4?"); // no chat content
      expect(JSON.stringify(o.rows[0].o)).not.toContain("Fractions"); // no free-text session title either
      expect(JSON.stringify(o.rows[0].o)).toContain("Mathematics, Logic & Statistics");
      // RLS still hides the child's raw tables from the parent
      expect((await db.query("select * from public.messages")).rows).toHaveLength(0);
      expect((await db.query("select * from public.sessions")).rows).toHaveLength(0);
    });
  });

  it("gives other parents nothing, and refuses the overview to students", async () => {
    await as("authenticated", STRANGER, async () => {
      expect(
        (await db.query<{ n: number }>("select public.claim_guardian_links() as n")).rows[0].n,
      ).toBe(0);
      expect(
        (await db.query<{ o: unknown[] }>("select public.get_children_overview() as o")).rows[0].o,
      ).toEqual([]);
    });
    await as("authenticated", ALICE, async () => {
      await expect(db.query("select public.get_children_overview()")).rejects.toThrow(
        /parents_only/,
      );
      await expect(
        db.query(
          "insert into public.guardian_links (student_id, guardian_email) values ($1, 'x@y.org')",
          [ALICE],
        ),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("keeps at least one guardian for minors and lets them add more", async () => {
    await as("authenticated", ALICE, async () => {
      const link = await db.query<{ id: string }>(
        "select id from public.guardian_links where student_id = $1",
        [ALICE],
      );
      await expect(
        db.query("select public.revoke_guardian_link($1)", [link.rows[0].id]),
      ).rejects.toThrow(/minors_need_a_guardian/);
      await db.query("select public.add_guardian_email('dad@family.example')");
      await db.query("select public.revoke_guardian_link($1)", [link.rows[0].id]);
      const rows = await db.query(
        "select guardian_email, status from public.guardian_links order by guardian_email",
      );
      expect(rows.rows).toEqual([
        { guardian_email: "dad@family.example", status: "pending" },
        { guardian_email: "mum@family.example", status: "revoked" },
      ]);
    });
    await as("authenticated", MUM, async () => {
      expect(
        (await db.query<{ o: unknown[] }>("select public.get_children_overview() as o")).rows[0].o,
      ).toEqual([]);
    });
  });
});
