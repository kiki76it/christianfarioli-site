import type { CollectionEntry } from 'astro:content';
import { publicOnly, sortByDateDesc } from './insights';

export const AI_PULSE_PAGE_SIZE = 12;
export const AI_PULSE_INTRO = 'What happened in AI today - and why it matters for business leaders.';
export const AI_PULSE_TITLE = 'AI Pulse - Latest AI News & Business Insights | Prof. Christian Farioli';
export const AI_PULSE_DESCRIPTION = 'Daily AI news decoded for CEOs and business leaders by Prof. Christian Farioli - what changed, why it matters and what comes next.';
export const AI_PULSE_ABOUT = 'AI Pulse follows the developments in artificial intelligence that matter most to business leaders. Rather than simply reporting the news, each edition explains what changed, why it matters and what it could mean next.';

/** All entry points use the same visibility, ordering and page-size contract. */
export function aiPulseEntries(entries: CollectionEntry<'insights'>[]) {
  return sortByDateDesc(publicOnly(entries).filter((entry) => entry.data.category === 'ai-pulse'));
}

export function aiPulsePageCount(count: number): number {
  return Math.max(1, Math.ceil(count / AI_PULSE_PAGE_SIZE));
}

export function aiPulseDateLabel(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Dubai',
  }) + ' GST (UTC+4)';
}
