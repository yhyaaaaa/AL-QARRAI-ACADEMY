import { buildValidatorMessages } from "./validator.ts";
import { getMentorPrompt } from "./prompts/index.ts";

describe("validator prompt", () => {
  const base = {
    mentor: getMentorPrompt("ba9lewa"),
    studentRequest: "Create a quiz about fractions",
    draft: "Q1: 1/2 + 1/4 = ? Answer: 3/4",
  };

  it("applies the mentor's chat method to chat answers", () => {
    const system = buildValidatorMessages(base, "ok")[0].content;
    expect(system).toContain("teaching method");
    expect(system).not.toContain("structured learning activity");
  });

  it("does not demand chat-style structure from short activity explanations, but keeps every safety rule", () => {
    const system = buildValidatorMessages({ ...base, format: "activity" }, "ok")[0].content;
    expect(system).toContain("structured learning activity");
    expect(system).toContain("do NOT require numbered steps");
    expect(system).not.toContain("teaching method");
    expect(system).toContain("REJECT if there is any factual or calculation error");
    expect(system).toContain("age-appropriate");
  });
});
