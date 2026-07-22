// QueryRewriter — normalization, tokenization, and synonym expansion (server-only).
//
// Turns a raw keyword string or natural-language question into a normalized token set the
// retriever can score against. Query text is treated purely as DATA for matching, never as
// instructions (prompt-injection resilience). Deterministic; no network/AWS calls.

/** Words ignored when scoring (articles, pronouns, question words, auxiliaries). */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "for", "in", "on", "at", "is",
  "are", "am", "was", "were", "be", "do", "does", "did", "how", "what", "when",
  "where", "which", "who", "whom", "why", "i", "me", "my", "you", "your", "can",
  "could", "would", "should", "please", "about", "with", "there", "it", "this",
  "that", "get", "getting", "find", "finding", "need", "want", "some", "any",
  "if", "from", "as", "by", "up", "out",
]);

/**
 * Synonym / paraphrase expansion. Maps common student phrasings to the vocabulary that
 * actually appears in official page titles/topics, improving natural-language recall.
 * Keys are single tokens; each maps to extra tokens added to the query set.
 */
const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  transcript: ["transcripts", "records", "parchment"],
  transcripts: ["records", "parchment"],
  register: ["registration", "schedule", "enroll", "classes"],
  registering: ["registration", "schedule", "enroll"],
  registration: ["schedule", "enroll", "classes"],
  enroll: ["registration", "admissions", "schedule"],
  enrollment: ["registration", "admissions"],
  signup: ["registration", "enroll"],
  cost: ["cost-of-attendance", "attendance", "tuition", "fees", "price"],
  tuition: ["cost-of-attendance", "fees", "attendance"],
  price: ["cost-of-attendance", "tuition", "fees"],
  pay: ["cost-of-attendance", "financial-aid", "tuition"],
  money: ["financial-aid", "grants", "scholarships"],
  aid: ["financial-aid", "fafsa", "grants"],
  fafsa: ["financial-aid", "aid"],
  scholarship: ["scholarships", "grants", "grants-and-scholarships"],
  scholarships: ["grants", "grants-and-scholarships"],
  grant: ["grants", "scholarships", "financial-aid"],
  grants: ["scholarships", "financial-aid"],
  counselor: ["counseling", "advising", "advisor"],
  counseling: ["advising", "counselor"],
  advisor: ["counseling", "advising"],
  advising: ["counseling"],
  tutor: ["tutoring", "ace", "support"],
  tutoring: ["ace", "support", "academic"],
  help: ["support", "resources"],
  library: ["learning", "resources", "books"],
  veteran: ["veterans", "military", "va"],
  veterans: ["military", "va"],
  military: ["veterans"],
  disability: ["dsps", "disabled", "accommodations"],
  disabled: ["dsps", "accommodations"],
  accommodation: ["dsps", "disabled"],
  accommodations: ["dsps", "disabled"],
  dsps: ["disabled", "accommodations"],
  eops: ["extended", "opportunity"],
  graduate: ["graduation", "petition", "diploma"],
  graduation: ["petition", "diploma"],
  petition: ["graduation"],
  diploma: ["graduation", "degree"],
  degree: ["graduation", "diploma"],
  dual: ["dual-enrollment", "enrollment", "highschool"],
  calendar: ["academic-calendar", "academic", "dates", "semester", "term"],
  dates: ["academic-calendar", "calendar", "deadlines"],
  deadline: ["academic-calendar", "dates"],
  deadlines: ["academic-calendar", "dates"],
  password: ["portal", "login", "mywesthills"],
  login: ["portal", "mywesthills", "password"],
  portal: ["mywesthills", "login"],
  mywesthills: ["portal", "login"],
  apply: ["admissions", "application", "admission"],
  application: ["admissions", "apply"],
  admission: ["admissions", "apply"],
  contact: ["phone", "email", "office"],
};

/** Split text into lowercased alphanumeric tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** A normalized query: original text plus the meaningful + expanded token sets. */
export type RewrittenQuery = {
  readonly raw: string;
  readonly normalized: string;
  /** Meaningful query tokens (stopwords removed), before synonym expansion. */
  readonly terms: readonly string[];
  /** `terms` plus synonym/paraphrase expansions, de-duplicated. */
  readonly expanded: readonly string[];
};

/** Normalize + tokenize + expand a raw query. */
export function rewriteQuery(raw: string): RewrittenQuery {
  const normalized = raw.trim().toLowerCase();
  const tokens = tokenize(normalized).filter((t) => !STOPWORDS.has(t));
  const terms = Array.from(new Set(tokens));

  const expanded = new Set<string>(terms);
  for (const term of terms) {
    const extra = SYNONYMS[term];
    if (extra) for (const s of extra) expanded.add(s);
  }

  return { raw, normalized, terms, expanded: Array.from(expanded) };
}
