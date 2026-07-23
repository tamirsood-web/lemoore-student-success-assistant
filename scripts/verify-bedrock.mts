// Live Bedrock verification — SERVER-ONLY, MANUALLY RUN. Performs REAL, PAID AWS requests.
//
//   npm run verify:bedrock
//
// It uses the ACTUAL configured Bedrock provider (RetrieveAndGenerate) against the real
// Knowledge Base. It NEVER runs during `npm test` or `npm build` (it is only invoked by this
// npm script and refuses NODE_ENV=test). It prints only safe fields — never the full answer,
// full excerpts, AWS IDs, ARNs, account ids, or credentials.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
// Relative imports (not `@/`) so this standalone script resolves through vite-node the same way
// scripts/sources.mts does; the `@/` aliases inside the imported src modules are still resolved
// by the vite-tsconfig-paths plugin.
import { getEnv } from "../src/lib/validation/index.ts";
import { resolveBedrockConfig } from "../src/lib/rag/bedrockConfig.ts";
import { createBedrockSearchService } from "../src/lib/rag/bedrockProvider.ts";

// Minimal .env.local loader (no dependency): populates process.env for local runs.
function loadEnvFile(file: string): void {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!m || line.trim().startsWith("#")) continue;
    const key = m[1] as string;
    let value = (m[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const QUERIES = [
  "How do I order an official transcript?",
  "How do I contact financial aid?",
  "Where can I find the academic calendar?",
  "How do I meet with a counselor?",
  "What tutoring services are available?",
  "When can I register for classes?",
  "How do I apply for graduation?",
  "What services are available for veterans?",
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    console.error("Refusing to run verify:bedrock under NODE_ENV=test.");
    process.exit(1);
  }

  loadEnvFile(".env.local");
  loadEnvFile(".env");

  console.warn(
    "\n⚠️  verify:bedrock performs LIVE, PAID Amazon Bedrock requests against your real\n" +
      "   Knowledge Base and model. Ensure AWS credentials + config are set.\n",
  );

  const configResult = resolveBedrockConfig(getEnv());
  if (configResult.status !== "ok") {
    console.error(`Configuration not usable (${configResult.status}): ${configResult.detail}`);
    console.error("Set RAG_PROVIDER=bedrock and the BEDROCK_* / AWS_REGION values, then retry.");
    process.exit(1);
  }

  const service = createBedrockSearchService(configResult);
  let usable = 0;
  let failures = 0;

  for (let i = 0; i < QUERIES.length; i += 1) {
    const query = QUERIES[i] as string;
    const started = Date.now();
    let line: string;
    try {
      const res = await service.answer(query);
      const durationMs = Date.now() - started;
      if (res.kind === "answered") {
        usable += 1;
        const titles = res.citations.map((c) => c.title);
        const urls = res.citations.map((c) => c.url).filter(Boolean);
        line =
          `answered | citations=${res.citations.length} | ${durationMs}ms\n` +
          `      titles: ${titles.join(" | ")}\n` +
          `      urls:   ${urls.length ? urls.join(" | ") : "(no approved public URL)"}`;
      } else if (res.kind === "error") {
        failures += 1;
        line = `error | ${durationMs}ms`;
      } else {
        line = `${res.kind} | ${durationMs}ms`;
      }
    } catch (err) {
      failures += 1;
      line = `error (${err instanceof Error ? err.name : "unknown"}) | ${Date.now() - started}ms`;
    }
    console.log(`${i + 1}. ${query}\n   -> ${line}`);
  }

  console.log(
    `\nSummary: ${usable}/${QUERIES.length} queries returned usable citations; ${failures} hard failure(s).`,
  );
  if (failures === QUERIES.length) {
    console.error("All queries failed.");
    process.exit(1);
  }
  process.exit(0);
}

await main();
