import { AlertTriangle, Mail, Phone, Globe } from "lucide-react";
import type { EscalationGuidance } from "@/types";

type Props = { escalation: EscalationGuidance };

export function EscalationCard({ escalation }: Props) {
  const { department, contact, message } = escalation;
  return (
    <aside
      aria-label="Escalation — contact a department"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Contact {department}</p>
          <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">{message}</p>
        </div>
      </div>
      {(contact.email || contact.phone || contact.url) && (
        <ul aria-label={`Contact details for ${department}`} className="mt-3 flex flex-col gap-1.5 pl-8">
          {contact.phone && (
            <li className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${contact.phone.replace(/\D/g, "")}`} className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
                {contact.phone}
              </a>
            </li>
          )}
          {contact.email && (
            <li className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <a href={`mailto:${contact.email}`} className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
                {contact.email}
              </a>
            </li>
          )}
          {contact.url && (
            <li className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <Globe aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <a href={contact.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
                Visit office page<span className="sr-only"> (opens in new tab)</span>
              </a>
            </li>
          )}
        </ul>
      )}
      {contact.office && (
        <p className="mt-2 pl-8 text-xs text-amber-700/80 dark:text-amber-400/80">{contact.office}</p>
      )}
    </aside>
  );
}
