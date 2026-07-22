import type { AssistantResponse, DepartmentContact } from "@/types";
import { Card } from "@/components/ui";

/** Build a tel: href only for a plausibly-valid number (10–15 digits, not a 000 area code). */
function telHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.startsWith("000")) return null; // reserved fictional demo number
  return `tel:${digits}`;
}

function isSafeHttpUri(uri: string): boolean {
  return uri.startsWith("https://") || uri.startsWith("http://");
}

function resolveDetails(
  response: AssistantResponse,
): { department: string; contact?: DepartmentContact } | null {
  if (!response.escalationRecommended) return null;
  if (response.kind === "insufficient_evidence") {
    return {
      department: response.escalation.department,
      contact: response.escalation.contact,
    };
  }
  if (response.department) return { department: response.department };
  return null;
}

export interface EscalationCardProps {
  readonly response: AssistantResponse;
}

/** Shown only when the server recommends escalation. Transparent wording; no claim of contact. */
export function EscalationCard({ response }: EscalationCardProps) {
  const details = resolveDetails(response);
  if (!details) return null;

  const { department, contact } = details;
  const phone = contact?.phone ? telHref(contact.phone) : null;
  const url =
    contact?.url && isSafeHttpUri(contact.url) ? contact.url : undefined;

  return (
    <Card className="mt-3 border-l-4 border-l-accent bg-muted">
      <h3 className="text-sm font-semibold text-foreground">
        You may want to contact {department}
      </h3>
      {contact ? (
        <dl className="mt-2 flex flex-col gap-1 text-sm text-foreground">
          {contact.email ? (
            <div className="break-words">
              <span className="text-muted-foreground">Email: </span>
              <a
                href={`mailto:${contact.email}`}
                className="text-accent underline underline-offset-2"
              >
                {contact.email}
              </a>
            </div>
          ) : null}
          <div className="break-words">
            <span className="text-muted-foreground">Phone: </span>
            {contact.phone ? (
              phone ? (
                <a
                  href={phone}
                  className="text-accent underline underline-offset-2"
                >
                  {contact.phone}
                </a>
              ) : (
                <span>{contact.phone}</span>
              )
            ) : (
              <span className="text-muted-foreground">not available</span>
            )}
          </div>
          {url ? (
            <div className="break-words">
              <span className="text-muted-foreground">Website: </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
              >
                {url}
              </a>
            </div>
          ) : null}
          {contact.office ? (
            <p className="text-muted-foreground">{contact.office}</p>
          ) : null}
        </dl>
      ) : null}
    </Card>
  );
}
