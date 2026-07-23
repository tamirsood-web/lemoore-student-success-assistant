// Public barrel for the Nova 2 Sonic library. SDK-FREE by design: the only module that imports
// the Bedrock runtime SDK is `bedrockNovaClient.ts`, which the bridge imports directly. Keeping
// it out of the barrel means tests and any client-reachable import never load the AWS SDK.

export {
  NOVA_SONIC_MODEL_ID_DEFAULT,
  NOVA_SONIC_REGION_DEFAULT,
  NOVA_SONIC_WS_PORT_DEFAULT,
  NEXT_APP_PORT_DEFAULT,
  AUDIO_INPUT_SAMPLE_RATE,
  AUDIO_OUTPUT_SAMPLE_RATE,
  NOVA_LIMITS,
  resolveNovaBridgeConfig,
  isAllowedOrigin,
  type NovaBridgeConfig,
} from "./config";

export {
  sessionStart,
  promptStart,
  contentStartText,
  textInput,
  contentStartAudioUser,
  audioInput,
  contentStartToolResult,
  toolResult,
  contentEnd,
  promptEnd,
  sessionEnd,
  buildOpeningSequence,
  encodeEvent,
  DEFAULT_VOICE_ID,
  type NovaEvent,
} from "./events";

export { buildSystemPrompt, ASSISTANT_NAME } from "./systemPrompt";

export {
  KB_TOOL_NAME,
  kbToolSpec,
  parseToolInput,
  toToolResult,
  toSpokenAnswer,
  runKbTool,
  type KbToolSpec,
  type ToolResult,
  type ToolCitation,
} from "./tool";

export {
  resampleFloat32,
  floatToPcm16,
  pcm16ToFloat,
  int16ToBase64,
  base64ToInt16,
  base64DecodedByteLength,
} from "./audio";

export { normalizeNovaOutput, type NovaOutput } from "./outputEvents";

export {
  parseClientMessage,
  encodeBridgeMessage,
  BRIDGE_SAFE_ERROR,
  type ClientMessage,
  type BridgeMessage,
  type BridgeState,
  type BridgeCitation,
  type ParseResult,
} from "./wsProtocol";

export {
  createNovaSession,
  NovaInputQueue,
  type NovaSession,
  type NovaInvoke,
  type InputChunk,
  type OutputChunk,
  type CreateNovaSessionOptions,
} from "./session";
