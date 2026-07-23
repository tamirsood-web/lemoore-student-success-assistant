// Verifies the chat route returns a generic 500 (no leaked detail) when an internal
// dependency throws unexpectedly. `retrieve` is mocked to throw.

vi.mock("@/lib/bedrock", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bedrock")>();
  return {
    ...actual,
    retrieve: () => {
      throw new Error("simulated retrieval failure with secret internals");
    },
  };
});

import { POST } from "./route";

describe("POST /api/chat — unexpected failure", () => {
  it("returns 500 with a fallbackScenario and no leaked detail", async () => {
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "What are the admissions office hours?" }),
      }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { fallbackScenario?: string };
    expect(body.fallbackScenario).toBe("technicalError");
    expect(JSON.stringify(body)).not.toContain("simulated retrieval failure");
    expect(JSON.stringify(body)).not.toContain("secret internals");
  });
});
