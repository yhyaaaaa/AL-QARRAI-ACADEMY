/**
 * Read queries (protected by RLS: a student only ever receives their own rows)
 * and the few harmless writes students are allowed (rename/delete session, profile nickname/language).
 * Everything else is written by the Edge Functions.
 */
import { requireSupabase } from "./supabase/client";
import type {
  ChildOverview,
  DocumentRow,
  ExerciseView,
  GuardianLink,
  MessageRow,
  Profile,
  ProgressRow,
  SessionSummary,
} from "@/types";

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not load ${what}: ${res.error.message}`);
  return res.data as T;
}

export const data = {
  async profile(userId: string): Promise<Profile> {
    const sb = requireSupabase();
    return check(await sb.from("profiles").select("*").eq("id", userId).single(), "your profile");
  },

  async updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "display_name" | "preferred_language">>,
  ) {
    const sb = requireSupabase();
    check(await sb.from("profiles").update(patch).eq("id", userId), "your profile");
  },

  async sessions(): Promise<SessionSummary[]> {
    const sb = requireSupabase();
    const rows = check(
      await sb
        .from("sessions")
        .select("*, messages(count)")
        .order("updated_at", { ascending: false }),
      "your sessions",
    ) as (SessionSummary & { messages: { count: number }[] })[];
    return rows.map(({ messages, ...s }) => ({ ...s, message_count: messages?.[0]?.count ?? 0 }));
  },

  async messages(sessionId: string): Promise<MessageRow[]> {
    const sb = requireSupabase();
    return check(
      await sb.from("messages").select("*").eq("session_id", sessionId).order("created_at"),
      "the conversation",
    );
  },

  async exercises(sessionId?: string): Promise<ExerciseView[]> {
    const sb = requireSupabase();
    let q = sb.from("my_exercises").select("*").order("created_at", { ascending: false });
    if (sessionId) q = q.eq("session_id", sessionId);
    return check(await q, "your exercises");
  },

  async progress(): Promise<ProgressRow[]> {
    const sb = requireSupabase();
    return check(
      await sb
        .from("progress")
        .select("*, subjects(name, mentor_id)")
        .order("last_activity_at", { ascending: false }),
      "your progress",
    );
  },

  async documents(): Promise<DocumentRow[]> {
    const sb = requireSupabase();
    return check(
      await sb
        .from("documents")
        .select(
          "id, file_name, mime_type, size_bytes, status, extraction_method, char_count, flags, error, created_at",
        )
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(20),
      "your documents",
    );
  },

  // ── guardians ──
  async guardianLinks(): Promise<GuardianLink[]> {
    const sb = requireSupabase();
    return check(
      await sb.from("guardian_links").select("*").neq("status", "revoked").order("created_at"),
      "your guardians",
    );
  },

  async addGuardian(email: string): Promise<void> {
    const sb = requireSupabase();
    const { error } = await sb.rpc("add_guardian_email", { p_email: email });
    if (error) throw new Error(rpcMessage(error.message));
  },

  async revokeGuardian(linkId: string): Promise<void> {
    const sb = requireSupabase();
    const { error } = await sb.rpc("revoke_guardian_link", { p_link: linkId });
    if (error) throw new Error(rpcMessage(error.message));
  },

  /** parent: attach links addressed to the parent's CONFIRMED email */
  async claimGuardianLinks(): Promise<number> {
    const sb = requireSupabase();
    const { data: n, error } = await sb.rpc("claim_guardian_links");
    if (error) throw new Error(rpcMessage(error.message));
    return n as number;
  },

  async childrenOverview(): Promise<ChildOverview[]> {
    const sb = requireSupabase();
    const { data: rows, error } = await sb.rpc("get_children_overview");
    if (error) throw new Error(rpcMessage(error.message));
    return rows as ChildOverview[];
  },

  async renameSession(id: string, title: string) {
    const sb = requireSupabase();
    check(
      await sb
        .from("sessions")
        .update({ title: title.slice(0, 120) })
        .eq("id", id),
      "the session",
    );
  },

  async deleteSession(id: string) {
    const sb = requireSupabase();
    check(await sb.from("sessions").delete().eq("id", id), "the session");
  },
};

const RPC_MESSAGES: Record<string, string> = {
  invalid_guardian_email: "Please enter a valid email address.",
  guardian_email_must_differ: "The guardian email must be different from your own.",
  too_many_guardians: "You can link up to 3 guardians.",
  minors_need_a_guardian: "Students under 18 must keep at least one parent or guardian linked.",
  email_not_confirmed: "Please confirm your email address first.",
  parents_only: "This is only available to parent accounts.",
  students_only: "This is only available to student accounts.",
};

function rpcMessage(raw: string): string {
  const key = Object.keys(RPC_MESSAGES).find((k) => raw.includes(k));
  return key ? RPC_MESSAGES[key] : raw;
}
