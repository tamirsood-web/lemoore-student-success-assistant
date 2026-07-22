import { POST } from "./route";

function feedbackRequest(payload: unknown): Request {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function post(payload: unknown): Promise<{ status: number; body: unknown }> {
  const res = await POST(feedbackRequest(payload));
  return { status: res.status, body: await res.json() };
}

describe("POST /api/feedback", () => {
  it("returns 200 for valid helpful feedback", async () => {
    const { status, body } = await post({ conversationId: "conv-1", helpful: true });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("returns 200 for valid unhelpful feedback with a reason", async () => {
    const { status, body } = await post({
      conversationId: "conv-1",
      helpful: false,
      reason: "The date was unclear.",
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("returns 400 for invalid feedback", async () => {
    const { status } = await post({ conversationId: "" });
    expect(status).toBe(400);
  });
});
