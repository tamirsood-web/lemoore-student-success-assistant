import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with the health payload", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
