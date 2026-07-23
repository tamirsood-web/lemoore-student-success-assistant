// Route-level tests for the comparison ("difference between X and Y") feature.
//
// Verifies the full pipeline for comparison queries end-to-end.

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

describe("POST /api/chat — comparison feature", () => {
  it("returns grounded response for 'What's the difference between dropping and withdrawing?'", async () => {
    const { status, body } = await post(
      "What's the difference between dropping and withdrawing?",
    );
    expect(status).toBe(200);
    expect(body.kind).toBe("grounded");
  });

  it("includes a comparisonBlock with the correct topic", async () => {
    const { body } = await post(
      "What's the difference between dropping and withdrawing?",
    );
    const grounded = body as GroundedResponse;
    expect(grounded.comparisonBlock).toBeDefined();
    expect(grounded.comparisonBlock?.topic).toBe("Dropping vs. Withdrawing");
  });

  it("comparisonBlock has both options and key differences", async () => {
    const { body } = await post(
      "What's the difference between dropping and withdrawing?",
    );
    const grounded = body as GroundedResponse;
    expect(grounded.comparisonBlock?.optionA.label).toBe("Dropping");
    expect(grounded.comparisonBlock?.optionB.label).toBe("Withdrawing");
    expect(grounded.comparisonBlock?.keyDifferences.length).toBeGreaterThan(0);
  });

  it("includes valid citations for a comparison response", async () => {
    const { getSourceById } = await import("@/lib/mock");
    const { body } = await post(
      "What's the difference between dropping and withdrawing?",
    );
    expect(body.citations.length).toBeGreaterThan(0);
    for (const citation of body.citations) {
      expect(getSourceById(citation.sourceId)).toBeDefined();
    }
  });

  it("escalates for an unsupported comparison topic", async () => {
    const { status, body } = await post(
      "Can you compare semester vs trimester calendar systems?",
    );
    expect(status).toBe(200);
    expect(body.kind).toBe("insufficient_evidence");
    expect(body.escalationRecommended).toBe(true);
    // Must not invent policy differences.
    expect(body.answer).not.toMatch(/semester.*trimester|trimester.*semester/i);
  });

  it("census date vs drop date comparison returns grounded with comparisonBlock", async () => {
    const { body } = await post(
      "What is the difference between census date and drop date?",
    );
    expect(body.kind).toBe("grounded");
    const grounded = body as GroundedResponse;
    expect(grounded.comparisonBlock?.topic).toBe("Census Date vs. Drop Date");
  });

  it("does not include a locationCard on a comparison response", async () => {
    const { body } = await post(
      "What's the difference between dropping and withdrawing?",
    );
    const grounded = body as GroundedResponse;
    expect(grounded.locationCard).toBeUndefined();
  });

  it("answer text does not contain invented policy claims", async () => {
    const { body } = await post(
      "What's the difference between dropping and withdrawing?",
    );
    // Answer must not present specific GPA numbers or financial amounts not in sources.
    expect(body.answer).not.toMatch(/\$\d+/);
    expect(body.answer).not.toMatch(/\d+\.\d+ gpa/i);
  });
});
