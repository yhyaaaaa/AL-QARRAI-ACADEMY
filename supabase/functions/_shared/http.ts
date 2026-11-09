/**
 * HTTP helpers shared by every Edge Function: strict CORS allow-list, JSON responses,
 * bounded body parsing and typed errors. Runtime-agnostic (Deno and Node test runs).
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "AI_DISABLED"
  | "AI_NOT_CONFIGURED"
  | "PROVIDER_ERROR"
  | "INTERNAL";

export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly retryAfter?: number;
  constructor(status: number, code: ErrorCode, message: string, retryAfter?: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/** ALLOWED_ORIGINS="https://app.example.com,http://localhost:5173" — unknown origins get no CORS headers. */
export function corsHeaders(req: Request, allowedOrigins: string[]): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = allowedOrigins.includes("*") || allowedOrigins.includes(origin);
  return {
    ...(allow && origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}

const SECURITY_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function json(
  body: unknown,
  status: number,
  cors: Record<string, string>,
  extra?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, ...cors, ...extra },
  });
}

export function errorResponse(err: unknown, cors: Record<string, string>) {
  if (err instanceof HttpError) {
    return json(
      { error: { code: err.code, message: err.message, retryAfterSeconds: err.retryAfter } },
      err.status,
      cors,
      err.retryAfter ? { "Retry-After": String(err.retryAfter) } : undefined,
    );
  }
  // never leak internals to the client
  console.error(
    JSON.stringify({
      event: "unhandled_error",
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  return json(
    { error: { code: "INTERNAL", message: "Something went wrong on our side. Please try again." } },
    500,
    cors,
  );
}

/** Read a JSON body with a hard byte limit (rejects oversized payloads before parsing). */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request is too large.");
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > maxBytes)
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request is too large.");
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }
}

/** Salted SHA-256 of the client IP: lets us rate-limit per address without storing the address. */
export async function hashIp(req: Request, salt: string): Promise<string | null> {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "";
  if (!raw) return null;
  const data = new TextEncoder().encode(`${salt}:${raw}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function randomToken(bytes = 8): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
