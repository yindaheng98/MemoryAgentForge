export function quoteBlock(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}
