import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// These guards operate on the repository's script + source files as text. They make NO AWS or
// network calls (they only read files), satisfying "automated tests make no live AWS calls".
const ROOT = process.cwd();

describe("verify:bedrock module resolution", () => {
  const src = readFileSync(join(ROOT, "scripts", "verify-bedrock.mts"), "utf8");

  it("no longer uses @/ import aliases (vite-node cannot resolve them from the script entry)", () => {
    const importLines = src.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l) && /\bfrom\b/.test(l));
    const aliased = importLines.filter((l) => /from\s+["']@\//.test(l));
    expect(aliased).toEqual([]);
  });

  it("imports the RAG modules by relative path like scripts/sources.mts", () => {
    expect(src).toContain('from "../src/lib/rag/bedrockConfig.ts"');
    expect(src).toContain('from "../src/lib/rag/bedrockProvider.ts"');
    expect(src).toContain('from "../src/lib/validation/index.ts"');
  });
});

describe("data-source id privacy", () => {
  it("the evaluation library never ACCESSES process.env (ids are injected, never sourced here)", () => {
    const lib = readFileSync(join(ROOT, "src", "lib", "ingestion", "evaluation.ts"), "utf8");
    // A mention in a comment is fine; an actual `process.env.` read is not.
    expect(lib).not.toMatch(/process\.env\./);
  });

  it("sources.mts redacts KB + data-source ids in every committed report it writes", () => {
    const src = readFileSync(join(ROOT, "scripts", "sources.mts"), "utf8");
    expect(src).toContain('knowledgeBaseId: "<redacted>"');
    expect(src).toContain('dataSourceFilter: scope === "combined"');
  });

  it("no src/ code READS the data-source id env vars (they enter only via server-only scripts)", () => {
    // The Next.js client bundle can reach code under src/. A data-source id could leak into a
    // bundle or a public response only if src/ code READ it from process.env. The ids are read
    // exclusively in scripts/sources.mts. (Naming a var in a server-only error string is not a
    // value leak, so we scan for the actual read pattern, not the bare name.) Test files are
    // excluded because they name the vars intentionally for these assertions.
    const reads = [
      "process.env." + "BEDROCK_DATA_SOURCE_ID",
      "process.env." + "BEDROCK_WEB_CRAWLER_DATA_SOURCE_ID",
    ];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const abs = join(dir, entry);
        if (statSync(abs).isDirectory()) {
          walk(abs);
        } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
          const text = readFileSync(abs, "utf8");
          if (reads.some((n) => text.includes(n))) offenders.push(abs);
        }
      }
    };
    walk(join(ROOT, "src"));
    expect(offenders).toEqual([]);
  });
});
