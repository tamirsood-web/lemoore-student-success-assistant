// Minimal, dependency-free robots.txt parser + matcher (pure; server/script-only).
//
// Implements the subset of the Robots Exclusion Protocol the crawler needs: User-agent group
// selection (specific agent > `*`), Allow/Disallow rules with `*` wildcards and `$` end
// anchors, and longest-match precedence (Allow wins ties). Also exposes any Sitemap
// directives. It is deliberately conservative: an unparseable or fetch-failed robots file is
// handled by the caller (which should refuse to crawl on hard fetch errors).

export type RobotsRule = {
  readonly type: "allow" | "disallow";
  readonly path: string;
};

export type RobotsRules = {
  /** Rules that apply to the selected user-agent group. */
  readonly rules: readonly RobotsRule[];
  /** Sitemap URLs declared anywhere in the file. */
  readonly sitemaps: readonly string[];
};

/**
 * Parse robots.txt text and return the rule set that applies to `userAgent`. Group selection:
 * the most specific matching `User-agent` token wins; otherwise the `*` group is used.
 */
export function parseRobots(text: string, userAgent: string): RobotsRules {
  const ua = userAgent.toLowerCase();
  const lines = text.split(/\r?\n/);

  // Collect grouped rules keyed by the (lowercased) user-agent token.
  const groups = new Map<string, RobotsRule[]>();
  const sitemaps: string[] = [];
  let currentAgents: string[] = [];
  // Once a non-user-agent directive is seen, the next `User-agent` line starts a new group.
  let expectingAgentBlock = false;

  for (const rawLine of lines) {
    const withoutComment = rawLine.split("#")[0] ?? "";
    const line = withoutComment.trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (expectingAgentBlock) {
        currentAgents = [];
        expectingAgentBlock = false;
      }
      currentAgents.push(value.toLowerCase());
      if (!groups.has(value.toLowerCase())) groups.set(value.toLowerCase(), []);
      continue;
    }

    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      continue;
    }

    if (field === "allow" || field === "disallow") {
      expectingAgentBlock = true;
      const rule: RobotsRule = { type: field, path: value };
      for (const agent of currentAgents) {
        groups.get(agent)?.push(rule);
      }
    }
  }

  // Select the applicable group: exact/substring UA match, else `*`, else none.
  let selected: RobotsRule[] | undefined;
  let bestSpecificity = -1;
  for (const [agent, rules] of groups.entries()) {
    if (agent === "*") continue;
    if (ua.includes(agent) && agent.length > bestSpecificity) {
      selected = rules;
      bestSpecificity = agent.length;
    }
  }
  if (!selected) selected = groups.get("*");

  return { rules: selected ?? [], sitemaps };
}

/** Convert a robots path pattern (with `*` and trailing `$`) to an anchored RegExp. */
function patternToRegExp(pattern: string): RegExp {
  const anchoredEnd = pattern.endsWith("$");
  const body = anchoredEnd ? pattern.slice(0, -1) : pattern;
  const escaped = body
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape regex metachars
    .replace(/\*/g, ".*"); // robots wildcard
  return new RegExp(`^${escaped}${anchoredEnd ? "$" : ""}`);
}

/**
 * True when `pathname` (plus optional query string) is allowed under the rule set. Uses
 * longest-match precedence; on an equal-length Allow/Disallow tie, Allow wins (per spec).
 * An empty rule set allows everything.
 */
export function isPathAllowed(rules: RobotsRules, pathname: string): boolean {
  let bestLen = -1;
  let decision: "allow" | "disallow" = "allow";
  for (const rule of rules.rules) {
    if (rule.path === "") {
      // `Disallow:` with empty value means "allow all"; ignore as a matching rule.
      continue;
    }
    if (patternToRegExp(rule.path).test(pathname)) {
      const len = rule.path.length;
      if (len > bestLen || (len === bestLen && rule.type === "allow")) {
        bestLen = len;
        decision = rule.type;
      }
    }
  }
  return decision === "allow";
}

/** Convenience: parse + check a full URL's path against the given user agent. */
export function isUrlAllowedByRobots(
  robotsText: string,
  userAgent: string,
  url: string,
): boolean {
  const parsed = parseRobots(robotsText, userAgent);
  try {
    const u = new URL(url);
    return isPathAllowed(parsed, `${u.pathname}${u.search}`);
  } catch {
    return false;
  }
}
