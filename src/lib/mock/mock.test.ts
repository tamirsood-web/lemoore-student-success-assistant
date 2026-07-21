import {
  sources,
  courseDates,
  departments,
  DEPARTMENT_IDS,
  isDepartmentId,
  sourceTitles,
  getSourceById,
  MOCK_DATA_DISCLAIMER,
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
