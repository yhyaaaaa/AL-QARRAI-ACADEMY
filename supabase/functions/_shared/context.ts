/**
 * Per-request server context: authenticated student, service-role DB client, AI config,
 * quota/rate-limit gate, token accounting and security-event logging.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadAiConfig, type AiConfig } from "../mentor-response/config.ts";
import {
  createOpenAICompatibleProvider,
  type ChatProvider,
  type TokenUsage,
} from "../mentor-response/providers/openaiCompatible.ts";
import { HttpError, hashIp } from "./http.ts";

export type Env = (key: string) => string | undefined;

export interface Student {
  id: string;
  email: string;
  accountType: "student" | "parent";
  /** null for parent accounts */
  ageBand: "under_13" | "13_15" | "16_17" | "18_plus";
  preferredLanguage: "auto" | "en" | "fr" | "ar" | "tn";
  learner: { level: "beginner" | "intermediate" | "advanced"; styles: string[]; simplified: boolean };
}

export interface RequestContext {
  student: Student;
  db: SupabaseClient; // service role — every query MUST filter by student.id
  ai: AiConfig;
  ipHash: string | null;
  logEvent: (
    event: string,
    severity?: "info" | "warning" | "critical",
    meta?: Record<string, unknown>,
  ) => Promise<void>;
}

export function serviceClient(env: Env): SupabaseClient {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    throw new HttpError(500, "INTERNAL", "Server is missing its Supabase configuration.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function allowedOrigins(env: Env): string[] {
  return (env("ALLOWED_ORIGINS") ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Verifies the bearer JWT with Supabase Auth (signature, expiry, revocation) and loads the profile. */
export async function buildContext(
  req: Request,
  env: Env,
  opts: { studentsOnly?: boolean } = { studentsOnly: true },
): Promise<RequestContext> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "UNAUTHORIZED", "Please sign in.");
  const db = serviceClient(env);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "UNAUTHORIZED", "Your session has expired. Please sign in again.");

  const { data: profile, error: pErr } = await db
    .from("profiles")
    .select("account_type, age_band, preferred_language, level, learning_styles, accessibility")
    .eq("id", data.user.id)
    .single();
  if (pErr || !profile) throw new HttpError(403, "FORBIDDEN", "Your profile is missing.");
  if (opts.studentsOnly && profile.account_type !== "student") {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "This feature is for student accounts. Parents can follow progress from the parent dashboard.",
    );
  }

  const ipHash = await hashIp(req, env("IP_HASH_SALT") ?? env("SUPABASE_URL") ?? "qarrai");
  const student: Student = {
    id: data.user.id,
    email: data.user.email ?? "",
    accountType: profile.account_type,
    ageBand: profile.age_band ?? "18_plus",
    preferredLanguage: profile.preferred_language,
    learner: {
      level: profile.level ?? "intermediate",
      styles: profile.learning_styles ?? [],
      simplified: Boolean((profile.accessibility as { simplified?: boolean } | null)?.simplified),
    },
  };
  return {
    student,
    db,
    ai: loadAiConfig(env),
    ipHash,
    async logEvent(event, severity = "info", meta = {}) {
      await db
        .from("security_events")
        .insert({ user_id: student.id, ip_hash: ipHash, event, severity, meta });
    },
  };
}

export interface AiSession {
  provider: ChatProvider;
  /** persist token usage for this request's quota row */
  finish: () => Promise<void>;
  usage: TokenUsage[];
}

/**
 * The single gate in front of every model call: kill switches, rate limits, token budget.
 * Returns a provider bound to a request deadline and a hard max-output-token cap.
 */
export async function openAiSession(
  ctx: RequestContext,
  kind: "chat" | "exercise" | "grade" | "ocr",
): Promise<AiSession> {
  const { ai } = ctx;
  if (ai.killSwitch)
    throw new HttpError(
      503,
      "AI_DISABLED",
      "The AI mentors are temporarily switched off by the administrators.",
      300,
    );
  if (!ai.configured) {
    throw new HttpError(
      503,
      "AI_NOT_CONFIGURED",
      "The AI service is not configured on the server (AI_BASE_URL is missing).",
    );
  }

  const { data, error } = await ctx.db.rpc("consume_ai_quota", {
    p_user: ctx.student.id,
    p_ip_hash: ctx.ipHash,
    p_kind: kind,
    p_per_minute: ai.limits.perMinute,
    p_per_hour: ai.limits.perHour,
    p_ip_per_minute: ai.limits.ipPerMinute,
    p_daily_tokens: ai.limits.dailyTokenBudget,
    p_abuse_threshold: ai.limits.abuseThreshold,
  });
  if (error) throw new HttpError(500, "INTERNAL", "Could not check your usage limits.");
  const q = data as {
    allowed: boolean;
    reason?: string;
    retry_after_seconds?: number;
    usage_id?: number;
  };
  if (!q.allowed) {
    const messages: Record<string, string> = {
      ai_disabled: "The AI mentors are temporarily switched off by the administrators.",
      temporarily_blocked:
        "Your access to the mentors is paused for a while because of repeated unsafe requests.",
      rate_limited:
        "You're sending messages very quickly. Take a short break and try again in a moment.",
      token_budget_exhausted:
        "You've reached today's learning limit with the mentors. Come back tomorrow!",
    };
    const code = q.reason === "ai_disabled" ? "AI_DISABLED" : "RATE_LIMITED";
    if (q.reason !== "rate_limited") await ctx.logEvent(`quota_${q.reason}`, "warning");
    throw new HttpError(
      code === "AI_DISABLED" ? 503 : 429,
      code,
      messages[q.reason ?? "rate_limited"] ?? messages.rate_limited,
      q.retry_after_seconds,
    );
  }

  const usage: TokenUsage[] = [];
  const deadline = AbortSignal.timeout(ai.limits.requestDeadlineMs);
  const provider = createOpenAICompatibleProvider({
    baseUrl: ai.baseUrl,
    apiKey: ai.apiKey,
    timeoutMs: ai.timeoutMs,
    maxOutputTokens: ai.limits.maxOutputTokens,
    signal: deadline,
    onUsage: (u) => usage.push(u),
  });
  return {
    provider,
    usage,
    async finish() {
      const prompt = usage.reduce((a, u) => a + u.promptTokens, 0);
      const completion = usage.reduce((a, u) => a + u.completionTokens, 0);
      await ctx.db.rpc("record_ai_tokens", {
        p_usage_id: q.usage_id,
        p_prompt: prompt,
        p_completion: completion,
      });
    },
  };
}
