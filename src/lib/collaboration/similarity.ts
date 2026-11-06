/**
 * Explainable similarity between two marketplace listings.
 *
 * Different creators are similar when any of these is true:
 * 1. Same category and at least one shared tag or meaningful word.
 * 2. At least two shared tags.
 * 3. At least three shared meaningful words.
 *
 * A meaningful word is a lowercase run of letters or digits, at least four
 * characters long, with COLLABORATION_STOP_WORDS removed. Tags match
 * case-insensitively. Same category alone is not enough.
 *
 * private.listings_are_similar in the collaboration migration uses the same
 * rules, so a direct insert cannot skip the check the API makes.
 */

export const COLLABORATION_STOP_WORDS = [
  "about",
  "after",
  "again",
  "also",
  "apps",
  "auto",
  "been",
  "before",
  "could",
  "does",
  "each",
  "from",
  "have",
  "here",
  "into",
  "just",
  "more",
  "once",
  "only",
  "onto",
  "other",
  "over",
  "should",
  "some",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "under",
  "upon",
  "used",
  "using",
  "very",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "will",
  "with",
  "would",
  "your",
] as const;

const STOP_WORDS = new Set<string>(COLLABORATION_STOP_WORDS);

export const SIMILARITY_RULE_SUMMARY =
  "A match is the same category plus a shared tag or word, at least two shared tags, or at least three overlapping words in the name and description. Common words are ignored.";

/** Accepted collaborations do not change Stripe Connect transfers. */
export const REVENUE_SHARING_NOTE =
  "Payouts stay with each listing's creator. Revenue sharing is not part of a collaboration yet.";

export type ListingForSimilarity = {
  id: string;
  creatorId: string | null;
  title: string;
  category: string;
  summary?: string | null;
  description?: string | null;
  tags?: readonly string[] | null;
};

export type SimilarityAssessment = {
  similar: boolean;
  score: number;
  sameCategory: boolean;
  sharedTags: string[];
  sharedTerms: string[];
  reasons: string[];
};

const EMPTY_ASSESSMENT: SimilarityAssessment = {
  similar: false,
  score: 0,
  sameCategory: false,
  sharedTags: [],
  sharedTerms: [],
  reasons: [],
};

/** Lowercase tokens used for overlap. Order is first-seen and stable. */
export function listingTerms(...parts: Array<string | null | undefined>): string[] {
  const normalized = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

  const seen = new Set<string>();
  const terms: string[] = [];
  for (const token of normalized.split(/\s+/)) {
    if (token.length < 4 || STOP_WORDS.has(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    terms.push(token);
  }
  return terms;
}

function tagLabels(tags: readonly string[] | null | undefined) {
  const labels = new Map<string, string>();
  for (const tag of tags ?? []) {
    const trimmed = tag.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (!labels.has(key)) {
      labels.set(key, trimmed);
    }
  }
  return labels;
}

export function assessListingSimilarity(
  left: ListingForSimilarity,
  right: ListingForSimilarity,
): SimilarityAssessment {
  if (!left.id || !right.id || left.id === right.id) {
    return EMPTY_ASSESSMENT;
  }

  if (left.creatorId && right.creatorId && left.creatorId === right.creatorId) {
    return EMPTY_ASSESSMENT;
  }

  const leftCategory = left.category.trim();
  const rightCategory = right.category.trim();
  const sameCategory =
    leftCategory.length > 0 && leftCategory.toLowerCase() === rightCategory.toLowerCase();

  const leftTags = tagLabels(left.tags);
  const rightTags = tagLabels(right.tags);
  const sharedTags = [...leftTags.entries()]
    .filter(([key]) => rightTags.has(key))
    .map(([, label]) => label);

  const rightTerms = new Set(listingTerms(right.title, right.summary, right.description));
  const sharedTerms = listingTerms(left.title, left.summary, left.description).filter((term) =>
    rightTerms.has(term),
  );

  const similar =
    (sameCategory && (sharedTags.length > 0 || sharedTerms.length > 0)) ||
    sharedTags.length >= 2 ||
    sharedTerms.length >= 3;

  const score =
    (sameCategory ? 3 : 0) + sharedTags.length * 2 + Math.min(sharedTerms.length, 5);

  const reasons: string[] = [];
  if (sameCategory) {
    reasons.push(`Same category: ${leftCategory}`);
  }
  if (sharedTags.length > 0) {
    reasons.push(`Shared tags: ${sharedTags.join(", ")}`);
  }
  if (sharedTerms.length > 0) {
    reasons.push(`Overlapping words: ${sharedTerms.slice(0, 6).join(", ")}`);
  }

  return {
    similar,
    score,
    sameCategory,
    sharedTags,
    sharedTerms,
    reasons,
  };
}
