/** The models write LaTeX with \( \) and \[ \]; remark-math expects $ and $$. */
export function normaliseMathDelimiters(md: string): string {
  return md
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, body: string) => `\n$$\n${body.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, body: string) => `$${body.trim()}$`);
}
