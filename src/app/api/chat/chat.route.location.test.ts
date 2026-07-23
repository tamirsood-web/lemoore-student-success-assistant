// Route-level tests for the location ("where is X?") feature.
//
// Verifies the full pipeline: POST /api/chat → retrieve → compose → escalate →
// normalize → typed JSON response, specifically for location queries.

import type { AssistantResponse, GroundedResponse } from "@/types";
import { POST } from "./route";

function chatRequest(message: string): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

async function post(message: string): Promise<{ status: number; body: AssistantResponse }> {
  const res = await POST(chatRequest(message));
  return { status: res.status, body: (await res.json()) as AssistantResponse };
}

describe("POST /api/chat — location feature", () => {
  it("returns a grounded response for 'Where is Admissions?'", async () => {
    const { status, body } = await post("Where is Admissions?");
    expect(status).toBe(200);
    expect(body.kind).toBe("grounded");
  });

  it("includes a locationCard with the department name", async () => {
    const { body } = await post("Where is Admissions?");
    expect(body.kind).toBe("grounded");
    const grounded = body as GroundedResponse;
    expect(grounded.locationCard).toBeDefined();
    expect(grounded.locationCard?.name).toBe("Admissions & Records");
  });

  it("includes the campus map URL in the locationCard", async () => {
    const { body } = await post("Where do I go for Financial Aid?");
    const grounded = body as GroundedResponse;
    expect(grounded.locationCard?.mapUrl).toBe("https://lemoorecollege.edu/map/");
  });

  it("includes valid citations pointing to real sources", async () => {
    const { getSourceById } = await import("@/lib/mock");
    const { body } = await post("Where is Admissions?");
    expect(body.citations.length).toBeGreaterThan(0);
    for (const citation of body.citations) {
      expect(getSourceById(citation.sourceId)).toBeDefined();
    }
  });

  it("escalates for an unknown location with no guess", async () => {
    const { status, body } = await post("Where is the swimming pool?");
    expect(status).toBe(200);
    expect(body.kind).toBe("insufficient_evidence");
    expect(body.escalationRecommended).toBe(true);
    // Must not fabricate a building name or location.
    expect(JSON.stringify(body).toLowerCase()).not.toContain("building a");
    expect(JSON.stringify(body).toLowerCase()).not.toContain("room 999");
  });

  it("does not include a comparisonBlock on a location response", async () => {
    const { body } = await post("Where is Admissions?");
    const grounded = body as GroundedResponse;
    expect(grounded.comparisonBlock).toBeUndefined();
  });

  it("returns Financial Aid location details", async () => {
    const { body } = await post("Where do I go for Financial Aid?");
    expect(body.kind).toBe("grounded");
    const grounded = body as GroundedResponse;
    expect(grounded.locationCard?.name).toBe("Financial Aid");
    expect(grounded.locationCard?.building).toBeDefined();
    expect(grounded.locationCard?.hours).toBeDefined();
  });
});
