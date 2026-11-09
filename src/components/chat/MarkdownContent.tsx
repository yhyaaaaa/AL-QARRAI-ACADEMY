import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { normaliseMathDelimiters } from "@/utils/math";

/** Safe Markdown + math rendering (raw HTML is never rendered — react-markdown escapes it). */
export function MarkdownContent({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-qarrai text-[15px]", className)} dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore", trust: false }]]}
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {c}
            </a>
          ),
        }}
      >
        {normaliseMathDelimiters(children)}
      </ReactMarkdown>
    </div>
  );
}
