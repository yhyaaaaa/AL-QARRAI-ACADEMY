import type { ModelConfig } from "./modelRouter.ts";

export interface SecurityLimits {
  /** AI requests per student per minute (burst) */
  perMinute: number;
  /** AI requests per student per hour (sustained) */
  perHour: number;
  /** AI requests per client IP per minute, across accounts (flooding) */
  ipPerMinute: number;
  /** tokens (prompt + completion) per student per 24 h */
  dailyTokenBudget: number;
  /** prompt-injection / abuse events per hour before a temporary block */
  abuseThreshold: number;
  /** hard ceiling on max_tokens for any single model call */
  maxOutputTokens: number;
  /** whole-request deadline; every model call is aborted when it passes */
  requestDeadlineMs: number;
  /** uploads per student per 24 h */
  documentsPerDay: number;
}

export interface AiConfig {
  configured: boolean;
  /** AI_KILL_SWITCH=true stops every AI call immediately (also: system_flags.ai_enabled in the DB) */
  killSwitch: boolean;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  enableClassifier: boolean;
  models: ModelConfig;
  limits: SecurityLimits;
}

const int = (v: string | undefined, fallback: number, min = 1) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
};

/** Build config from any env getter (Deno.env.get or a process.env lookup). */
export function loadAiConfig(get: (key: string) => string | undefined): AiConfig {
  const baseUrl = (get("AI_BASE_URL") ?? "").trim().replace(/\/+$/, "");
  const apiKey = (get("AI_API_KEY") ?? "").trim();
  return {
    configured: baseUrl.length > 0,
    killSwitch: (get("AI_KILL_SWITCH") ?? "").toLowerCase() === "true",
    baseUrl,
    apiKey,
    timeoutMs: int(get("AI_TIMEOUT_MS"), 60_000),
    enableClassifier: (get("AI_ENABLE_CLASSIFIER") ?? "true").toLowerCase() !== "false",
    models: {
      fast: get("MODEL_FAST") || "llama3.2-3b",
      draft: get("MODEL_DRAFT") || "qwen2.5-3b",
      validator: get("MODEL_VALIDATOR") || "llama3.1-8b",
      writing: get("MODEL_WRITING") || "mistral-7b",
      coder: get("MODEL_CODER") || "qwen2.5-coder-7b",
      ocr: get("MODEL_OCR") || "deepseek-ocr",
    },
    limits: {
      perMinute: int(get("RATE_LIMIT_PER_MINUTE"), 6),
      perHour: int(get("RATE_LIMIT_PER_HOUR"), 60),
      ipPerMinute: int(get("RATE_LIMIT_IP_PER_MINUTE"), 30),
      dailyTokenBudget: int(get("DAILY_TOKEN_BUDGET"), 150_000),
      abuseThreshold: int(get("ABUSE_BLOCK_THRESHOLD"), 5),
      maxOutputTokens: int(get("AI_MAX_OUTPUT_TOKENS"), 900),
      requestDeadlineMs: int(get("AI_REQUEST_DEADLINE_MS"), 120_000),
      documentsPerDay: int(get("DOCUMENTS_PER_DAY"), 30),
    },
  };
}
