// @vitest-environment node
import { runTutorPipeline, detectLanguage } from "./orchestrator.ts";
import { loadAiConfig } from "./config.ts";
import { parseValidation, extractJsonObject } from "./validator.ts";
import { heuristicClassify, routeDraftModel } from "./modelRouter.ts";
import { TutorRequestSchema, type TutorRequestInput } from "./schemas.ts";
import type { ChatProvider, CompletionRequest } from "./providers/openaiCompatible.ts";
import { ba9lewa } from "./prompts/ba9lewa.ts";

const models = loadAiConfig(() => undefined).models;

/** Scripted provider: answers by model id, in order. Records every call. */
function scripted(script: Record<string, string[]>) {
  const calls: CompletionRequest[] = [];
  const provider: ChatProvider = {
    async complete(req) {
      calls.push(req);
      const queue = script[req.model];
      if (!queue || queue.length === 0) throw new Error(`no scripted reply for ${req.model}`);
      return queue.shift()!;
    },
  };
  return { provider, calls };
}

const req = (over: Partial<TutorRequestInput> = {}) =>
  TutorRequestSchema.parse({
    action: "tutor",
    mentorId: "ba9lewa",
    messages: [{ role: "user", content: "What is 7 times 8?" }],
    ...over,
  });

const ACCEPT = '{"decision":"accept","issues":[],"confidence":0.9}';
const REJECT = '{"decision":"reject","issues":["Does not answer the question"],"confidence":0.8}';

describe("model routing", () => {
  it("routes by mentor default and detects code/writing", () => {
    expect(heuristicClassify("solve 2x=4", "ba9lewa")).toBe("math");
    expect(heuristicClassify("why is the sky blue", "ibnbatbuta")).toBe("science");
    expect(heuristicClassify("write a python function for primes", "ba9lewa")).toBe("code");
    expect(heuristicClassify("Help me write an essay about Camus", "falfoul")).toBe("writing");
    expect(routeDraftModel("math", models)).toBe("qwen2.5-3b");
    expect(routeDraftModel("language", models)).toBe("mistral-7b");
    expect(routeDraftModel("code", models)).toBe("qwen2.5-coder-7b");
  });
});

describe("validator parsing", () => {
  it("extracts JSON from fenced/prose output", () => {
    expect(extractJsonObject('Sure! ```json\n{"a": {"b": "}"}}\n```')).toEqual({ a: { b: "}" } });
    expect(
      parseValidation('Verdict: {"decision":"ACCEPT","issues":"none","confidence":85}'),
    ).toEqual({
      decision: "accept",
      issues: ["none"],
      confidence: 0.85,
    });
    expect(parseValidation("looks good to me")).toBeNull();
  });
});

describe("runTutorPipeline", () => {
  it("delivers a validated draft and injects the mentor persona", async () => {
    const { provider, calls } = scripted({
      "qwen2.5-3b": ["Step 1: 7 × 8 = 56. The answer is 56."],
      "llama3.1-8b": [ACCEPT],
    });
    const res = await runTutorPipeline(req(), { provider, models, enableClassifier: false });
    expect(res.status).toBe("validated");
    expect(res.content).toContain("56");
    expect(res.meta.attempts).toBe(1);
    expect(res.meta.validation[0].arithmeticChecked).toBe(1);
    const system = calls[0].messages[0].content as string;
    expect(system).toContain(ba9lewa.name);
    expect(system).toContain("numbered steps");
  });

  it("rejects a wrong calculation deterministically even if the validator accepts, then revises", async () => {
    const { provider, calls } = scripted({
      "qwen2.5-3b": ["7 × 8 = 54", "7 × 8 = 56"],
      "llama3.1-8b": [ACCEPT, ACCEPT],
    });
    const res = await runTutorPipeline(req(), { provider, models, enableClassifier: false });
    expect(res.status).toBe("validated");
    expect(res.content).toBe("7 × 8 = 56");
    expect(res.meta.attempts).toBe(2);
    expect(res.meta.validation[0].decision).toBe("reject");
    const revisionPrompt = calls[2].messages.at(-1)!.content as string;
    expect(revisionPrompt).toContain("Arithmetic error");
  });

  it("returns the safe fallback (never the draft) when revision also fails", async () => {
    const { provider } = scripted({
      "qwen2.5-3b": ["bad draft one", "bad draft two"],
      "llama3.1-8b": [REJECT, REJECT],
    });
    const res = await runTutorPipeline(req(), { provider, models, enableClassifier: false });
    expect(res.status).toBe("fallback");
    expect(res.content).toBe(ba9lewa.fallbackMessage.en);
    expect(res.content).not.toContain("bad draft");
  });

  it("fails closed when the validator output is unparseable", async () => {
    const { provider } = scripted({
      "qwen2.5-3b": ["draft", "draft 2"],
      "llama3.1-8b": ["ok", "ok", "fine", "fine"],
    });
    const res = await runTutorPipeline(req(), { provider, models, enableClassifier: false });
    expect(res.status).toBe("fallback");
    expect(res.meta.validation.every((v) => v.validatorParseFailed)).toBe(true);
  });

  it("produces a structured, validated exercise", async () => {
    const exercise = {
      question: "Compute 15% of 80.",
      hints: ["15% = 0.15"],
      answer: "12",
      answerType: "numeric",
      explanation: "0.15 * 80 = 12",
    };
    const { provider } = scripted({
      "qwen2.5-3b": ["Here you go:\n" + JSON.stringify(exercise)],
      "llama3.1-8b": [ACCEPT],
    });
    const res = await runTutorPipeline(req({ intent: "exercise" }), {
      provider,
      models,
      enableClassifier: false,
    });
    expect(res.status).toBe("validated");
    expect(res.exercise?.answer).toBe("12");
    expect(res.meta.validation[0].arithmeticChecked).toBe(1);
  });

  it("uses the classifier model when enabled and routes language to the writing model", async () => {
    const { provider, calls } = scripted({
      "llama3.2-3b": ["writing"],
      "mistral-7b": ["Voici une meilleure formulation…"],
      "llama3.1-8b": [ACCEPT],
    });
    const res = await runTutorPipeline(
      req({ mentorId: "falfoul", messages: [{ role: "user", content: "Corrige ma lettre" }] }),
      { provider, models, enableClassifier: true },
    );
    expect(res.meta.task).toBe("writing");
    expect(res.meta.classifiedBy).toBe("model");
    expect(calls.map((c) => c.model)).toEqual(["llama3.2-3b", "mistral-7b", "llama3.1-8b"]);
  });

  it("detects the fallback language", () => {
    expect(detectLanguage("ما هو العدد الأولي؟")).toBe("ar");
    expect(detectLanguage("Pourquoi le ciel est bleu ?")).toBe("fr");
    expect(detectLanguage("Why is the sky blue?")).toBe("en");
  });
});

describe("stripMetaPreamble (regression: real qwen2.5-3b output)", () => {
  it("removes correction meta-commentary but keeps the lesson", async () => {
    const { stripMetaPreamble } = await import("./orchestrator.ts");
    const real =
      "Certainly! Let's correct the answer to match the student's request. Here is the revised response:\n\n---\n\nSure, let's solve the problem step by step.";
    expect(stripMetaPreamble(real)).toBe("Sure, let's solve the problem step by step.");
    expect(stripMetaPreamble("Sure, let's solve it.\nStep 1")).toBe(
      "Sure, let's solve it.\nStep 1",
    );
  });
});

describe("splitFollowUps", () => {
  it("extracts follow-up questions into structured suggestions", async () => {
    const { splitFollowUps } = await import("./orchestrator.ts");
    const r = splitFollowUps("The sky looks blue because…\n\nFOLLOW-UPS:\n- Why are sunsets red?\n- What is a wavelength?\n- Is the sky blue on Mars?");
    expect(r.content).toBe("The sky looks blue because…");
    expect(r.followUps).toEqual(["Why are sunsets red?", "What is a wavelength?", "Is the sky blue on Mars?"]);
    expect(splitFollowUps("Plain answer").followUps).toEqual([]);
    expect(splitFollowUps("Answer\n**Follow-ups:**\n1. One?\n2. Two?").followUps).toEqual(["One?", "Two?"]);
  });
});
