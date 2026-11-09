// @vitest-environment node
/**
 * Regression tests built from REAL outputs of the organisers' models (captured 2026-11-09).
 * Each one reproduced a defect that unit tests with hand-written strings had missed.
 */
import { checkArithmetic } from "./mathCheck.ts";
import { extractJsonObject } from "./validator.ts";
import { ExerciseSchema } from "./schemas.ts";
import { compareAnswer } from "../_shared/grading.ts";
import { activityIssues, optionValue, renderForReview, QuizSchema } from "./activities.ts";

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

  it("catches a diagnostic whose multiple-choice question has two equal options (real diagnostic, 2026-11-09)", () => {
    // Real Arabic diagnostic: Q3 asked which fraction equals 2/4 and offered both 1/2 and 4/8.
    // Q1's key also pointed at 2/3 for "3/6 equals?"; the readable rendering spells that out for the reviewer.
    const real = {
      questions: [
        { type: "mc", prompt: "اذا كانت الكسر \\( \\frac{3}{6} \\) مساوٍ للكسر التالي، فكم سيكون الكسر الآخر؟", options: ["1/2", "2/3", "1/3", "4/5"], answer: 1, explanation: "الكسر \\( \\frac{3}{6} \\) يساوي \\( \\frac{1}{2} \\).", hint: "فكّر في الكسر الذي يعادل \\( \\frac{1}{2} \\)." },
        { type: "tf", prompt: "الكسر \\( \\frac{5}{10} \\) هو الكسر الصغير.", answer: false, explanation: "الكسر \\( \\frac{5}{10} \\) يعادل \\( \\frac{1}{2} \\)." },
        { type: "mc", prompt: "اذا كان الكسر \\( \\frac{2}{4} \\) مساوٍ للكسر التالي، فكم سيكون الكسر الآخر؟", options: ["1/4", "2/8", "1/2", "4/8"], answer: 2, explanation: "الكسر \\( \\frac{2}{4} \\) يساوي \\( \\frac{1}{2} \\)." },
        { type: "tf", prompt: "الكسر \\( \\frac{7}{14} \\) هو الكسر الكبير.", answer: false, explanation: "الكسر \\( \\frac{7}{14} \\) يعادل \\( \\frac{1}{2} \\)." },
      ],
    };
    const parsed = QuizSchema.parse(real);
    const issues = activityIssues("diagnostic", parsed);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("Question 3");
    expect(renderForReview("diagnostic", parsed)).toContain("MARKED CORRECT: B) 2/3");
  });

  it("reads plain numeric options for the equal-options check", () => {
    expect(optionValue("1/2")).toBe(0.5);
    expect(optionValue("\\frac{4}{8}")).toBe(0.5);
    expect(optionValue("50%")).toBe(0.5);
    expect(optionValue("0,5")).toBe(0.5);
    expect(optionValue("x + 1")).toBeNull();
    expect(activityIssues("quiz", QuizSchema.parse({ questions: [
      { type: "mc", prompt: "2 + 2?", options: ["3", "4", "5"], answer: 1, explanation: "2 + 2 = 4" },
      { type: "tf", prompt: "1 > 0", answer: true, explanation: "yes" },
      { type: "short", prompt: "3 * 3?", answer: "9", explanation: "3 * 3 = 9" },
    ] }))).toEqual([]);
  });
});
