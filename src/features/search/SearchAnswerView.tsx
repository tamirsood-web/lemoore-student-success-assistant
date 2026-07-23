// Renders a WebsiteSearchResponse: the direct grounded answer first, then the numbered
// official sources, then related pages — or an honest clarification / unsupported / error
// state. Shared by the search overlay, the /search results page, and the assistant panel.

import type { WebsiteSearchResponse } from "@/types";
import { CitationCard } from "./CitationCard";

const PROTOTYPE_NOTE =
  "Prototype demo — answers are drawn only from official Lemoore College pages and link to the real source.";

/** Render inline (n) citation markers as subtle superscript footnote references. */
function AnswerText({ text }: { readonly text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="text-[1.05rem] leading-relaxed text-lc-ink">
      {parts.map((part, i) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (match) {
          return (
            <sup key={i} style={{ fontSize: "0.7em", marginLeft: 1, color: "inherit" }}>
              ({match[1]})
            </sup>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export function SearchAnswerView({
  response,
  onSelectSuggestion,
}: {
  readonly response: WebsiteSearchResponse;
  readonly onSelectSuggestion?: (q: string) => void;
}) {
  if (response.kind === "error") {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {response.message}
      </div>
    );
  }

  if (response.kind === "clarification") {
    return (
      <div className="space-y-4">
        <p className="text-base text-lc-ink">{response.message}</p>
        <ul className="flex flex-wrap gap-2">
          {response.suggestedQuestions.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => onSelectSuggestion?.(q)}
                className="rounded-full border border-lc-line bg-white px-3 py-1.5 text-sm font-medium text-lc-blue hover:border-lc-blue hover:bg-lc-blue-light"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-lc-slate">{PROTOTYPE_NOTE}</p>
      </div>
    );
  }

  if (response.kind === "unsupported") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-lc-line bg-lc-wash p-4">
          <p className="text-sm font-semibold tracking-wide text-lc-slate">
            No verified answer
          </p>
          <p className="mt-1 text-base text-lc-ink">{response.message}</p>
        </div>
        {response.relatedResults.length > 0 ? (
          <div>
            <h3 className="text-sm font-bold tracking-wide" style={{ color: "var(--semantic-color-text-default)" }}>
              Related official pages
            </h3>
            <ol style={{ marginTop: 8, paddingLeft: 20, listStyleType: "decimal", display: "flex", flexDirection: "column", gap: 4 }}>
              {response.relatedResults.map((c) => (
                <CitationCard key={c.id} citation={c} />
              ))}
            </ol>
          </div>
        ) : null}
        <p className="text-xs text-lc-slate">{PROTOTYPE_NOTE}</p>
      </div>
    );
  }

  // answered
  return (
    <div className="space-y-6">
      <div>
        <AnswerText text={response.answer} />
      </div>

      <div>
        <h3 className="text-sm font-bold tracking-wide" style={{ color: "var(--semantic-color-text-default)" }}>
          Sources
        </h3>
        <ol style={{ marginTop: 8, paddingLeft: 20, listStyleType: "decimal", display: "flex", flexDirection: "column", gap: 4 }}>
          {response.citations.map((c) => (
            <CitationCard key={c.id} citation={c} />
          ))}
        </ol>
      </div>

      {response.relatedResults.length > 0 ? (
        <div>
          <h3 className="text-sm font-bold tracking-wide" style={{ color: "var(--semantic-color-text-default)" }}>
            Related official pages
          </h3>
          <ol style={{ marginTop: 8, paddingLeft: 20, listStyleType: "decimal", display: "flex", flexDirection: "column", gap: 4 }}>
            {response.relatedResults.map((c) => (
              <CitationCard key={c.id} citation={c} />
            ))}
          </ol>
        </div>
      ) : null}

      <p className="text-xs text-lc-slate">{PROTOTYPE_NOTE}</p>
    </div>
  );
}
