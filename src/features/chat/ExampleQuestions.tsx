import { Button } from "@/components/ui";

export interface ExampleQuestionsProps {
  readonly questions: readonly string[];
  readonly onSelect: (question: string) => void;
  readonly disabled: boolean;
  /** Accessible label for the group (e.g., "Example questions" or "Suggested follow-ups"). */
  readonly label: string;
}

/** Renders a set of question chips as real buttons that submit through the chat flow. */
export function ExampleQuestions({
  questions,
  onSelect,
  disabled,
  label,
}: ExampleQuestionsProps) {
  if (questions.length === 0) return null;
  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ul className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <li key={question}>
            <Button
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onSelect(question)}
            >
              {question}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
