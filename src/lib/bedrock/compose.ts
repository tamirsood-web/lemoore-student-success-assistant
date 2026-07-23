// Mock answer composer — builds a student-friendly answer from retrieved snippets only.
// Never invents facts. In the AWS phase this is replaced by Bedrock generate.

import type { RetrievalResult } from "@/types";

export function composeAnswer(result: RetrievalResult): string | null {
  if (result.snippets.length === 0) return null;

  if (result.intent === "course-date") {
    const lines = result.snippets.map((s) => s.excerpt).join("\n");
    return (
      `Here are the course-specific dates I found:\n\n${lines}\n\n` +
      `Please confirm these with Admissions & Records to ensure they are still current.`
    );
  }

  const primary = result.snippets[0]!;
  const secondary = result.snippets[1];
  let answer = primary.excerpt;
  if (secondary) {
    answer += `\n\nAdditionally: ${secondary.excerpt}`;
  }
  return answer;
}

export function suggestFollowUps(result: RetrievalResult): string[] {
  if (result.snippets.length === 0) {
    return [
      "What offices can I contact for general questions?",
      "How do I reach Student Services?",
    ];
  }

  if (result.intent === "course-date") {
    return [
      "What happens if I miss the census date?",
      "How do I officially withdraw from a class?",
      "Where can I find the academic calendar?",
    ];
  }

  const tags = result.snippets
    .flatMap((s) =>
      "tags" in s.source
        ? (s.source as { tags: readonly string[] }).tags
        : [],
    )
    .slice(0, 6);

  const suggestions: string[] = [];
  if (tags.some((t) => ["admissions", "enrollment", "records"].includes(t))) {
    suggestions.push("How do I enroll in classes?");
    suggestions.push("How do I request an official transcript?");
  }
  if (tags.some((t) => ["financial aid", "fafsa", "grants"].includes(t))) {
    suggestions.push("When does financial aid disburse?");
    suggestions.push("What documents do I need for financial aid?");
  }
  if (tags.some((t) => ["counseling", "advising", "appointment"].includes(t))) {
    suggestions.push("How do I make a counseling appointment?");
  }
  if (tags.some((t) => ["transcript", "degree", "graduation"].includes(t))) {
    suggestions.push("How do I check my degree posting status?");
  }
  if (suggestions.length === 0) {
    suggestions.push("What services does the college offer?");
    suggestions.push("How do I contact the relevant office?");
  }
  return suggestions.slice(0, 3);
}
