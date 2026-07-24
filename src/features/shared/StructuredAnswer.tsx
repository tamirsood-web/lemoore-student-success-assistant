// StructuredAnswer — renders formatted answer text as semantic HTML.
//
// Converts the answer generator's structured text output (with \n\n paragraph
// breaks, • bullet lists, and N. numbered lists) into proper HTML elements
// (<p>, <ul><li>, <ol><li>) instead of rendering everything as flat text.
//
// Handles inline citation markers [N] → superscript (N).

import type { ReactNode } from "react";

/** Render an inline citation marker as a subtle superscript. */
function InlineCitation({ num }: { readonly num: string }) {
  return (
    <sup style={{ fontSize: "0.7em", marginLeft: 1, color: "inherit" }}>
      ({num})
    </sup>
  );
}

/** Strip trailing citation marker from text. */
function stripCitation(text: string): { text: string; citation: string | null } {
  const match = /\s*\[(\d+)\]\s*$/.exec(text);
  if (match) {
    return { text: text.slice(0, match.index).trim(), citation: match[1]! };
  }
  return { text, citation: null };
}

/** Render text that may contain inline [N] citations. */
function TextWithCitations({ text }: { readonly text: string }): ReactNode {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (match) {
          return <InlineCitation key={i} num={match[1]!} />;
        }
        return part ? <span key={i}>{part}</span> : null;
      })}
    </>
  );
}

export interface StructuredAnswerProps {
  /** The raw answer text with \n\n, • bullets, N. numbered items, and [N] citations. */
  readonly text: string;
  /** Optional CSS class for the wrapper. */
  readonly className?: string;
}

/**
 * Renders structured answer text as semantic HTML elements.
 *
 * - Double newlines (\n\n) → separate blocks
 * - Lines starting with "• " → <ul><li>
 * - Lines starting with "N. " → <ol><li>
 * - Other text → <p>
 * - [N] markers → superscript citations
 */
export function StructuredAnswer({ text, className }: StructuredAnswerProps) {
  const blocks = text.split(/\n\n/).filter((b) => b.trim().length > 0);

  return (
    <div className={className ?? "space-y-3"}>
      {blocks.map((block, blockIdx) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);

        // Bullet list: all lines start with •
        const isBulletList = lines.length > 0 && lines.every((l) => l.trim().startsWith("•"));
        if (isBulletList) {
          return (
            <ul key={blockIdx} className="list-disc pl-5 space-y-1">
              {lines.map((line, li) => {
                const content = line.trim().replace(/^•\s*/, "");
                const { text: itemText, citation } = stripCitation(content);
                return (
                  <li key={li}>
                    <TextWithCitations text={itemText} />
                    {citation ? <InlineCitation num={citation} /> : null}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Numbered list: all lines start with N.
        const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l.trim()));
        if (isNumberedList) {
          return (
            <ol key={blockIdx} className="list-decimal pl-5 space-y-1">
              {lines.map((line, li) => {
                const content = line.trim().replace(/^\d+\.\s*/, "");
                const { text: itemText, citation } = stripCitation(content);
                return (
                  <li key={li}>
                    <TextWithCitations text={itemText} />
                    {citation ? <InlineCitation num={citation} /> : null}
                  </li>
                );
              })}
            </ol>
          );
        }

        // Regular paragraph.
        const fullText = lines.join(" ");
        return (
          <p key={blockIdx}>
            <TextWithCitations text={fullText} />
          </p>
        );
      })}
    </div>
  );
}
