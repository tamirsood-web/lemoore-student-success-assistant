import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with status ok, provider name, and config readiness (no secrets)", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(["local", "bedrock"]).toContain(body.provider);
    expect(typeof body.configured).toBe("boolean");
    // Must never expose sensitive configuration.
    const serialized = JSON.stringify(body);
    for (const secret of [
      "region",
      "knowledgeBaseId",
      "modelArn",
      "AWS_",
      "arn:aws",
      "amazonaws.com",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
