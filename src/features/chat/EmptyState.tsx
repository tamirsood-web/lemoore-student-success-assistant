import { Card } from "@/components/ui";
import { ExampleQuestions } from "./ExampleQuestions";

/** Example questions that the local mock dataset can actually answer (grounded). */
const EXAMPLE_QUESTIONS: readonly string[] = [
  "What are the admissions office hours?",
  "How can I contact financial aid?",
  "How do I request or view my transcript?",
  "Where can I find the academic calendar?",
  "What services are available to adult learners?",
  "How do I contact counseling?",
];

export interface EmptyStateProps {
  readonly onSelectExample: (question: string) => void;
  readonly disabled: boolean;
}

/** Intro + trust framing shown before any conversation, with grounded example chips. */
export function EmptyState({ onSelectExample, disabled }: EmptyStateProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-base font-semibold text-foreground">
          Ask a question about Lemoore College
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>Answers come from a small set of sample, local sources.</li>
          <li>
            {
              "When I can't verify something, I'll suggest an official department to contact."
            }
          </li>
          <li>
            {
              "Please don't enter personal details like ID numbers, SSNs, or passwords."
            }
          </li>
        </ul>
      </Card>
      <ExampleQuestions
        questions={EXAMPLE_QUESTIONS}
        onSelect={onSelectExample}
        disabled={disabled}
        label="Example questions"
      />
    </div>
  );
}
