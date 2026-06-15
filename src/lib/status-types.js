// src/lib/status-types.js
// Re-export of the status enums for use by automation scripts that run outside
// the Astro build. Mirrors src/content.config.ts (TS is not directly runnable
// from node scripts without a bundler, so we keep a parallel runtime version).
//
// Keep in sync with src/content.config.ts when categories/statuses change.

export const INSIGHT_STATUSES = ['draft', 'review', 'scheduled', 'published'];
export const INSIGHT_CATEGORIES = [
  'ai-strategy',
  'human-centered-ai',
  'ai-leadership',
  'aiso',
  'ai-marketing',
  'executive-education',
  'future-of-work',
];
