// @vitest-environment node
import { checkArithmetic, evaluate } from "./mathCheck.ts";

describe("evaluate", () => {
  it.each([
    ["2 + 3 * 4", 14],
    ["(2 + 3) * 4", 20],
    ["2^3^2", 512],
    ["-2 + 5", 3],
    ["2(3 + 4)", 14],
    ["3/4 + 1/2", 1.25],
  ])("%s = %d", (expr, expected) => {
    expect(evaluate(expr)?.value).toBeCloseTo(expected);
  });

  it("rejects invalid or unsafe input", () => {
    expect(evaluate("2 +")).toBeNull();
    expect(evaluate("1/0")).toBeNull();
    expect(evaluate("alert(1)")).toBeNull();
  });
});

describe("checkArithmetic", () => {
  it("accepts correct statements", () => {
    const r = checkArithmetic("Step 1: 12 × 7 = 84\nStep 2: 84 ÷ 4 = 21\nSo 3/4 + 1/2 = 5/4.");
    expect(r.issues).toEqual([]);
    expect(r.checked).toBe(3);
  });

  it("flags a wrong calculation", () => {
    const r = checkArithmetic("We get 7 * 8 = 54, so the answer is 54.");
    expect(r.checked).toBe(1);
    expect(r.issues[0]).toContain("56");
  });

  it("accepts answers rounded to their stated precision", () => {
    expect(checkArithmetic("10 / 3 = 3.33").issues).toEqual([]);
    expect(checkArithmetic("10 / 3 = 3").issues).toHaveLength(1);
  });

  it("handles thousands separators", () => {
    expect(checkArithmetic("1,000 + 5 = 1,005").issues).toEqual([]);
  });

  it("skips ambiguous or symbolic statements (no false alarms)", () => {
    const r = checkArithmetic(
      "Solve x + 2 = 5. Then 2x = 6, x = 3. Speed v = 10 m/s. Also 3,5 + 1 = 4,5 and a == b, c <= 4, π ≈ 3.14",
    );
    expect(r.issues).toEqual([]);
  });

  it("handles numbered list markers without merging numbers (regression)", () => {
    const ok = checkArithmetic("Step by step:\n\n1. 7 × 8 = 56\n2. 56 / 8 = 7");
    expect(ok).toEqual({ checked: 2, issues: [] });
    const bad = checkArithmetic("1. 7 × 8 = 54");
    expect(bad.issues[0]).toContain("56");
    expect(evaluate("1. 7")).toBeNull();
    expect(evaluate("3 4")).toBeNull();
  });

  it("checks LaTeX fractions as emitted by real models", () => {
    const real =
      "We convert \\( \\frac{3}{4} \\):\n\\[ \\frac{3}{4} = \\frac{3 \\times 2}{4 \\times 2} = \\frac{6}{8} \\]\n\\[ \\frac{6}{8} + \\frac{1}{8} = \\frac{6 + 1}{8} = \\frac{7}{8} \\]";
    const ok = checkArithmetic(real);
    expect(ok.issues).toEqual([]);
    expect(ok.checked).toBeGreaterThanOrEqual(3);
    expect(
      checkArithmetic("\\[ \\frac{6}{8} + \\frac{1}{8} = \\frac{5}{8} \\]").issues,
    ).toHaveLength(1);
  });

  it("normalises LaTeX-ish operators", () => {
    expect(checkArithmetic("6 \\times 7 = 42").issues).toEqual([]);
    expect(checkArithmetic("5² = 25").issues).toEqual([]);
  });
});
