/**
 * Minimal OpenAI-compatible chat-completions adapter.
 * Only uses POST {baseUrl}/chat/completions — the lowest common denominator
 * supported by vLLM, Ollama, LM Studio, LiteLLM, OpenRouter, etc.
 */

export type ContentPart =
  { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface CompletionRequest {
  model: string;
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ChatProvider {
  complete(req: CompletionRequest): Promise<string>;
}

export class ProviderError extends Error {
  readonly status?: number;
  readonly model?: string;
  constructor(message: string, status?: number, model?: string) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.model = model;
  }
}

export interface TokenUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  /** true when the provider did not report usage and it was estimated (chars / 4) */
  estimated: boolean;
}

export interface ProviderOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** Hard ceiling on max_tokens for any single call (token kill / cost control). */
  maxOutputTokens?: number;
  /** Abort every in-flight and future call once this signal fires (request deadline). */
  signal?: AbortSignal;
  /** Called after every completion with its token usage (for budgets and accounting). */
  onUsage?: (usage: TokenUsage) => void;
  fetchImpl?: typeof fetch;
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export function createOpenAICompatibleProvider(opts: ProviderOptions): ChatProvider {
  const fetchImpl = opts.fetchImpl ?? fetch;
  return {
    async complete(req) {
      if (opts.signal?.aborted) {
        throw new ProviderError(
          "Request deadline exceeded before calling the model",
          undefined,
          req.model,
        );
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? opts.timeoutMs ?? 60_000);
      const onOuterAbort = () => controller.abort();
      opts.signal?.addEventListener("abort", onOuterAbort, { once: true });
      const maxTokens = Math.min(
        req.maxTokens ?? 800,
        opts.maxOutputTokens ?? Number.POSITIVE_INFINITY,
      );
      let res: Response;
      try {
        res = await fetchImpl(`${opts.baseUrl}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: req.model,
            messages: req.messages,
            temperature: req.temperature ?? 0.4,
            max_tokens: maxTokens,
            stream: false,
          }),
        });
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        throw new ProviderError(
          aborted ? `Model ${req.model} timed out` : `Could not reach AI provider: ${String(err)}`,
          undefined,
          req.model,
        );
      } finally {
        clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onOuterAbort);
      }

      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        throw new ProviderError(
          `Provider returned ${res.status} for ${req.model}: ${detail}`,
          res.status,
          req.model,
        );
      }
      const json = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string | null } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      } | null;
      const content = json?.choices?.[0]?.message?.content;
      if (opts.onUsage) {
        const reported = json?.usage;
        const promptText = req.messages
          .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
          .join(" ");
        opts.onUsage({
          model: req.model,
          promptTokens: reported?.prompt_tokens ?? estimateTokens(promptText),
          completionTokens: reported?.completion_tokens ?? estimateTokens(content ?? ""),
          estimated: !reported,
        });
      }
      if (typeof content !== "string" || content.trim() === "") {
        throw new ProviderError(`Empty completion from ${req.model}`, res.status, req.model);
      }
      return content.trim();
    },
  };
}
