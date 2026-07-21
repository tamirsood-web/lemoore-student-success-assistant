// Makes Vitest's globals (describe/it/expect, enabled via `globals: true` in
// vitest.config.ts) visible to the TypeScript compiler without restricting the
// project-wide `types` resolution. jest-dom matchers are augmented in ./setup.ts.
/// <reference types="vitest/globals" />
