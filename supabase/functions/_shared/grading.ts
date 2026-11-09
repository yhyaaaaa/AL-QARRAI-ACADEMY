/** Deterministic answer comparison (no AI). Returns null when a judgement needs language understanding. */

function parseNumber(s: string): number {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const frac = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(cleaned);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const m = /^-?\d+(?:\.\d+)?$/.exec(cleaned) ?? /-?\d+(?:\.\d+)?/.exec(cleaned);
  return m ? Number(m[0]) : Number.NaN;
}

export function normaliseText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ْٰ]/g, "") // Arabic diacritics
    .replace(/[̀-ͯ]/g, "") // Latin accents
    .replace(/[^\p{L}\p{N}' ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareAnswer(
  expected: string,
  given: string,
  type: "numeric" | "text",
): boolean | null {
  if (!given.trim()) return false;
  if (type === "numeric") {
    const a = parseNumber(expected);
    const b = parseNumber(given);
    if (Number.isNaN(a)) return null;
    if (Number.isNaN(b)) return false;
    return Math.abs(a - b) <= Math.max(1e-6 * Math.abs(a), 0.005);
  }
  const ne = normaliseText(expected);
  const ng = normaliseText(given);
  if (!ng) return false;
  if (ne === ng) return true;
  const core = normaliseText(expected.split("(")[0]);
  if (core && (ng === core || ` ${ng} `.includes(` ${core} `))) return true;
  return null; // semantic judgement needed
}

export const MAX_ATTEMPTS = 3;
