// Deterministic output-filename derivation (pure; server/script-only).
//
// A source URL maps to one stable, filesystem-safe base name so re-runs overwrite the same
// file instead of accumulating duplicates. The name is derived from the URL path (kept
// human-readable for review) and is never guessed from page content.

/** Lowercase, hyphenate, and strip anything unsafe for a filename. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Derive a base file name (no extension) from a URL. Uses the meaningful path segments so the
 * name is recognizable in review, falling back to the host for a bare root URL. Bounded length
 * keeps paths portable across filesystems.
 */
export function baseNameFromUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return slugify(url).slice(0, 80) || "source";
  }

  const segments = parsed.pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\.(php|html?|asp|aspx|pdf)$/i, ""));

  if (segments.length === 0) {
    return slugify(parsed.hostname.replace(/^www\./, "")) || "home";
  }

  // Prefer the last 1-3 segments so nested pages stay distinguishable but names stay short.
  const tail = segments.slice(-3).join("-");
  const slug = slugify(tail);
  return (slug || slugify(parsed.hostname)).slice(0, 90);
}

/** Ensure uniqueness within a set of already-used names by appending a numeric suffix. */
export function uniqueName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  const name = `${base}-${n}`;
  used.add(name);
  return name;
}

/** The Bedrock metadata sidecar file name for a given content file name. */
export function metadataFileName(contentFileName: string): string {
  return `${contentFileName}.metadata.json`;
}
