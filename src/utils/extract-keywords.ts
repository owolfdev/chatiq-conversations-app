// utils/extract-keywords.ts

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "to",
  "from",
  "with",
  "and",
  "or",
  "of",
  "in",
  "on",
  "for",
  "as",
  "at",
  "by",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "i",
  "you",
  "we",
  "he",
  "she",
  "they",
  "them",
  "his",
  "her",
  "their",
  "but",
  "not",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "so",
  "if",
  "then",
  "too",
  "can",
  "will",
  "just",
  "about",
  "into",
  "out",
  "some",
  "any",
]);

export function extractKeywords(message: string): string[] {
  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));

  return Array.from(new Set(words)); // remove duplicates
}
