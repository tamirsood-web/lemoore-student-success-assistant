// Final Markdown document assembly (pure; server/script-only).
//
// Wraps extractive content in a visible, human-readable source header so every stored document
// is traceable to its official origin (task: "Add a visible source header inside every
// generated Markdown document"). The header is plain text — no invented facts — and the body
// is the cleaned content exactly as extracted.

export type MarkdownDocumentInput = {
  readonly title: string;
  readonly sourceUrl: string;
  readonly department: string;
  readonly lastChecked: string;
  readonly canonicalUrl?: string;
  readonly topic?: string;
  readonly effectiveDate?: string;
  readonly historicalWarning?: string;
  readonly content: string;
};

/**
 * Build the full Markdown document: a title, a source header block, an optional historical
 * warning, then the cleaned body. Returns a trailing-newline-terminated string.
 */
export function buildMarkdownDocument(input: MarkdownDocumentInput): string {
  const header: string[] = [
    `# ${input.title.trim()}`,
    "",
    `Source URL: ${input.sourceUrl}`,
    `Department: ${input.department}`,
    `Last checked: ${input.lastChecked}`,
  ];
  if (input.canonicalUrl && input.canonicalUrl !== input.sourceUrl) {
    header.push(`Canonical URL: ${input.canonicalUrl}`);
  }
  if (input.topic) header.push(`Topic: ${input.topic}`);
  if (input.effectiveDate) header.push(`Effective date: ${input.effectiveDate}`);

  const parts = [header.join("\n")];
  if (input.historicalWarning) {
    parts.push(`> ⚠️ Historical/stale content notice: ${input.historicalWarning}`);
  }
  parts.push("---");
  parts.push(input.content.trim());

  return `${parts.join("\n\n")}\n`;
}
