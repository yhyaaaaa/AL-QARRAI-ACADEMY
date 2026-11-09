/**
 * Data-subject rights for students and their guardians:
 *   export → every record we hold about the student, as JSON
 *   delete → removes uploaded files and the auth user (all rows cascade)
 */
import type { Env, RequestContext } from "../_shared/context.ts";
import { HttpError } from "../_shared/http.ts";
import { AccountRequestSchema } from "../_shared/api.ts";

const MAX_INVITES_PER_LINK = 3;
const INVITE_COOLDOWN_MS = 24 * 3600 * 1000;

export async function handleAccount(ctx: RequestContext, raw: unknown, env: Env): Promise<unknown> {
  const parsed = AccountRequestSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "BAD_REQUEST", "Invalid account request.");
  const { db, student } = ctx;
  const uid = student.id;

  if (parsed.data.action === "invite_guardians") {
    if (student.accountType !== "student")
      throw new HttpError(403, "FORBIDDEN", "Only students can invite guardians.");
    const { data: links, error } = await db
      .from("guardian_links")
      .select("id, guardian_email, invited_at, invite_count")
      .eq("student_id", uid)
      .eq("status", "pending");
    if (error) throw new HttpError(500, "INTERNAL", "Could not read your guardians.");
    const site = (env("SITE_URL") ?? "http://localhost:5173").replace(/\/+$/, "");
    const results: { email: string; result: "invited" | "has_account" | "skipped" }[] = [];
    for (const link of links ?? []) {
      const recent =
        link.invited_at && Date.now() - new Date(link.invited_at).getTime() < INVITE_COOLDOWN_MS;
      if (recent || link.invite_count >= MAX_INVITES_PER_LINK) {
        results.push({ email: link.guardian_email, result: "skipped" });
        continue;
      }
      const { data: exists } = await db.rpc("email_has_account", { p_email: link.guardian_email });
      if (!exists) {
        // Supabase sends the invitation email; accepting it confirms the address and creates a parent account
        const { error: invErr } = await db.auth.admin.inviteUserByEmail(link.guardian_email, {
          data: { account_type: "parent", display_name: "Parent", preferred_language: "auto" },
          redirectTo: `${site}/parent/welcome`,
        });
        if (invErr)
          throw new HttpError(
            502,
            "INTERNAL",
            "The invitation email could not be sent. Please try again later.",
          );
      }
      await db
        .from("guardian_links")
        .update({ invited_at: new Date().toISOString(), invite_count: link.invite_count + 1 })
        .eq("id", link.id);
      results.push({ email: link.guardian_email, result: exists ? "has_account" : "invited" });
    }
    if (results.some((r) => r.result === "invited")) await ctx.logEvent("guardian_invited");
    return { results };
  }

  if (parsed.data.action === "export") {
    const q = async (table: string, column = "user_id") => {
      const { data, error } = await db.from(table).select("*").eq(column, uid);
      if (error) throw new HttpError(500, "INTERNAL", "Could not export your data.");
      return data;
    };
    const [profile, sessions, messages, exercises, documents, progress, guardianLinks] =
      await Promise.all([
        q("profiles", "id"),
        q("sessions"),
        q("messages"),
        q("exercises"),
        q("documents"),
        q("progress"),
        q("guardian_links", "student_id"),
      ]);
    await ctx.logEvent("data_exported");
    return {
      exportedAt: new Date().toISOString(),
      profile: profile[0],
      sessions,
      messages,
      exercises,
      documents,
      progress,
      guardianLinks,
    };
  }

  // delete: storage objects first (they do not cascade), then the auth user
  const bucket = db.storage.from("materials");
  for (;;) {
    const { data: files } = await bucket.list(uid, { limit: 100 });
    if (!files || files.length === 0) break;
    const { error } = await bucket.remove(files.map((f) => `${uid}/${f.name}`));
    if (error)
      throw new HttpError(
        500,
        "INTERNAL",
        "Could not delete your files. Nothing else was deleted.",
      );
  }
  const { error } = await db.auth.admin.deleteUser(uid);
  if (error)
    throw new HttpError(500, "INTERNAL", "Could not delete your account. Please contact support.");
  // keep an anonymous trace that a deletion happened (no user id: it would cascade away)
  await db
    .from("security_events")
    .insert({ user_id: null, event: "account_deleted", severity: "info" });
  return { deleted: true };
}
