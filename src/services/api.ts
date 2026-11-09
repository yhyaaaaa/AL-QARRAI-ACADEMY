/**
 * Calls to the Edge Functions. Errors are surfaced as ApiError with a student-readable message —
 * there is no silent fallback to simulated behaviour.
 */
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { requireSupabase } from "./supabase/client";
import type {
  ApiErrorBody,
  ChatRequest,
  ChatResponse,
  GradeResponse,
} from "../../supabase/functions/_shared/api.ts";
import type { DocumentRow } from "@/types";

export class ApiError extends Error {
  readonly code: string;
  readonly retryAfterSeconds?: number;
  constructor(code: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as T;

  if (error instanceof FunctionsHttpError) {
    const parsed = (await (error.context as Response)
      .json()
      .catch(() => null)) as ApiErrorBody | null;
    if (parsed?.error) {
      throw new ApiError(parsed.error.code, parsed.error.message, parsed.error.retryAfterSeconds);
    }
    const status = (error.context as Response).status;
    if (status === 401)
      throw new ApiError("UNAUTHORIZED", "Your session has expired. Please sign in again.");
    throw new ApiError("HTTP_" + status, `The server returned an error (HTTP ${status}).`);
  }
  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    throw new ApiError(
      "NETWORK",
      "Can't reach the Qarrai server. Check your internet connection, or the server may be down. Please try again.",
    );
  }
  throw new ApiError("UNKNOWN", error.message);
}

export const api = {
  chat: (req: Omit<ChatRequest, "action">) =>
    callFunction<ChatResponse>("mentor-response", { action: "chat", ...req }),
  grade: (exerciseId: string, answer: string) =>
    callFunction<GradeResponse>("mentor-response", { action: "grade", exerciseId, answer }),
  processDocument: (storagePath: string, fileName: string) =>
    callFunction<{ document: DocumentRow; preview: string }>("process-document", {
      storagePath,
      fileName,
    }),
  inviteGuardians: () =>
    callFunction<{ results: { email: string; result: "invited" | "has_account" | "skipped" }[] }>(
      "account",
      {
        action: "invite_guardians",
      },
    ),
  exportAccount: () => callFunction<Record<string, unknown>>("account", { action: "export" }),
  deleteAccount: () =>
    callFunction<{ deleted: boolean }>("account", {
      action: "delete",
      confirm: "DELETE MY ACCOUNT",
    }),
};
