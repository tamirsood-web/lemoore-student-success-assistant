// Barrel for the content-ingestion pipeline library. Import from "@/lib/ingestion".
//
// Server/script-only: these modules are used by the `sources:*` CLI scripts and their tests.
// They perform no network or AWS I/O at import time (that lives in the scripts).

export {
  APPROVED_OFFICIAL_DOMAINS,
  isApprovedOfficialUrl,
  isAuthenticatedHost,
  isAuthenticatedPath,
  isCrawlTrapUrl,
  isAssetUrl,
  isPdfUrl,
  assessCrawlSafety,
  type CrawlSafetyVerdict,
} from "./domains";

export {
  canonicalizeUrl,
  tryCanonicalizeUrl,
  stripTrackingParams,
  isSameCanonicalUrl,
  type CanonicalizeOptions,
} from "./canonicalize";

export {
  parseRobots,
  isPathAllowed,
  isUrlAllowedByRobots,
  type RobotsRule,
  type RobotsRules,
} from "./robots";

export {
  OUTPUT_CATEGORIES,
  categoryForRecord,
  isOutputCategory,
  type OutputCategory,
} from "./topics";

export {
  slugify,
  baseNameFromUrl,
  uniqueName,
  metadataFileName,
} from "./filenames";

export {
  parseHtml,
  decodeEntities,
  type HtmlNode,
  type HtmlElementNode,
  type HtmlTextNode,
} from "./html";

export { extractContent, type ExtractedContent } from "./extract";

export {
  normalizeForCompare,
  contentHash,
  shingleSet,
  jaccard,
  detectDuplicates,
  type DuplicateInput,
  type DuplicateVerdict,
} from "./dedup";

export {
  assessHistorical,
  type HistoricalSignal,
} from "./historical";

export {
  buildMarkdownDocument,
  type MarkdownDocumentInput,
} from "./markdown";

export {
  EMBEDDED_METADATA_KEYS,
  buildMetadataSidecar,
  metadataSidecarSchema,
  type MetadataInput,
  type MetadataSidecar,
  type CurrentStatus,
  type ValidatedMetadataSidecar,
} from "./metadata";

export {
  SOURCE_PRIORITIES,
  SOURCE_TYPES,
  companionSchema,
  sourceRecordSchema,
  sourceManifestSchema,
  validateManifest,
  enabledRecords,
  type SourceRecord,
  type SourceManifest,
  type SourcePriority,
  type SourceType,
  type CompanionSource,
  type ManifestValidation,
} from "./manifest";

export {
  REVIEW_COLUMNS,
  toCsv,
  buildSummary,
  type ReviewRow,
  type IngestionSummary,
} from "./report";

export {
  CONFIRM_FLAGS,
  isConfirmed,
  resolveUploadDecision,
  resolveSyncDecision,
  type ExecutionDecision,
  type UploadConfig,
  type SyncConfig,
} from "./execution";

export {
  MIN_CONTENT_WORDS,
  resolveCurrentStatus,
  assessPage,
  type ExclusionReason,
  type PageAssessment,
  type PageAssessmentInput,
} from "./classify";

export {
  parseSitemap,
  extractLinks,
  guessTopicDepartment,
  classifyCandidate,
  type DiscoveredCandidate,
} from "./discovery";

export {
  RETRIEVAL_SCOPES,
  BEDROCK_DATA_SOURCE_METADATA_KEY,
  FAILURE_CLASSIFICATIONS,
  isRetrievalScope,
  resolveScopeFilter,
  canonicalUrlForMatch,
  urlMatchesExpected,
  urlMatchesExpectedStrict,
  classifyOrigin,
  dedupeRetrieved,
  looksStale,
  classifySingleScopeFailure,
  evaluateQuestion,
  buildComparison,
  renderComparisonMarkdown,
  type RetrievalScope,
  type ScopeDataSourceIds,
  type DataSourceFilter,
  type ScopeFilterResult,
  type SourceOrigin,
  type RetrievedResult,
  type DedupedResult,
  type DedupeOutcome,
  type FailureClassification,
  type EvalQuestion,
  type QuestionEval,
  type ScopeReport,
  type ComparisonRow,
  type TopicGroupComparison,
  type Comparison,
} from "./evaluation";
