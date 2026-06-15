// src/lib/status.ts
// Status workflow helpers. The four states are linear with one rollback each.
// Used by both the admin UI and the automation scripts.

import {
  INSIGHT_STATUSES,
  STATUS_TRANSITIONS,
  type InsightStatus,
} from '../content.config';

export type StatusInfo = {
  status: InsightStatus;
  label: string;
  description: string;
  /** Hex color used in the status pill (kept minimal — no color lib). */
  color: string;
  /** Tailwind-friendly background + text class for the pill. */
  pillClass: string;
};

export const STATUS_INFO: Record<InsightStatus, StatusInfo> = {
  draft: {
    status: 'draft',
    label: 'Draft',
    description: 'Work in progress. Not visible to the public.',
    color: '#6B6B6B',
    pillClass: 'pill-draft',
  },
  review: {
    status: 'review',
    label: 'In Review',
    description: 'Submitted for editorial review.',
    color: '#B45309',
    pillClass: 'pill-review',
  },
  scheduled: {
    status: 'scheduled',
    label: 'Scheduled',
    description: 'Approved and queued for auto-publish on the scheduled date.',
    color: '#1D4ED8',
    pillClass: 'pill-scheduled',
  },
  published: {
    status: 'published',
    label: 'Published',
    description: 'Live on the public site.',
    color: '#15803D',
    pillClass: 'pill-published',
  },
};

export function statusInfo(status: InsightStatus): StatusInfo {
  return STATUS_INFO[status];
}

/** Return the statuses that this one can transition to. */
export function nextStatuses(from: InsightStatus): InsightStatus[] {
  return STATUS_TRANSITIONS[from];
}

/** Is the requested transition allowed? */
export function canTransition(from: InsightStatus, to: InsightStatus): boolean {
  if (from === to) return false;
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Throw a clean error if the transition is illegal. */
export function assertTransition(from: InsightStatus, to: InsightStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal status transition: ${from} → ${to}. ` +
      `From ${from} you can move to: ${nextStatuses(from).join(', ') || '(no outgoing transitions)'}.`);
  }
}

/** Compute a default next status for the admin "Advance" button. */
export function defaultAdvance(from: InsightStatus): InsightStatus | null {
  const opts = nextStatuses(from);
  if (from === 'draft') return 'review';
  if (from === 'review') return 'scheduled';
  if (from === 'scheduled') return 'published';
  return null;
}

export const ALL_STATUSES = INSIGHT_STATUSES;
