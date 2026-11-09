/**
 * Text extraction for uploaded learning material. Runtime-agnostic (Deno + Node tests).
 * File type is decided from the bytes (magic numbers), never from the client's claim.
 */
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 60;
export const MAX_EXTRACTED_CHARS = 60_000;

export type DetectedType =
  | { kind: "text"; mime: "text/plain" | "text/markdown" | "text/csv" }
  | { kind: "pdf"; mime: "application/pdf" }
  | { kind: "image"; mime: "image/png" | "image/jpeg" | "image/webp" };

export class ExtractionError extends Error {}

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  sig.every((v, i) => b[offset + i] === v);

export function detectType(bytes: Uint8Array, fileName: string): DetectedType {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]))
    return { kind: "pdf", mime: "application/pdf" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { kind: "image", mime: "image/png" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { kind: "image", mime: "image/jpeg" };
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { kind: "image", mime: "image/webp" };
  }
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "txt" || ext === "md" || ext === "csv") {
    // must be valid UTF-8 without binary NUL bytes
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ExtractionError("This text file is not valid UTF-8 text.");
    }
    if (bytes.includes(0)) throw new ExtractionError("This file looks binary, not text.");
    return {
      kind: "text",
      mime: ext === "md" ? "text/markdown" : ext === "csv" ? "text/csv" : "text/plain",
    };
  }
  throw new ExtractionError(
    "Unsupported file. Upload a .txt, .md, .csv, a PDF, or a PNG/JPEG/WEBP photo of your notes.",
  );
}

export function toDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

const clean = (t: string) =>
  t
    .replaceAll(String.fromCharCode(0), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export async function extractDocumentText(
  bytes: Uint8Array,
  fileName: string,
  ocr: (dataUrl: string) => Promise<string>,
): Promise<{ text: string; method: "text" | "pdf" | "ocr"; mime: string; truncated: boolean }> {
  if (bytes.byteLength === 0) throw new ExtractionError("The file is empty.");
  if (bytes.byteLength > MAX_BYTES) throw new ExtractionError("Files must be 10 MB or smaller.");
  const type = detectType(bytes, fileName);

  let text: string;
  let method: "text" | "pdf" | "ocr";
  if (type.kind === "text") {
    text = new TextDecoder().decode(bytes);
    method = "text";
  } else if (type.kind === "pdf") {
    let pdf;
    try {
      pdf = await getDocumentProxy(new Uint8Array(bytes));
    } catch {
      throw new ExtractionError(
        "This PDF could not be opened (it may be damaged or password-protected).",
      );
    }
    if (pdf.numPages > MAX_PDF_PAGES)
      throw new ExtractionError(`PDFs are limited to ${MAX_PDF_PAGES} pages.`);
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    method = "pdf";
    if (clean(text).length < 20) {
      throw new ExtractionError(
        "This PDF has no selectable text (it is probably scanned). Upload photos of the pages instead.",
      );
    }
  } else {
    text = await ocr(toDataUrl(bytes, type.mime));
    method = "ocr";
  }

  const cleaned = clean(text);
  if (!cleaned) throw new ExtractionError("No readable text was found in this file.");
  return {
    text: cleaned.slice(0, MAX_EXTRACTED_CHARS),
    method,
    mime: type.mime,
    truncated: cleaned.length > MAX_EXTRACTED_CHARS,
  };
}
