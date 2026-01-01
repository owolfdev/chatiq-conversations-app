const CHUNK_SIZE_TOKENS = 600;
const CHUNK_OVERLAP_TOKENS = 120;

export interface Chunk {
  idx: number;
  text: string;
}

export function chunkDocumentContent(content: string): Chunk[] {
  const normalized = (content ?? "").trim();

  if (normalized.length === 0) {
    return [];
  }

  const parts = normalized.match(/\S+|\s+/g) ?? [];
  const wordIndices: number[] = [];

  parts.forEach((part, index) => {
    if (/\S/.test(part)) {
      wordIndices.push(index);
    }
  });

  if (wordIndices.length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];
  const step = Math.max(1, CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS);
  let startWord = 0;
  let idx = 0;

  while (startWord < wordIndices.length) {
    const endWord = Math.min(startWord + CHUNK_SIZE_TOKENS, wordIndices.length) - 1;
    const startPartIndex = wordIndices[startWord];
    let endPartIndex = wordIndices[endWord];

    if (parts[endPartIndex + 1] && !/\S/.test(parts[endPartIndex + 1])) {
      endPartIndex += 1;
    }

    const chunkText = parts.slice(startPartIndex, endPartIndex + 1).join("").trim();

    if (chunkText.length > 0) {
      chunks.push({
        idx,
        text: chunkText,
      });
      idx += 1;
    }

    if (endWord >= wordIndices.length - 1) {
      break;
    }

    startWord = Math.max(endWord - CHUNK_OVERLAP_TOKENS + 1, startWord + step);
  }

  return chunks;
}
