import type { RequestContext } from "../_shared/context.ts";
import { openAiSession } from "../_shared/context.ts";
import { HttpError } from "../_shared/http.ts";
import { detectInjection } from "../_shared/safety.ts";
import { ProcessDocumentSchema, type DocumentRow } from "../_shared/api.ts";
import { ProviderError } from "../mentor-response/providers/openaiCompatible.ts";
import { extractDocumentText, ExtractionError, MAX_BYTES } from "./extract.ts";

const DOC_COLUMNS =
  "id, file_name, mime_type, size_bytes, status, extraction_method, char_count, flags, error, created_at";

export async function handleProcessDocument(
  ctx: RequestContext,
  raw: unknown,
): Promise<{ document: DocumentRow; preview: string }> {
  const parsed = ProcessDocumentSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "BAD_REQUEST", "Invalid upload request.");
  const { storagePath, fileName } = parsed.data;
  const { db, student } = ctx;

  // the object must live in the student's own folder; no traversal, no nesting
  const pathRe = new RegExp(`^${student.id}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$`);
  if (!pathRe.test(storagePath) || storagePath.includes("..")) {
    throw new HttpError(403, "FORBIDDEN", "You can only process your own uploads.");
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", student.id)
    .gte("created_at", since);
  if ((count ?? 0) >= ctx.ai.limits.documentsPerDay) {
    throw new HttpError(
      429,
      "RATE_LIMITED",
      "You've uploaded a lot of documents today. Please try again tomorrow.",
      3600,
    );
  }

  const bucket = db.storage.from("materials");
  const { data: blob, error: dlErr } = await bucket.download(storagePath);
  if (dlErr || !blob)
    throw new HttpError(
      404,
      "NOT_FOUND",
      "The uploaded file was not found. Please upload it again.",
    );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    await bucket.remove([storagePath]);
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Files must be 10 MB or smaller.");
  }

  // strip control characters and angle brackets from the display name
  // eslint-disable-next-line no-control-regex -- intentional: removing control characters
  const safeName = fileName.replace(/[\u0000-\u001f<>]/g, "").slice(0, 200) || "document";
  const { data: row, error: insErr } = await db
    .from("documents")
    .insert({
      user_id: student.id,
      storage_path: storagePath,
      file_name: safeName,
      mime_type: blob.type || "application/octet-stream",
      size_bytes: bytes.byteLength,
      status: "processing",
    })
    .select("id")
    .single();
  if (insErr || !row) throw new HttpError(409, "BAD_REQUEST", "This file was already processed.");

  const fail = async (message: string) => {
    await db.from("documents").update({ status: "failed", error: message }).eq("id", row.id);
    await bucket.remove([storagePath]); // don't keep files we can't use
  };

  try {
    const result = await extractDocumentText(bytes, safeName, async (dataUrl) => {
      const ai = await openAiSession(ctx, "ocr");
      try {
        return await ai.provider.complete({
          model: ctx.ai.models.ocr,
          temperature: 0,
          maxTokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all text from this image. Output only the extracted text, preserving line breaks.",
                },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        });
      } finally {
        await ai.finish();
      }
    });

    const flags = detectInjection(result.text);
    if (flags.length)
      await ctx.logEvent("prompt_injection", "warning", { patterns: flags, source: "document" });

    const { data: doc, error } = await db
      .from("documents")
      .update({
        status: "ready",
        mime_type: result.mime,
        extraction_method: result.method,
        extracted_text: result.text,
        char_count: result.text.length,
        flags,
        error: null,
      })
      .eq("id", row.id)
      .select(DOC_COLUMNS)
      .single();
    if (error || !doc) throw new HttpError(500, "INTERNAL", "Could not save the extracted text.");
    return { document: doc as DocumentRow, preview: result.text.slice(0, 280) };
  } catch (e) {
    if (e instanceof ExtractionError) {
      await fail(e.message);
      throw new HttpError(422, "BAD_REQUEST", e.message);
    }
    if (e instanceof ProviderError) {
      await fail("OCR service unavailable");
      throw new HttpError(
        502,
        "PROVIDER_ERROR",
        "The text-recognition service did not answer. Please try again later.",
      );
    }
    if (e instanceof HttpError) {
      await fail(e.message);
      throw e;
    }
    await fail("Unexpected processing error");
    throw e;
  }
}
