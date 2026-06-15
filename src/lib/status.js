// src/lib/status.js
// Runtime-friendly copy of src/lib/status.ts for use by automation scripts.
// Mirrors src/lib/status.ts — keep in sync.

import { INSIGHT_STATUSES } from './status-types.js';

export const STATUS_TRANSITIONS = {
  draft:     ['review'],
  review:    ['draft', 'scheduled'],
  scheduled: ['draft', 'published'],
  published: ['draft'],
};

export const STATUS_INFO = {
  draft:     { status: 'draft',     label: 'Draft',     description: 'Work in progress. Not visible to the public.',     pillClass: 'pill-draft' },
  review:    { status: 'review',    label: 'In Review', description: 'Submitted for editorial review.',                  pillClass: 'pill-review' },
  scheduled: { status: 'scheduled', label: 'Scheduled', description: 'Approved and queued for auto-publish on the scheduled date.', pillClass: 'pill-scheduled' },
  published: { status: 'published', label: 'Published', description: 'Live on the public site.',                          pillClass: 'pill-published' },
};

export function statusInfo(status) {
  return STATUS_INFO[status];
}

export function nextStatuses(from) {
  return STATUS_TRANSITIONS[from] || [];
}

export function canTransition(from, to) {
  if (from === to) return false;
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal status transition: ${from} → ${to}. ` +
      `From ${from} you can move to: ${nextStatuses(from).join(', ') || '(none)'}.`);
  }
}

export function defaultAdvance(from) {
  if (from === 'draft') return 'review';
  if (from === 'review') return 'scheduled';
  if (from === 'scheduled') return 'published';
  return null;
}

export { INSIGHT_STATUSES };
