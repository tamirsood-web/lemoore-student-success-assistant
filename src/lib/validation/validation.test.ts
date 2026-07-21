import {
  buildChatRequestSchema,
  parseChatRequest,
  parseFeedbackRequest,
  parseEnv,
  safeParse,
  DEFAULT_CHAT_MAX_INPUT_CHARS,
  FEEDBACK_REASON_MAX_CHARS,
} from "./index";

describe("chat request validation", () => {
  it("accepts a valid question and trims surrounding whitespace", () => {
    const result = parseChatRequest({ message: "  When is the census date?  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("When is the census date?");
    }
  });

  it("rejects an empty message", () => {
    const result = parseChatRequest({ message: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Please enter a question.");
    }
  });

  it("rejects a whitespace-only message", () => {
    const result = parseChatRequest({ message: "    " });
    expect(result.success).toBe(false);
  });

  it("rejects a missing message field", () => {
    const result = parseChatRequest({});
    expect(result.success).toBe(false);
  });

  it("rejects a non-string message", () => {
    const result = parseChatRequest({ message: 42 });
    expect(result.success).toBe(false);
  });

  it("rejects a message over the configured maximum length", () => {
    const schema = buildChatRequestSchema(5);
    const result = safeParse(schema, { message: "123456" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("too long");
    }
  });

  it("does not trust client-supplied role/mode (unknown keys are stripped)", () => {
    const result = parseChatRequest({
      message: "Hello",
      role: "admin",
      mode: "admin",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ message: "Hello" });
      expect("role" in result.data).toBe(false);
    }
  });
});

describe("feedback request validation", () => {
  it("accepts helpful feedback without a reason", () => {
    const result = parseFeedbackRequest({
      conversationId: "conv-1",
      helpful: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts feedback with an optional reason", () => {
    const result = parseFeedbackRequest({
      conversationId: "conv-1",
      helpful: false,
      reason: "The date was unclear.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects feedback missing the helpful flag", () => {
    const result = parseFeedbackRequest({ conversationId: "conv-1" });
    expect(result.success).toBe(false);
  });

  it("rejects feedback missing the conversation reference", () => {
    const result = parseFeedbackRequest({ helpful: true });
    expect(result.success).toBe(false);
  });

  it("rejects an over-long reason", () => {
    const result = parseFeedbackRequest({
      conversationId: "conv-1",
      helpful: true,
      reason: "x".repeat(FEEDBACK_REASON_MAX_CHARS + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("environment validation", () => {
  it("succeeds with an empty environment (AWS vars optional)", () => {
    const result = parseEnv({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chatMaxInputChars).toBe(DEFAULT_CHAT_MAX_INPUT_CHARS);
      expect(result.data.enableAdminSourceSync).toBe(false);
      expect(result.data.aws.region).toBeUndefined();
      expect(result.data.aws.bedrock.modelId).toBeUndefined();
      expect(result.data.aws.cognito.userPoolId).toBeUndefined();
      expect(result.data.aws.dynamoTableName).toBeUndefined();
    }
  });

  it("treats empty-string AWS values as unset", () => {
    const result = parseEnv({
      AWS_REGION: "",
      BEDROCK_MODEL_ID: "   ",
      DYNAMODB_TABLE_NAME: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aws.region).toBeUndefined();
      expect(result.data.aws.bedrock.modelId).toBeUndefined();
      expect(result.data.aws.dynamoTableName).toBeUndefined();
    }
  });

  it("coerces the chat length limit and the admin-sync boolean", () => {
    const result = parseEnv({
      CHAT_MAX_INPUT_CHARS: "10",
      ENABLE_ADMIN_SOURCE_SYNC: "true",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chatMaxInputChars).toBe(10);
      expect(result.data.enableAdminSourceSync).toBe(true);
    }
  });

  it("keeps provided AWS values when present", () => {
    const result = parseEnv({
      AWS_REGION: "us-west-2",
      BEDROCK_GUARDRAIL_VERSION: "DRAFT",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aws.region).toBe("us-west-2");
      expect(result.data.aws.bedrock.guardrailVersion).toBe("DRAFT");
    }
  });

  it("rejects a non-positive chat length limit", () => {
    const result = parseEnv({ CHAT_MAX_INPUT_CHARS: "-5" });
    expect(result.success).toBe(false);
  });
});
