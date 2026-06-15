// src/lib/reading-time.ts
// Wrapper around the `reading-time` package that handles edge cases.

import readingTime from 'reading-time';

export function computeReadingTime(body: string): { minutes: number; words: number } {
  const result = readingTime(body || '', { wordsPerMinute: 220 });
  return { minutes: Math.max(1, result.minutes), words: result.words };
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}
