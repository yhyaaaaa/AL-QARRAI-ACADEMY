#!/usr/bin/env node
/**
 * Creates the demo student + parent pair (linked) on the LOCAL Supabase stack, for recordings.
 * Accounts and passwords are in scripts/demo-accounts.json. They are demo-only: they exist only
 * in a local database after running this script and must never be used on a hosted project.
 *
 *   eval "$(npx supabase status -o env | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=')"
 *   ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY node scripts/create-demo-accounts.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const API_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!ANON || !SERVICE) throw new Error("Set ANON_KEY and SERVICE_ROLE_KEY (from `npx supabase status -o env`).");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(API_URL)) throw new Error("Demo accounts are for the local stack only.");

const { student, parent } = JSON.parse(readFileSync(new URL("./demo-accounts.json", import.meta.url), "utf8"));
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(API_URL, SERVICE, opts);

async function ensure(acc, meta) {
  const c = createClient(API_URL, ANON, opts);
  let { data, error } = await c.auth.signInWithPassword({ email: acc.email, password: acc.password });
  if (!error) return { c, id: data.user.id, existed: true };
  const signUp = await c.auth.signUp({ email: acc.email, password: acc.password, options: { data: meta } });
  if (signUp.error) throw signUp.error;
  await admin.auth.admin.updateUserById(signUp.data.user.id, { email_confirm: true }); // stands in for the email link
  ({ data, error } = await c.auth.signInWithPassword({ email: acc.email, password: acc.password }));
  if (error) throw error;
  return { c, id: data.user.id, existed: false };
}

const s = await ensure(student, {
  account_type: "student",
  display_name: student.name,
  age_band: student.ageBand,
  guardian_consent: true,
  guardian_email: parent.email,
  preferred_language: "en",
});
const p = await ensure(parent, { account_type: "parent", display_name: parent.name, preferred_language: "en" });
const { error: claimErr } = await p.c.rpc("claim_guardian_links");
if (claimErr) throw claimErr;
const { data: kids, error: kidsErr } = await p.c.rpc("get_children_overview");
if (kidsErr) throw kidsErr;
console.log(
  `student ${student.name}: ${s.existed ? "already existed" : "created"} · parent ${parent.name}: ${p.existed ? "already existed" : "created"} · parent sees: ${kids.map((k) => k.display_name).join(", ") || "nobody"}`,
);
