/**
 * Supabase Edge Function `mentor-response` (Deno).
 *   POST { action: "chat", ... }  → one validated tutoring turn (persisted server-side)
 *   POST { action: "grade", ... } → server-side exercise correction
 *
 * The gateway verifies the JWT (verify_jwt = true); buildContext re-verifies it with Supabase Auth.
 * Secrets: supabase secrets set --env-file supabase/functions/.env
 */
import { buildContext, allowedOrigins } from "../_shared/context.ts";
import { corsHeaders, errorResponse, HttpError, json, readJson } from "../_shared/http.ts";
import { handleChat } from "./chat.ts";
import { handleGrade } from "./grade.ts";
import { handleCheck, handleGenerate } from "./learn.ts";

const env = (k: string) => Deno.env.get(k);

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req, allowedOrigins(env));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    if (req.method !== "POST") throw new HttpError(405, "BAD_REQUEST", "Method not allowed.");
    const body = (await readJson(req, 32_000)) as { action?: string };
    const ctx = await buildContext(req, env);
    if (body?.action === "chat") return json(await handleChat(ctx, body), 200, cors);
    if (body?.action === "grade") return json(await handleGrade(ctx, body), 200, cors);
    if (body?.action === "generate") return json(await handleGenerate(ctx, body), 200, cors);
    if (body?.action === "check") return json(await handleCheck(ctx, body), 200, cors);
    throw new HttpError(400, "BAD_REQUEST", "Unknown action.");
  } catch (e) {
    return errorResponse(e, cors);
  }
});
