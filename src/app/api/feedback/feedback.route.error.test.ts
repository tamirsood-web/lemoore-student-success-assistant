// Verifies the feedback route returns a generic 500 (no leaked detail) when the sink
// throws unexpectedly. `recordFeedback` is mocked to throw.

vi.mock("@/lib/db/feedback", () => ({
  recordFeedback: () => {
    throw new Error("simulated sink failure with internals");
  },
}));

import { POST } from "./route";

describe("POST /api/feedback — unexpected failure", () => {
  it("returns 500 with a generic message and no leaked detail", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: "conv-1", helpful: true }),
      }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { message?: string };
    expect(typeof body.message).toBe("string");
    expect(JSON.stringify(body)).not.toContain("simulated sink failure");
  });
});
