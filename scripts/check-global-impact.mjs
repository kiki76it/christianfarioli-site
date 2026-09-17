import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createContext, Script } from 'node:vm';

const controller = new Script(readFileSync(new URL('../main-site/js/global-impact.js', import.meta.url), 'utf8'));
const authoredValues = ['30', '20,000', '200', '20', '3', '50'];

function harness({ values = authoredValues, reducedMotion = false, hasObserver = true } = {}) {
  const elements = values.map(textContent => ({ textContent, dataset: {} }));
  const observers = [];
  const frames = new Map();
  const documentEvents = new Map();
  const windowEvents = new Map();
  const motionEvents = new Map();
  let now = 0;
  let nextFrame = 0;
  const motion = {
    matches: reducedMotion,
    addEventListener: (name, callback) => motionEvents.set(name, callback),
  };
  const document = {
    hidden: false,
    querySelectorAll(selector) {
      assert.equal(selector, '.stats .stat-number span');
      return elements;
    },
    addEventListener: (name, callback) => documentEvents.set(name, callback),
  };
  const context = createContext({
    document,
    performance: { now: () => now },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    window: {
      matchMedia: () => motion,
      addEventListener: (name, callback) => windowEvents.set(name, callback),
    },
    ...(hasObserver ? {
      IntersectionObserver: class {
        constructor(callback) { this.callback = callback; this.observed = new Set(); observers.push(this); }
        observe(element) { this.observed.add(element); }
        unobserve(element) { this.observed.delete(element); }
        disconnect() { this.observed.clear(); }
      },
    } : {}),
  });
  const load = () => controller.runInContext(context);
  load();
  return {
    elements, observers, frames, motion,
    load,
    labels: () => elements.map(element => element.textContent),
    intersect(isIntersecting = true) {
      // Deliberately permit a repeated queued observer notification after
      // unobserve, as a browser may already have collected that notification.
      observers.forEach(observer => observer.callback(elements.map(target => ({ target, isIntersecting }))));
    },
    tick(timestamp) {
      now = timestamp;
      const batch = [...frames];
      for (const [id, callback] of batch) {
        if (!frames.delete(id)) continue;
        callback(timestamp);
      }
    },
    hide() { document.hidden = true; documentEvents.get('visibilitychange')?.(); },
    pagehide() { windowEvents.get('pagehide')?.(); },
    reduceMotion() { motion.matches = true; motionEvents.get('change')?.(); },
  };
}

for (const hz of [60, 90, 120, 144]) {
  test(`all six authored totals finish correctly at ${hz} Hz`, () => {
    const page = harness();
    assert.deepEqual(page.labels(), authoredValues, 'correct figures remain visible before intersection');
    assert.equal(page.observers.length, 1);
    page.intersect();
    for (let frame = 0; frame <= hz * 4; frame += 1) page.tick(frame * 1000 / hz);
    assert.deepEqual(page.labels(), authoredValues);
    assert.equal(page.frames.size, 0, 'completed counters leave no animation loops');
  });
}

test('repeated intersections and duplicate script loading never restart counters', () => {
  const page = harness();
  page.intersect(false);
  assert.equal(page.frames.size, 0);
  page.intersect();
  page.tick(400);
  const inProgress = page.labels();
  assert.notDeepEqual(inProgress, authoredValues);
  assert.equal(page.frames.size, authoredValues.length);
  page.load();
  page.intersect();
  assert.equal(page.observers.length, 1);
  assert.equal(page.frames.size, authoredValues.length);
  assert.deepEqual(page.labels(), inProgress);
  page.tick(2000);
  page.intersect();
  assert.deepEqual(page.labels(), authoredValues);
  assert.equal(page.frames.size, 0);
});

test('captures authored totals before any later display changes', () => {
  const page = harness();
  page.elements.forEach(element => { element.textContent = '0'; });
  page.intersect();
  page.tick(2000);
  assert.deepEqual(page.labels(), authoredValues);
});

test('zero values remain static without scheduling an endless animation', () => {
  const page = harness({ values: ['0'] });
  page.intersect();
  page.tick(4000);
  assert.deepEqual(page.labels(), ['0']);
  assert.equal(page.frames.size, 0);
});

test('reduced motion preserves static totals and schedules no animation', () => {
  const page = harness({ reducedMotion: true });
  assert.deepEqual(page.labels(), authoredValues);
  assert.equal(page.observers.length, 0);
  assert.equal(page.frames.size, 0);
});

test('missing IntersectionObserver preserves the authored static totals', () => {
  const page = harness({ hasObserver: false });
  assert.deepEqual(page.labels(), authoredValues);
  assert.equal(page.frames.size, 0);
});

test('a large timestamp jump finishes every counter with its original formatting', () => {
  const page = harness();
  page.intersect();
  page.tick(0);
  page.tick(10000);
  assert.deepEqual(page.labels(), authoredValues);
  assert.equal(page.frames.size, 0);
});

test('backgrounding, leaving the page or enabling reduced motion settles partial values', () => {
  for (const event of ['hide', 'pagehide', 'reduceMotion']) {
    const page = harness();
    page.intersect();
    page.tick(400);
    assert.notDeepEqual(page.labels(), authoredValues);
    page[event]();
    assert.deepEqual(page.labels(), authoredValues, event);
    assert.equal(page.frames.size, 0, event);
  }
});
