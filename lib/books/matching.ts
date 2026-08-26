/**
 * Pure title/author matching logic — no network calls, so this is the part
 * of enrichment that's cheap to unit test directly.
 */

export interface MatchCandidate {
  title: string;
  author?: string;
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents (after NFKD)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

/** Jaccard similarity (intersection / union) over whitespace tokens. */
export function jaccard(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;

  let intersection = 0;
  for (const token of ta) {
    if (tb.has(token)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return intersection / union;
}

/**
 * Title carries most of the weight since spine-read authors are often
 * missing or abbreviated; when both sides have an author, it still
 * meaningfully boosts/penalizes the score.
 */
export function scoreMatch(
  detected: MatchCandidate,
  candidate: MatchCandidate
): number {
  const titleScore = jaccard(detected.title, candidate.title);
  if (!detected.author || !candidate.author) {
    return titleScore;
  }
  const authorScore = jaccard(detected.author, candidate.author);
  return titleScore * 0.7 + authorScore * 0.3;
}

export const MATCH_THRESHOLD = 0.5;
export const AMBIGUOUS_THRESHOLD = 0.25;

export type MatchClassification = "matched" | "ambiguous" | "unmatched";

export function classifyScore(score: number): MatchClassification {
  if (score >= MATCH_THRESHOLD) return "matched";
  if (score >= AMBIGUOUS_THRESHOLD) return "ambiguous";
  return "unmatched";
}

export function pickBestCandidate<T extends MatchCandidate>(
  detected: MatchCandidate,
  candidates: T[]
): { candidate: T; score: number } | null {
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestScore = scoreMatch(detected, best);
  for (const candidate of candidates.slice(1)) {
    const score = scoreMatch(detected, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return { candidate: best, score: bestScore };
}
