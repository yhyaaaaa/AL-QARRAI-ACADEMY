/**
 * Upload pipeline: client-side checks → private Storage (own folder) → process-document function
 * (server re-validates type from bytes, extracts text with PDF parser or OCR, scans for injection).
 */
import { requireSupabase } from "./supabase/client";
import { api } from "./api";
import type { DocumentRow } from "@/types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPT = ".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.webp";
const ALLOWED_EXT = /\.(txt|md|csv|pdf|png|jpe?g|webp)$/i;
const MIME_BY_EXT: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function uploadDocument(
  file: File,
  userId: string,
): Promise<{ document: DocumentRow; preview: string }> {
  if (!ALLOWED_EXT.test(file.name)) {
    throw new Error(
      "Unsupported file. Use a .txt, .md, .csv, a PDF, or a PNG/JPEG/WEBP photo of your notes.",
    );
  }
  if (file.size === 0) throw new Error("This file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Files must be 10 MB or smaller.");

  const ext = file.name.split(".").pop()!.toLowerCase();
  const safeName =
    file.name
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^[._]+/, "")
      .slice(-80) || `file.${ext}`;
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  const sb = requireSupabase();
  const { error } = await sb.storage.from("materials").upload(path, file, {
    contentType: MIME_BY_EXT[ext],
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return api.processDocument(path, file.name);
}
