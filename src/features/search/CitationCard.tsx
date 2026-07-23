// A single official-source citation rendered as a compact list item: title, department,
// excerpt, and a production Source Link. No card styling — sits directly on the message
// surface. Uses Design System semantic tokens for colors and typography.

import type { OfficialSourceCitation } from "@/types";

export function CitationCard({
  citation,
}: {
  readonly citation: OfficialSourceCitation;
}) {
  return (
    <li style={{ marginBottom: "var(--primitive-space-8)" }}>
      <p style={{ fontWeight: 600, lineHeight: 1.4, color: "var(--semantic-color-text-default)" }}>
        {citation.title}
      </p>
      {citation.department ? (
        <p style={{ marginTop: 2, fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--semantic-color-text-muted)" }}>
          {citation.department}
        </p>
      ) : null}
      <p style={{ marginTop: 4, fontSize: 14, lineHeight: 1.5, color: "var(--semantic-color-text-muted)" }}>
        &ldquo;{citation.excerpt}&rdquo;
      </p>
      {citation.url ? (
        <div style={{ marginTop: 6 }}>
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
          >
            Source link
          </a>
        </div>
      ) : (
        <p style={{ marginTop: 6, fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--semantic-color-text-muted)" }}>
          Official source document
        </p>
      )}
    </li>
  );
}
