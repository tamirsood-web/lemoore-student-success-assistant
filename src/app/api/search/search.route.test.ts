import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "./route";
import { websiteSearchResponseSchema } from "@/lib/validation";

function req(body: unknown): Request {
  return new Request("http://localhost/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.restoreAllMocks());

describe("POST /api/search", () => {
  it("returns a schema-valid answered response for a known question", async () => {
    const res = await POST(req({ query: "How do I order my transcript?" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = websiteSearchResponseSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json.kind).toBe("answered");
    expect(json.citations[0].id).toBe("official-transcripts");
    expect(json.citations[0].url).toMatch(/^https:\/\/lemoorecollege\.edu/);
  });

  it("rejects an empty query with a 400 error response", async () => {
    const res = await POST(req({ query: "   " }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.kind).toBe("error");
  });

  it("handles unreadable JSON with a 400 error response", async () => {
    const bad = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(bad);
    expect(res.status).toBe(400);
  });

  it("performs NO outbound network request in local mode", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await POST(req({ query: "How do I contact financial aid?" }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
