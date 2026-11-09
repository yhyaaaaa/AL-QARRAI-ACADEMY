// @vitest-environment node
import { detectType, extractDocumentText, ExtractionError } from "./extract.ts";

/** Build a minimal, valid one-page PDF with the given text (real xref offsets). */
function makePdf(text: string): Uint8Array {
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

const noOcr = async () => {
  throw new Error("OCR should not be called");
};

describe("document extraction", () => {
  it("extracts real text from a PDF", async () => {
    const r = await extractDocumentText(makePdf("Newton second law F = m a"), "physics.pdf", noOcr);
    expect(r.method).toBe("pdf");
    expect(r.text).toContain("Newton second law");
  });

  it("reads UTF-8 text files (including Arabic)", async () => {
    const r = await extractDocumentText(
      new TextEncoder().encode("الكسور: نصف + ربع"),
      "notes.md",
      noOcr,
    );
    expect(r).toMatchObject({ method: "text", mime: "text/markdown" });
    expect(r.text).toContain("نصف");
  });

  it("sends images to OCR, detected from bytes", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const r = await extractDocumentText(png, "page.txt", async (url) => {
      expect(url.startsWith("data:image/png;base64,")).toBe(true);
      return "Chapter 1";
    });
    expect(r).toMatchObject({ method: "ocr", text: "Chapter 1" });
  });

  it("rejects spoofed or unsupported files", async () => {
    expect(() => detectType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), "homework.pdf")).toThrow(
      ExtractionError,
    );
    expect(() => detectType(new Uint8Array([0xff, 0xfe, 0x00, 0x41]), "notes.txt")).toThrow(
      ExtractionError,
    );
    await expect(extractDocumentText(new Uint8Array(), "a.txt", noOcr)).rejects.toThrow(/empty/);
  });
});
