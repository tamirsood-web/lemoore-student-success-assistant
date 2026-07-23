import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Guard: the ingestion LIBRARY must be free of AWS SDK / network imports so `npm test` never
// touches AWS or the network. All AWS I/O lives in the `sources:*` CLI scripts (dynamic import
// only on explicit, confirmed execution).
describe("ingestion library AWS/network boundary", () => {
  const dir = dirname(fileURLToPath(import.meta.url));

  it("no source module imports the AWS SDK or performs fetch()", () => {
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(join(dir, file), "utf8");
      if (/@aws-sdk|aws-sdk/.test(src)) offenders.push(`${file}: imports aws-sdk`);
      if (/\bfetch\s*\(/.test(src)) offenders.push(`${file}: calls fetch()`);
    }
    expect(offenders).toEqual([]);
  });
});
