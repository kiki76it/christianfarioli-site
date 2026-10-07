// The same editorial contract runs before date coercion, at build and at intake.
export const AI_PULSE_AUTHOR = 'Prof. Christian Farioli';
export const AI_PULSE_SECTIONS = ['What happened', 'Why it matters', 'The bigger shift', 'My take'];

/** Require an actual calendar date, clock time and explicit timezone. */
export function isOffsetTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, y, m, d, h, min, sec, zone] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > days || Number(h) > 23 || Number(min) > 59 || Number(sec) > 59) return false;
  return zone === 'Z' || (Number(zone.slice(1, 3)) <= 14 && Number(zone.slice(4)) <= 59 && (Number(zone.slice(1, 3)) < 14 || zone.endsWith(':00')));
}

export function isWebUrl(value) {
  try {
    const url = new URL(value);
    return typeof value === 'string' && ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

/** @param {any} data @param {string | undefined} [body] @param {{allowDates?: boolean, now?: Date}} [options] */
export function aiPulseErrors(data, body, { allowDates = false, now = new Date() } = {}) {
  if (data?.category !== 'ai-pulse') return [];
  const errors = [];
  const timestamp = (value) => isOffsetTimestamp(value) || (allowDates && value instanceof Date && Number.isFinite(value.getTime()));
  if (data.author?.name !== AI_PULSE_AUTHOR) errors.push(`AI Pulse author must be ${AI_PULSE_AUTHOR}`);
  if (data.schemaType !== undefined && data.schemaType !== 'NewsArticle') errors.push('AI Pulse schemaType must be NewsArticle');
  if (!Array.isArray(data.sources) || !data.sources.length) errors.push('AI Pulse requires at least one attributed source');
  else data.sources.forEach((source, index) => {
    if (!source || typeof source.name !== 'string' || !source.name.trim() || !isWebUrl(source.url) || (source.title !== undefined && (typeof source.title !== 'string' || !source.title.trim()))) {
      errors.push(`AI Pulse source ${index + 1} requires a name, HTTP(S) URL and a nonempty title when supplied`);
    }
  });
  if (data.internalTest && data.status !== 'draft') errors.push('An internal test must remain a draft; replace it with verified editorial content before review');
  if (data.status === 'published' && !data.publishedAt) errors.push('Published AI Pulse requires publishedAt');
  if (data.status === 'scheduled' && !data.scheduledFor) errors.push('Scheduled AI Pulse requires scheduledFor');
  for (const field of ['publishedAt', 'scheduledFor', 'updatedAt']) {
    if (data[field] !== undefined && !timestamp(data[field])) errors.push(`AI Pulse ${field} must be a quoted ISO date and time with seconds and a timezone (e.g. 2026-10-07T07:00:00+04:00)`);
  }
  if (data.status === 'scheduled' && data.publishedAt && data.scheduledFor
    && new Date(data.publishedAt).getTime() !== new Date(data.scheduledFor).getTime()) {
    errors.push('Scheduled AI Pulse publishedAt and scheduledFor must represent the same instant when both are supplied');
  }
  if (data.updatedAt !== undefined) {
    const published = data.publishedAt ?? data.scheduledFor;
    if (!published || !(new Date(data.updatedAt).getTime() > new Date(published).getTime())) errors.push('AI Pulse updatedAt must follow its publication time and represent a meaningful editorial update');
    if (new Date(data.updatedAt).getTime() > now.getTime()) errors.push('AI Pulse updatedAt cannot be in the future; record only a completed editorial update');
  }
  if (typeof body === 'string') {
    // Do not let commented examples or code blocks satisfy the article structure.
    const prose = body.replace(/<!--[\s\S]*?-->/g, '').replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '');
    const headings = [...prose.matchAll(/^##[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)];
    let previous = -1;
    for (const section of AI_PULSE_SECTIONS) {
      const found = headings.filter((heading) => heading[1].trim() === section);
      if (found.length !== 1) errors.push(`AI Pulse requires exactly one H2: ${section}`);
      else {
        const heading = found[0];
        if (heading.index < previous) errors.push('AI Pulse sections must follow the required editorial order');
        previous = heading.index;
        const next = headings.find((item) => item.index > heading.index)?.index ?? prose.length;
        if (!prose.slice(heading.index + heading[0].length, next).trim()) errors.push(`AI Pulse section ${section} must contain editorial text`);
      }
    }
    if (headings.some((heading) => heading[1].trim().toLowerCase() === 'sources')) errors.push('Sources is rendered from frontmatter; remove the duplicate body heading');
  }
  return errors;
}

/** @param {any} data @param {string | undefined} [body] @param {{allowDates?: boolean, now?: Date}} [options] */
export function assertAiPulse(data, body, options) {
  const errors = aiPulseErrors(data, body, options);
  if (errors.length) throw new Error(errors.join('\n'));
}
