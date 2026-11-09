/** Supabase Edge Function `account` (Deno): export or delete the signed-in student's data. */
import { buildContext, allowedOrigins } from "../_shared/context.ts";
import { corsHeaders, errorResponse, HttpError, json, readJson } from "../_shared/http.ts";
import { handleAccount } from "./handler.ts";

const env = (k: string) => Deno.env.get(k);

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req, allowedOrigins(env));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    if (req.method !== "POST") throw new HttpError(405, "BAD_REQUEST", "Method not allowed.");
    const body = await readJson(req, 2_000);
    const ctx = await buildContext(req, env, { studentsOnly: false });
    return json(await handleAccount(ctx, body, env), 200, cors);
  } catch (e) {
    return errorResponse(e, cors);
  }
});
