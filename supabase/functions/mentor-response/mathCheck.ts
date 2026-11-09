/**
 * Deterministic arithmetic verification.
 *
 * Scans a model's answer for explicit numeric statements such as `12 × 7 = 84` or
 * `3/4 + 1/2 = 1.25` and re-computes them with a small, safe expression parser (no eval).
 * Design goal: ZERO false alarms. Anything ambiguous (variables, decimal commas, units glued
 * to numbers, approximations with ≈) is skipped rather than flagged.
 */

export interface ArithmeticCheckResult {
  checked: number;
  issues: string[];
}

const ALLOWED = /[0-9.\s()+\-*/^]/;

/** Rewrites LaTeX that small models emit (\frac, \left(, \( … \)) into plain arithmetic. */
function delatex(text: string): string {
  let t = text
    .replace(/\\[()[\]]/g, " ") // \( \) \[ \] delimiters
    .replace(/\$+/g, " ")
    .replace(/\\left|\\right/g, "")
    .replace(/\\[,;!: ]/g, " ");
  // innermost-first \frac{a}{b} → ((a)/(b)); repeat for nested fractions
  for (let i = 0; i < 5 && /\\[dt]?frac\{[^{}]*\}\{[^{}]*\}/.test(t); i++) {
    t = t.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))");
  }
  return t;
}

export function normalizeMath(text: string): string {
  return (
    delatex(text)
      .replace(/\\times|\\cdot|[×·⋅∙]/g, "*")
      .replace(/\\div|÷/g, "/")
      .replace(/[−–]/g, "-")
      .replace(/\*\*/g, "^")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      // strip markdown emphasis / inline code markers around numbers
      .replace(/[`]/g, " ")
      // thousands separators: 1,000,000 → 1000000 (only exact groups of 3)
      .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
  );
}

/** Recursive-descent evaluator for + - * / ^ ( ) with unary minus and implicit `2(3)`. */
export function evaluate(expr: string): { value: number; ops: number } | null {
  // Two numbers separated only by whitespace ("1. 7", "3 4") are not an expression:
  // stripping the space would silently merge them into "1.7" / "34".
  if (/\d\.?\s+\.?\d/.test(expr)) return null;
  const src = expr.replace(/\s+/g, "");
  if (!src) return null;
  let pos = 0;
  let ops = 0;

  const peek = () => src[pos];

  function parseNumber(): number | null {
    const m = /^(\d+(?:\.\d+)?|\.\d+)\.?/.exec(src.slice(pos));
    if (!m) return null;
    pos += m[0].length;
    return parseFloat(m[1]);
  }

  function parsePrimary(): number | null {
    if (peek() === "(") {
      pos++;
      const v = parseExpr();
      if (v === null || peek() !== ")") return null;
      pos++;
      return v;
    }
    return parseNumber();
  }

  function parseUnary(): number | null {
    if (peek() === "-") {
      pos++;
      const v = parseUnary();
      return v === null ? null : -v;
    }
    if (peek() === "+") {
      pos++;
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): number | null {
    let base = parsePrimary();
    if (base === null) return null;
    // implicit multiplication: 2(3+4)
    while (peek() === "(") {
      const rhs = parsePrimary();
      if (rhs === null) return null;
      ops++;
      base *= rhs;
    }
    if (peek() === "^") {
      pos++;
      const exp = parseUnary();
      if (exp === null) return null;
      ops++;
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseTerm(): number | null {
    let left = parseUnary();
    if (left === null) return null;
    while (peek() === "*" || peek() === "/") {
      const op = src[pos++];
      const right = parseUnary();
      if (right === null) return null;
      if (op === "/" && right === 0) return null;
      ops++;
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() === "+" || peek() === "-") {
      const op = src[pos++];
      const right = parseTerm();
      if (right === null) return null;
      ops++;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  const value = parseExpr();
  if (value === null || pos !== src.length || !Number.isFinite(value)) return null;
  return { value, ops };
}

function decimalsOf(literal: string): number | null {
  const m = /^-?\d+(?:\.(\d+))?\.?$/.exec(literal.trim());
  if (!m) return null; // not a plain number literal
  return m[1]?.length ?? 0;
}

function approximatelyEqual(actual: number, stated: number, statedLiteral: string): boolean {
  if (Math.abs(actual - stated) <= 1e-9 * Math.max(1, Math.abs(actual))) return true;
  const d = decimalsOf(statedLiteral);
  // Accept rounding to the precision the answer was written with (e.g. 10/3 = 3.33).
  if (d !== null && d > 0) return Math.abs(actual - stated) <= Math.pow(10, -d) + 1e-12;
  return false;
}

export function checkArithmetic(text: string): ArithmeticCheckResult {
  const src = normalizeMath(text);
  const issues: string[] = [];
  let checked = 0;

  for (let i = 0; i < src.length; i++) {
    if (src[i] !== "=") continue;
    const prev = src[i - 1];
    const next = src[i + 1];
    if (
      prev === "=" ||
      prev === "<" ||
      prev === ">" ||
      prev === "!" ||
      next === "=" ||
      next === ">"
    ) {
      continue;
    }

    // scan left
    let l = i - 1;
    while (l >= 0 && src[l] !== "\n" && ALLOWED.test(src[l])) l--;
    // drop a leading list marker such as "1. " or "2) " at the start of a line
    // At the start of a line, drop Markdown list markers: "1. ", "2) ", "- ", "* ", "+ ".
    // (Regression: real qwen2.5-3b output "-   12 * 7 = 84" was read as a negative number.)
    const atLineStart = l < 0 || src[l] === "\n";
    let leftRaw = src.slice(l + 1, i).replace(/^\s*\d+[.)]\s+(?=[\d(-])/, " ");
    if (atLineStart) leftRaw = leftRaw.replace(/^\s*[-*+]\s+/, " ");
    const before = l >= 0 ? src[l] : "";
    if (/[\w.,]/.test(before) && leftRaw.length > 0 && !/^\s/.test(leftRaw)) continue;

    // scan right
    let r = i + 1;
    while (r < src.length && src[r] !== "\n" && ALLOWED.test(src[r])) r++;
    let rightRaw = src.slice(i + 1, r);
    const after = src.slice(r, r + 2);
    if (/^[A-Za-z_]/.test(after) && !/\s$/.test(rightRaw)) continue; // e.g. "= 5x"
    if (/^[,]\d/.test(after)) continue; // decimal comma, ambiguous
    rightRaw = rightRaw.replace(/\.\s*$/, ""); // sentence-ending period

    const left = evaluate(leftRaw);
    const right = evaluate(rightRaw);
    if (!left || !right || left.ops < 1) continue;

    checked++;
    if (!approximatelyEqual(left.value, right.value, rightRaw)) {
      const shown = Number.isInteger(left.value) ? String(left.value) : left.value.toPrecision(6);
      issues.push(
        `Arithmetic error: "${leftRaw.trim()} = ${rightRaw.trim()}" is wrong; the left side evaluates to ${shown}.`,
      );
    }
  }
  return { checked, issues };
}
