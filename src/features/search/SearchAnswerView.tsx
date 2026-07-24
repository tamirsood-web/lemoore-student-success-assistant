// Renders a WebsiteSearchResponse: the direct grounded answer first, then the numbered
// official sources, then related pages — or an honest clarification / unsupported / error
// state. Shared by the search overlay, the /search results page, and the assistant panel.

import type { WebsiteSearchResponse } from "@/types";
import { CONTACT, FALLBACK_MESSAGES } from "@/lib/fallback-messages";
import { CitationCard } from "./CitationCard";
import { StructuredAnswer } from "@/features/shared/StructuredAnswer";

const PROTOTYPE_NOTE =
  "Prototype demo — answers are drawn only from official Lemoore College pages and link to the real source.";

/** Body text class for all assistant response text in the search feature. */
const BODY_TEXT = "chat-body-text chat-body-text--answer text-lc-ink";

/** Render a structured answer with proper semantic HTML. */
function AnswerText({ text }: { readonly text: string }) {
  return <StructuredAnswer text={text} className={`${BODY_TEXT} space-y-3`} />;
}

/** Shared contact block rendered inside fallback messages. */
function ContactBlock() {
  const labelColor = "var(--semantic-color-text-muted)";
  return (
    <dl className="mt-3 flex flex-col gap-1 text-sm">
      <div>
        <span style={{ color: labelColor }}>Email: </span>
        <a
          href={`mailto:${CONTACT.email}`}
          className="text-lc-blue underline underline-offset-2"
        >
          {CONTACT.email}
        </a>
      </div>
      <div>
        <span style={{ color: labelColor }}>Lemoore Student Services: </span>
        <a
          href={`tel:${CONTACT.phoneTel}`}
          className="text-lc-blue underline underline-offset-2"
        >
          {CONTACT.phone}
        </a>
      </div>
      <div>
        <span style={{ color: labelColor }}>Hours: </span>
        <span>{CONTACT.hours}</span>
      </div>
      <div>
        <span style={{ color: labelColor }}>Location: </span>
        <span>{CONTACT.location}</span>
      </div>
    </dl>
  );
}

export function SearchAnswerView({
  response,
}: {
  readonly response: WebsiteSearchResponse;
  /** @deprecated Suggestions are now rendered by the parent component. */
  readonly onSelectSuggestion?: (q: string) => void;
}) {
  if (response.kind === "error") {
    const { heading, guidance } = FALLBACK_MESSAGES.technicalError;
    return (
      <div className="space-y-4">
        <p className={BODY_TEXT}>{heading}</p>
        <p className={BODY_TEXT}>{guidance}</p>
        <ContactBlock />
      </div>
    );
  }

  if (response.kind === "clarification") {
    const { heading, guidance } = FALLBACK_MESSAGES.needsMoreInformation;
    return (
      <div className="space-y-4">
        <p className={BODY_TEXT}>{heading}</p>
        <p className={BODY_TEXT}>{guidance}</p>
        <ContactBlock />
        <p className="text-xs text-lc-slate">{PROTOTYPE_NOTE}</p>
      </div>
    );
  }

  if (response.kind === "unsupported") {
    // Choose scenario based on whether there are any related results.
    const scenario = response.relatedResults.length > 0 ? "noReliableAnswer" : "noSearchResults";
    const { heading, guidance } = FALLBACK_MESSAGES[scenario];
    return (
      <div className="space-y-4">
        <p className={BODY_TEXT}>{heading}</p>
        <p className={BODY_TEXT}>{guidance}</p>
        <ContactBlock />
        {response.relatedResults.length > 0 ? (
          <div>
            <h3 className="text-sm font-bold tracking-wide" style={{ color: "var(--semantic-color-text-default)" }}>
              Related official pages
            </h3>
            <ol style={{ marginTop: 8, paddingLeft: 20, listStyleType: "decimal", color: "var(--semantic-color-text-default)" }}>
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

  if (response.kind === "conversational") {
    return (
      <div className="space-y-4">
        <p className={BODY_TEXT}>{response.message}</p>
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
        <ol style={{ marginTop: 8, paddingLeft: 20, listStyleType: "decimal", color: "var(--semantic-color-text-default)" }}>
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
          <ol style={{ marginTop: 8, paddingLeft: 20, listStyleType: "decimal", color: "var(--semantic-color-text-default)" }}>
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
