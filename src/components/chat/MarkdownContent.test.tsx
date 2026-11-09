import { render } from "@testing-library/react";
import { MarkdownContent } from "./MarkdownContent";
import { normaliseMathDelimiters } from "@/utils/math";

describe("MarkdownContent", () => {
  it("converts model LaTeX delimiters and renders math with KaTeX", () => {
    expect(normaliseMathDelimiters(String.raw`add \( \frac{3}{4} \) now`)).toBe(
      String.raw`add $\frac{3}{4}$ now`,
    );
    const { container } = render(
      <MarkdownContent>{String.raw`We add \( \frac{6}{8} + \frac{1}{8} \)`}</MarkdownContent>,
    );
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("never renders raw HTML from model output", () => {
    const { container } = render(
      <MarkdownContent>{'<img src=x onerror="alert(1)"> hello'}</MarkdownContent>,
    );
    expect(container.querySelector("img")).toBeNull();
  });
});
