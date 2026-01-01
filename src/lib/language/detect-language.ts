const ENGLISH_STOPWORDS = new Set([
  "the",
  "and",
  "is",
  "are",
  "of",
  "to",
  "in",
  "for",
  "with",
  "that",
  "this",
  "it",
  "as",
  "on",
]);

const MIN_LETTER_COUNT = 20;
const MIN_CONFIDENCE = 0.6;

const THAI_RANGE = [0x0e00, 0x0e7f] as const;
const HIRAGANA_RANGE = [0x3040, 0x309f] as const;
const KATAKANA_RANGE = [0x30a0, 0x30ff] as const;
const HAN_RANGE = [0x4e00, 0x9fff] as const;
const HAN_EXT_RANGE = [0x3400, 0x4dbf] as const;
const HANGUL_RANGE = [0xac00, 0xd7af] as const;

export interface LanguageDetection {
  language: string | null;
  confidence: number | null;
}

function inRange(codePoint: number, range: readonly [number, number]): boolean {
  return codePoint >= range[0] && codePoint <= range[1];
}

function countStopwords(text: string): number {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z]+/g)
    .filter(Boolean);
  let matches = 0;
  for (const token of tokens) {
    if (ENGLISH_STOPWORDS.has(token)) {
      matches += 1;
    }
  }
  return matches;
}

export function normalizeLanguageTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return trimmed;
  const parts = trimmed.split("-");
  if (parts.length === 0) return trimmed.toLowerCase();
  const primary = parts[0]?.toLowerCase() ?? "";
  const rest = parts.slice(1).map((part) => {
    if (part.length === 2) return part.toUpperCase();
    return part;
  });
  return [primary, ...rest].filter(Boolean).join("-");
}

export function detectLanguage(text: string): LanguageDetection {
  const sample = text.slice(0, 5000);
  let thai = 0;
  let hiragana = 0;
  let katakana = 0;
  let han = 0;
  let hangul = 0;
  let latin = 0;

  for (const char of sample) {
    const codePoint = char.codePointAt(0);
    if (!codePoint) continue;
    if (inRange(codePoint, THAI_RANGE)) thai += 1;
    else if (inRange(codePoint, HIRAGANA_RANGE)) hiragana += 1;
    else if (inRange(codePoint, KATAKANA_RANGE)) katakana += 1;
    else if (inRange(codePoint, HAN_RANGE) || inRange(codePoint, HAN_EXT_RANGE))
      han += 1;
    else if (inRange(codePoint, HANGUL_RANGE)) hangul += 1;
    else if (
      (codePoint >= 0x41 && codePoint <= 0x5a) ||
      (codePoint >= 0x61 && codePoint <= 0x7a)
    )
      latin += 1;
  }

  const totalLetters = thai + hiragana + katakana + han + hangul + latin;
  if (totalLetters < MIN_LETTER_COUNT) {
    return { language: null, confidence: null };
  }

  if (thai / totalLetters >= MIN_CONFIDENCE) {
    return { language: "th", confidence: thai / totalLetters };
  }

  if ((hiragana + katakana) / totalLetters >= MIN_CONFIDENCE || hiragana > 0) {
    return {
      language: "ja",
      confidence: (hiragana + katakana) / totalLetters,
    };
  }

  if (hangul / totalLetters >= MIN_CONFIDENCE) {
    return { language: "ko", confidence: hangul / totalLetters };
  }

  if (han / totalLetters >= MIN_CONFIDENCE) {
    return { language: "zh", confidence: han / totalLetters };
  }

  if (latin / totalLetters >= MIN_CONFIDENCE) {
    const stopwordHits = countStopwords(sample);
    const confidence = Math.min(0.55 + stopwordHits / 50, 0.85);
    if (stopwordHits >= 2) {
      return { language: "en", confidence };
    }
  }

  return { language: null, confidence: null };
}

