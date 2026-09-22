import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import { INSIGHT_REDIRECTS, insightRedirectPath } from '../src/lib/insight-redirects.mjs';

const root = new URL('../', import.meta.url);
const body = (text) => text.split('---').slice(2).join('---').replace(/\s+/g, ' ').trim();

test('consolidated imports have the same body as their retained originals', async () => {
  for (const [duplicate, original] of Object.entries(INSIGHT_REDIRECTS)) {
    const [a, b] = await Promise.all([duplicate, original].map((id) =>
      readFile(new URL(`src/content/insights/${id}.md`, root), 'utf8')));
    assert.equal(body(a), body(b), duplicate);
  }
});

test('redirect matching is limited to the three exact article paths', () => {
  for (const [duplicate, original] of Object.entries(INSIGHT_REDIRECTS)) {
    assert.equal(insightRedirectPath(`/insights/${duplicate}/`), `/insights/${original}/`);
    assert.equal(insightRedirectPath(`/insights/${duplicate}`), `/insights/${original}/`);
    assert.equal(insightRedirectPath(`/insights/${original}/`), null);
    assert.equal(insightRedirectPath(`/insights/${duplicate}/extra/`), null);
  }
  for (const path of ['/', '/insights/', '/insights/admin/', '/admin/', '/insights/unknown/', '/insights/toString/']) {
    assert.equal(insightRedirectPath(path), null, path);
  }
});

test('middleware redirects permanently, preserves query strings, and retains normal routing and admin auth', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'cf-seo-middleware-'));
  try {
    const result = await build({
      entryPoints: [fileURLToPath(new URL('functions/_middleware.ts', root))],
      bundle: true, platform: 'node', format: 'esm', write: false,
      define: { 'import.meta.env.DEV': 'false' },
    });
    const target = join(temp, 'middleware.mjs');
    await writeFile(target, result.outputFiles[0].text);
    const { onRequest } = await import(pathToFileURL(target));
    const next = () => new Response('static content');
    for (const [duplicate, original] of Object.entries(INSIGHT_REDIRECTS)) {
      const response = await onRequest({ request: new Request(`https://christianfarioli.com/insights/${duplicate}/?utm_source=test`), env: {}, next });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('location'), `https://christianfarioli.com/insights/${original}/?utm_source=test`);
    }
    for (const path of ['/', '/insights/', '/insights/advanced-strategies/seo-companies-in-dubai/']) {
      const response = await onRequest({ request: new Request(`https://christianfarioli.com${path}`), env: {}, next });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'static content');
    }
    const locked = await onRequest({ request: new Request('https://christianfarioli.com/insights/admin/'), env: { ADMIN_PASSWORD: 'test-password' }, next });
    assert.equal(locked.status, 401);
  } finally {
    assert.equal(resolve(dirname(temp)), resolve(tmpdir()));
    assert.ok(basename(temp).startsWith('cf-seo-middleware-'));
    await rm(temp, { recursive: true, force: true });
  }
});
