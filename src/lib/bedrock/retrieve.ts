// Local mock retrieval service.
//
// Implements the RetrievalService seam using the local mock knowledge dataset.
// In the AWS phase this module is replaced by Bedrock Knowledge Bases; the route
// handler depends only on the RetrievalResult type, not this implementation.

import type { RetrievalResult, RetrievedSnippet } from "@/types";
import { sources, courseDates } from "@/lib/mock";

const COURSE_DATE_KEYWORDS = [
  "census",
  "drop",
  "withdrawal",
  "withdraw",
  "last day",
  "deadline",
  "course date",
  "class date",
];

const MAX_SNIPPETS = 3;

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function scoreSource(
  queryTokens: Set<string>,
  source: { readonly tags: readonly string[]; readonly content: string },
): number {
  const haystack = tokenize(source.tags.join(" ") + " " + source.content);
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.has(token)) score++;
  }
  return score;
}

function isCourseDateQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return COURSE_DATE_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractCourseIdentifiers(query: string): {
  term?: string;
  subject?: string;
  catalogNumber?: string;
  section?: string;
} {
  const upper = query.toUpperCase();
  const courseMatch = upper.match(
    /\b([A-Z]{2,6})\s*(\d{2,4})(?:[- ](\d{2,3}))?\b/,
  );
  const termMatch = query.match(
    /\b(Fall|Spring|Summer|Winter)\s+(20\d{2})\b/i,
  );
  return {
    subject: courseMatch?.[1],
    catalogNumber: courseMatch?.[2],
    section: courseMatch?.[3],
    term: termMatch ? `${termMatch[1]} ${termMatch[2]}` : undefined,
  };
}

export async function retrieve(query: string): Promise<RetrievalResult> {
  // --- course-date path ---
  if (isCourseDateQuery(query)) {
    const ids = extractCourseIdentifiers(query);

    if (!ids.subject && !ids.catalogNumber) {
      return { intent: "course-date", snippets: [], needsIdentifiers: true };
    }

    const matches = courseDates.filter((cd) => {
      if (ids.term && cd.term.toLowerCase() !== ids.term.toLowerCase())
        return false;
      if (
        ids.subject &&
        cd.subject.toLowerCase() !== ids.subject.toLowerCase()
      )
        return false;
      if (ids.catalogNumber && cd.catalogNumber !== ids.catalogNumber)
        return false;
      if (ids.section && cd.section !== ids.section) return false;
      return true;
    });

    if (matches.length === 0) {
      return { intent: "course-date", snippets: [], needsIdentifiers: false };
    }

    const snippets: RetrievedSnippet[] = matches
      .slice(0, MAX_SNIPPETS)
      .map((cd) => ({
        source: cd,
        title: cd.sourceTitle,
        excerpt:
          `${cd.subject} ${cd.catalogNumber} Section ${cd.section} — ${cd.term}: ` +
          `Start ${cd.startDate} · Census ${cd.censusDate} · Drop ${cd.dropDate}.`,
      }));

    return { intent: "course-date", snippets };
  }

  // --- general source path ---
  const queryTokens = tokenize(query);

  const scored = sources
    .map((source) => ({ source, score: scoreSource(queryTokens, source) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SNIPPETS);

  const snippets: RetrievedSnippet[] = scored.map(({ source }) => ({
    source,
    title: source.title,
    uri: source.uri,
    excerpt: source.content,
  }));

  return { intent: "source", snippets };
}
