import {
  sources,
  courseDates,
  departments,
  DEPARTMENT_IDS,
  isDepartmentId,
  sourceTitles,
  getSourceById,
  MOCK_DATA_DISCLAIMER,
  comparisons,
  findComparison,
} from "./index";

const SOURCE_ID_PATTERN = /^src_[a-z0-9_]+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

describe("mock sources", () => {
  it("has at least one source", () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it("uses unique, stable, well-formed source ids", () => {
    const ids = sources.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(SOURCE_ID_PATTERN);
    }
  });

  it("has all required, non-empty fields on every source", () => {
    for (const source of sources) {
      expect(source.id.trim().length).toBeGreaterThan(0);
      expect(source.title.trim().length).toBeGreaterThan(0);
      expect(source.department.trim().length).toBeGreaterThan(0);
      expect(source.audience).toBe("public");
      expect(source.tags.length).toBeGreaterThan(0);
      for (const tag of source.tags) {
        expect(tag.trim().length).toBeGreaterThan(0);
      }
      expect(isValidIsoDate(source.lastReviewed)).toBe(true);
    }
  });

  it("never has empty citationable content", () => {
    for (const source of sources) {
      expect(source.content.trim().length).toBeGreaterThan(0);
    }
  });

  it("labels every source as demo content", () => {
    for (const source of sources) {
      expect(source.content).toContain(MOCK_DATA_DISCLAIMER);
    }
  });

  it("references only existing departments", () => {
    for (const source of sources) {
      expect(isDepartmentId(source.department)).toBe(true);
    }
  });

  it("resolves each source by id via the lookup map", () => {
    for (const source of sources) {
      expect(getSourceById(source.id)).toEqual(source);
    }
  });

  it("returns undefined for an unknown source id", () => {
    expect(getSourceById("src_does_not_exist")).toBeUndefined();
  });
});

describe("mock departments", () => {
  it("exposes a contact record for every department id", () => {
    for (const id of DEPARTMENT_IDS) {
      const contact = departments[id];
      expect(contact.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses only reserved, obviously-fictional contact details", () => {
    for (const id of DEPARTMENT_IDS) {
      const contact = departments[id];
      if (contact.email) {
        expect(contact.email.endsWith(".example")).toBe(true);
      }
      if (contact.url) {
        expect(contact.url).toContain(".example");
      }
      if (contact.phone) {
        // Reserved fictional numbers: invalid (000) area code + 555-01xx range.
        expect(contact.phone).toMatch(/^\(000\) 555-01\d{2}$/);
      }
    }
  });

  it("has every source department id present in the directory", () => {
    for (const source of sources) {
      expect(DEPARTMENT_IDS).toContain(source.department);
    }
  });
});

describe("mock course dates", () => {
  it("has at least one course-date record", () => {
    expect(courseDates.length).toBeGreaterThan(0);
  });

  it("has all required identifier and date fields", () => {
    for (const cd of courseDates) {
      expect(cd.term.trim().length).toBeGreaterThan(0);
      expect(cd.subject.trim().length).toBeGreaterThan(0);
      expect(cd.catalogNumber.trim().length).toBeGreaterThan(0);
      expect(cd.section.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses unambiguous ISO 8601 dates in chronological order", () => {
    for (const cd of courseDates) {
      expect(isValidIsoDate(cd.startDate)).toBe(true);
      expect(isValidIsoDate(cd.censusDate)).toBe(true);
      expect(isValidIsoDate(cd.dropDate)).toBe(true);
      expect(cd.startDate <= cd.censusDate).toBe(true);
      expect(cd.censusDate <= cd.dropDate).toBe(true);
    }
  });

  it("references a real source record by title", () => {
    for (const cd of courseDates) {
      expect(sourceTitles.has(cd.sourceTitle)).toBe(true);
    }
  });

  it("uniquely identifies each record by term+subject+catalog+section", () => {
    const keys = courseDates.map(
      (cd) => `${cd.term}|${cd.subject}|${cd.catalogNumber}|${cd.section}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("mock departments — new location fields", () => {
  it("every department has a building field", () => {
    for (const id of DEPARTMENT_IDS) {
      expect(departments[id].building).toBeDefined();
      expect(departments[id].building!.trim().length).toBeGreaterThan(0);
    }
  });

  it("every department has an hours field", () => {
    for (const id of DEPARTMENT_IDS) {
      expect(departments[id].hours).toBeDefined();
      expect(departments[id].hours!.trim().length).toBeGreaterThan(0);
    }
  });

  it("every department mapUrl points to the campus map", () => {
    for (const id of DEPARTMENT_IDS) {
      expect(departments[id].mapUrl).toBe("https://lemoorecollege.edu/map/");
    }
  });
});

describe("mock comparisons", () => {
  it("has at least one comparison record", () => {
    expect(comparisons.length).toBeGreaterThan(0);
  });

  it("every comparison references a real source id", () => {
    for (const record of comparisons) {
      expect(getSourceById(record.sourceId)).toBeDefined();
    }
  });

  it("every comparison has non-empty matchPhrases", () => {
    for (const record of comparisons) {
      expect(record.matchPhrases.length).toBeGreaterThan(0);
      for (const phrase of record.matchPhrases) {
        expect(phrase.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every comparison data block has topic, optionA, optionB, and keyDifferences", () => {
    for (const record of comparisons) {
      expect(record.data.topic.trim().length).toBeGreaterThan(0);
      expect(record.data.optionA.label.trim().length).toBeGreaterThan(0);
      expect(record.data.optionA.explanation.trim().length).toBeGreaterThan(0);
      expect(record.data.optionB.label.trim().length).toBeGreaterThan(0);
      expect(record.data.optionB.explanation.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(record.data.keyDifferences)).toBe(true);
    }
  });

  it("findComparison returns the correct record for a known phrase", () => {
    const result = findComparison("What's the difference between dropping and withdrawing?");
    expect(result).toBeDefined();
    expect(result?.data.topic).toBe("Dropping vs. Withdrawing");
  });

  it("findComparison returns undefined for an unknown topic", () => {
    expect(findComparison("compare semester and trimester systems")).toBeUndefined();
  });

  it("matchPhrases are all lowercase (consistent with query lowercasing)", () => {
    for (const record of comparisons) {
      for (const phrase of record.matchPhrases) {
        expect(phrase).toBe(phrase.toLowerCase());
      }
    }
  });
});
