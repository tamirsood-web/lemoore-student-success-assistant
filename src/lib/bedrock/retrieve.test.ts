import { retrieve, COURSE_DATE_SOURCE_ID } from "./retrieve";

describe("retrieve — source intent", () => {
  it("returns matching snippets for a supported question", async () => {
    const result = await retrieve("What are the admissions office hours?");
    expect(result.intent).toBe("source");
    expect(result.snippets.length).toBeGreaterThan(0);
    const first = result.snippets[0];
    expect(first).toBeDefined();
    if (first && "id" in first.source) {
      expect(first.source.id).toBe("src_admissions_office_hours");
    }
  });

  it("returns no snippets when nothing matches", async () => {
    const result = await retrieve("Tell me about quantum tea dragons please");
    expect(result.intent).toBe("source");
    expect(result.snippets).toHaveLength(0);
  });

  it("uses snippet excerpts drawn verbatim from source content", async () => {
    const result = await retrieve("How can I contact financial aid?");
    for (const snippet of result.snippets) {
      expect(snippet.excerpt.length).toBeGreaterThan(0);
    }
  });
});

describe("retrieve — course-date intent", () => {
  it("asks for identifiers when the question lacks course/section/term", async () => {
    const result = await retrieve("What is my drop date?");
    expect(result.intent).toBe("course-date");
    expect(result.needsIdentifiers).toBe(true);
    expect(result.snippets).toHaveLength(0);
  });

  it("returns a single snippet on an exact identifier match", async () => {
    const result = await retrieve(
      "What is the census date for MATH 101 section 01 in Fall 2025?",
    );
    expect(result.intent).toBe("course-date");
    expect(result.needsIdentifiers).toBe(false);
    expect(result.snippets).toHaveLength(1);
    const snippet = result.snippets[0];
    expect(snippet).toBeDefined();
    if (snippet) {
      expect("id" in snippet.source ? snippet.source.id : undefined).toBe(
        COURSE_DATE_SOURCE_ID,
      );
      expect(snippet.excerpt).toContain("2025-09-02");
    }
  });

  it("asks for more identifiers when multiple sections/terms match", async () => {
    const result = await retrieve("What is the drop date for MATH 101?");
    expect(result.intent).toBe("course-date");
    expect(result.needsIdentifiers).toBe(true);
    expect(result.snippets).toHaveLength(0);
  });

  it("returns no snippet when identifiers match no course", async () => {
    const result = await retrieve(
      "What is the census date for MATH 999 section 05 in Fall 2025?",
    );
    expect(result.intent).toBe("course-date");
    expect(result.needsIdentifiers).toBe(false);
    expect(result.snippets).toHaveLength(0);
  });

  it("is deterministic for the same query", async () => {
    const a = await retrieve("What are the admissions office hours?");
    const b = await retrieve("What are the admissions office hours?");
    expect(a).toEqual(b);
  });
});
