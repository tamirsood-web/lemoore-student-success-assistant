import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The Nova library must keep AWS-SDK imports confined to `bedrockNovaClient.ts`, so `npm test`
// (and any client-reachable import of the barrel) never loads the Bedrock runtime SDK and no
// test can accidentally perform a real AWS call.
describe("nova-sonic AWS/SDK boundary", () => {
  const dir = dirname(fileURLToPath(import.meta.url));

  it("only bedrockNovaClient.ts imports @aws-sdk; nothing else in the library does", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    const offenders: string[] = [];
    for (const file of files) {
      if (file === "bedrockNovaClient.ts") continue;
      const src = readFileSync(join(dir, file), "utf8");
      if (/@aws-sdk|aws-sdk/.test(src)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("the barrel does not re-export the SDK-backed client", () => {
    const barrel = readFileSync(join(dir, "index.ts"), "utf8");
    // A comment may mention the file; what matters is that it is never re-exported.
    expect(barrel).not.toMatch(/from\s+["']\.\/bedrockNovaClient["']/);
  });

  it("no nova-sonic test file IMPORTS the SDK-backed client (no real AWS in tests)", () => {
    const tests = readdirSync(dir).filter((f) => f.endsWith(".test.ts"));
    const offenders: string[] = [];
    for (const file of tests) {
      const src = readFileSync(join(dir, file), "utf8");
      // Match an actual import statement, not incidental mentions in assertions.
      if (/import[^;]*from\s+["'][^"']*(bedrockNovaClient|client-bedrock-runtime)["']/.test(src)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
