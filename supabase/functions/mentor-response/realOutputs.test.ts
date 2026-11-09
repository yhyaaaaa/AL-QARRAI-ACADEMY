// @vitest-environment node
/**
 * Regression tests built from REAL outputs of the organisers' models (captured 2026-11-09).
 * Each one reproduced a defect that unit tests with hand-written strings had missed.
 */
import { checkArithmetic } from "./mathCheck.ts";
import { extractJsonObject } from "./validator.ts";
import { ExerciseSchema } from "./schemas.ts";
import { compareAnswer } from "../_shared/grading.ts";

describe("real qwen2.5-3b outputs", () => {
  it("does not read Markdown bullets as minus signs", () => {
    const real =
      "Let's break it down:\n-   12 * 7 = 12 * (5 + 2)\n-   12 * 5 = 60\n-   12 * 2 = 24\n-   60 + 24 = 84";
    const r = checkArithmetic(real);
    expect(r.issues).toEqual([]);
    expect(r.checked).toBe(4);
    // a genuine mistake inside a bullet is still caught
    expect(checkArithmetic("-   12 * 5 = 65").issues).toHaveLength(1);
    // a real negative number mid-line still evaluates as negative
    expect(checkArithmetic("so we get -3 + 5 = 2").issues).toEqual([]);
  });

  it("parses exercise JSON that contains raw LaTeX escapes", () => {
    const real =
      '{"question": "Given the quadratic equation \\(2x^2 - 5x + 2 = 0\\), find the roots using \\(x = \\\\frac{-b \\\\pm \\\\sqrt{b^2-4ac}}{2a}\\).", "hints": ["Remember to calculate the discriminant first, \\(b^2 - 4ac\\)."], "answer": "1, \\\\frac{1}{2}", "answerType": "numeric", "explanation": "Here, the discriminant is 9, so the second root is \\\\frac{1}{2}."}';
    const parsed = ExerciseSchema.safeParse(extractJsonObject(real));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.question).toContain("\\(2x^2");
      expect(parsed.data.answer).toBe("1, \\frac{1}{2}");
    }
  });

  it("does not turn an unescaped \\frac into a form-feed", () => {
    const parsed = extractJsonObject(
      '{"answer": "\\frac{1}{2}", "note": "line one\\nline two"}',
    ) as Record<string, string>;
    expect(parsed.answer).toBe("\\frac{1}{2}");
    expect(parsed.note).toBe("line one\nline two");
  });

  it("deterministically rejects the model's wrong root (the answer must be 2 and 1/2, not 1)", () => {
    // 2·1² − 5·1 + 2 = −1 ≠ 0: substitution check written the way a mentor would show it
    expect(checkArithmetic("2*1^2 - 5*1 + 2 = 0").issues).toHaveLength(1);
    expect(checkArithmetic("2*2^2 - 5*2 + 2 = 0").issues).toEqual([]);
    expect(compareAnswer("2", "1", "numeric")).toBe(false);
  });
});
