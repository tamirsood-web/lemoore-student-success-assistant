// Duplicate + near-duplicate detection over extracted text (pure; server/script-only).
//
// Two layers: an exact content hash (normalized text) collapses identical pages reached via
// different URLs, and word-shingle Jaccard similarity flags near-duplicates (e.g. a page and
// its printer-friendly twin, or lightly edited copies). The FIRST occurrence in input order is
// treated as canonical; later matches are marked as duplicates of it. No content is deleted —
// callers decide how to treat a flagged duplicate in the review report.

/** Normalize text for hashing/shingling: lowercase, strip punctuation, collapse whitespace. */
export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable 32-bit FNV-1a hash rendered as hex (deterministic, no crypto dependency). */
export function contentHash(text: string): string {
  const normalized = normalizeForCompare(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Build the set of k-word shingles for near-duplicate comparison (default k=5). */
export function shingleSet(text: string, k = 5): Set<string> {
  const words = normalizeForCompare(text).split(" ").filter(Boolean);
  const shingles = new Set<string>();
  if (words.length < k) {
    if (words.length > 0) shingles.add(words.join(" "));
    return shingles;
  }
  for (let i = 0; i + k <= words.length; i += 1) {
    shingles.add(words.slice(i, i + k).join(" "));
  }
  return shingles;
}

/** Jaccard similarity between two shingle sets (0..1). Two empty sets are considered equal. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of small) if (large.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export type DuplicateInput = { readonly id: string; readonly text: string };

export type DuplicateVerdict = {
  readonly id: string;
  readonly isDuplicate: boolean;
  /** Exact ("exact") or near-duplicate ("near"); undefined when unique. */
  readonly kind?: "exact" | "near";
  /** The canonical (first-seen) id this duplicates, if any. */
  readonly duplicateOf?: string;
  /** Similarity to the matched canonical (1 for exact). */
  readonly similarity: number;
};

/**
 * Classify each input as unique / exact-duplicate / near-duplicate against earlier inputs.
 * `threshold` is the minimum Jaccard similarity to count as a near-duplicate (default 0.85).
 */
export function detectDuplicates(
  items: readonly DuplicateInput[],
  threshold = 0.85,
): DuplicateVerdict[] {
  const seenHashes = new Map<string, string>(); // hash -> canonical id
  const canonical: Array<{ id: string; shingles: Set<string> }> = [];
  const verdicts: DuplicateVerdict[] = [];

  for (const item of items) {
    const hash = contentHash(item.text);
    const exact = seenHashes.get(hash);
    if (exact) {
      verdicts.push({ id: item.id, isDuplicate: true, kind: "exact", duplicateOf: exact, similarity: 1 });
      continue;
    }

    const shingles = shingleSet(item.text);
    let best: { id: string; sim: number } | undefined;
    for (const prev of canonical) {
      const sim = jaccard(shingles, prev.shingles);
      if (!best || sim > best.sim) best = { id: prev.id, sim };
    }

    if (best && best.sim >= threshold) {
      verdicts.push({ id: item.id, isDuplicate: true, kind: "near", duplicateOf: best.id, similarity: best.sim });
      continue;
    }

    seenHashes.set(hash, item.id);
    canonical.push({ id: item.id, shingles });
    verdicts.push({ id: item.id, isDuplicate: false, similarity: best?.sim ?? 0 });
  }

  return verdicts;
}
