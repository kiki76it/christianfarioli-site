import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { aiPulseRedirectPath, isAdminPath, normalizeRequestPath } from '../src/lib/ai-pulse-routing.mjs';

const adminAliases = [
  '/admin/preview/ai-pulse/test/',
  '/insights/admin/preview/ai-pulse/test/',
  '/insights/%61dmin/preview/ai-pulse/test/',
  '/%69nsights/%61dmin/preview/ai-pulse/test/index.html',
  '/%61dmin%2fpreview%2fai-pulse%2ftest%2f',
  '/insights%2fadmin%2fpreview%2fai-pulse%2ftest%2f',
  '/insights/%2561dmin/preview/ai-pulse/test/',
  '/images/%2e%2e%2finsights%2fadmin%2fpreview%2fai-pulse%2ftest%2f',
  '/images/%252e%252e%252finsights%252fadmin%252fpreview%252fai-pulse%252ftest%252f',
  '/insights//admin/preview/ai-pulse/test/',
  '/insights%5cadmin%5cpreview%5cai-pulse%5ctest%5c',
];

test('AI Pulse aliases converge without redirecting other categories or articles', () => {
  for (const alias of ['/category/ai-pulse/', '/insights/category/ai-pulse', '/insights/category/ai-pulse/', '/insights/ai-pulse/page/1/']) {
    assert.equal(aiPulseRedirectPath(alias), '/insights/ai-pulse/');
  }
  assert.equal(aiPulseRedirectPath('/insights/editorial-policy/'), '/editorial-policy/');
  assert.equal(aiPulseRedirectPath('/insights/ai-pulse/feed/'), '/insights/ai-pulse/feed.xml');
  assert.equal(aiPulseRedirectPath('/ai-pulse/feed.xml'), '/insights/ai-pulse/feed.xml');
  for (const path of ['/insights/', '/insights/ai-pulse/', '/insights/category/aiso/', '/insights/ai-pulse/story/']) {
    assert.equal(aiPulseRedirectPath(path), null);
  }
});

test('encoded paths normalize before access control and malformed paths fail closed', () => {
  for (const path of adminAliases) assert.ok(isAdminPath(path), `Unprotected admin spelling: ${path}`);
  assert.equal(normalizeRequestPath('/images/%2e%2e/insights/admin/'), '/insights/admin/');
  assert.equal(normalizeRequestPath('/images/%252e%252e%252finsights%252fadmin/'), '/insights/admin/');
  for (const path of ['/insights/%', '/insights/%GG', '/insights/%00admin/', '/insights/%E0%A4%A', '/%252525252561dmin/']) assert.equal(normalizeRequestPath(path), null);
});

test('Function routes cover encoded admin paths while normal static assets remain excluded', async () => {
  const routes = JSON.parse(await readFile(new URL('../public/_routes.json', import.meta.url), 'utf8'));
  assert.deepEqual(routes.include, ['/*']);
  const matches = (pattern, pathname) => new RegExp('^' + pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(pathname);
  for (const path of adminAliases) {
    assert.ok(!routes.exclude.some((pattern) => matches(pattern, path)), `Route exclusion bypass: ${path}`);
  }
  for (const path of ['/_astro/article.hash.js', '/_astro/article.hash.css', '/images/author.jpg', '/insights/images/author.webp']) {
    assert.ok(routes.exclude.some((pattern) => matches(pattern, path)), `Unexpected Function execution for asset: ${path}`);
  }
});

test('admin aliases are protected without catching unrelated article slugs', () => {
  for (const path of ['/admin', '/admin/', '/admin/preview/ai-pulse/test/index.html', '/insights/admin', '/insights/admin/preview/ai-pulse/test/']) assert.ok(isAdminPath(path));
  for (const path of ['/insights/ai-pulse/administration/', '/insights/ai-pulse/', '/administrator/']) assert.equal(isAdminPath(path), false);
});

test('deployed middleware locks both admin namespaces and preserves successful responses', async () => {
  const middlewareUrl = new URL('../functions/_middleware.ts', import.meta.url);
  const source = (await readFile(middlewareUrl, 'utf8')).replace(/from '(\.\.?\/[^']+)'/g,
    (_, specifier) => `from '${new URL(specifier, middlewareUrl).href}'`);
  // Transpile in memory without writing build output or scanning parent dirs.
  const compiled = await transform(source, { loader: 'ts', format: 'esm' });
  const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(compiled.code).toString('base64'));
  const env = { ADMIN_USERNAME: 'qa-editor', ADMIN_PASSWORD: 'qa-only-not-a-real-secret' };
  let calls = 0;
  const next = () => { calls++; return new Response('protected draft content', { status: 200, headers: { 'content-type': 'text/html' } }); };
  for (const path of adminAliases) {
    const url = 'https://christianfarioli.com' + path;
    calls = 0;
    const absent = await onRequest({ request: new Request(url), env: {}, next });
    assert.equal(absent.status, 503);
    const denied = await onRequest({ request: new Request(url), env, next });
    assert.equal(denied.status, 401);
    assert.match(denied.headers.get('x-robots-tag'), /noindex/);
    assert.equal(calls, 0);
    const accepted = await onRequest({ request: new Request(url, { headers: { Authorization: 'Basic ' + btoa('qa-editor:qa-only-not-a-real-secret') } }), env, next });
    assert.equal(accepted.status, 200);
    assert.equal(await accepted.text(), 'protected draft content');
    assert.match(accepted.headers.get('cache-control'), /no-store/);
    assert.equal(calls, 1);
  }
  for (const path of ['/insights/%', '/insights/%GG', '/insights/%00admin/']) {
    calls = 0;
    const malformed = await onRequest({ request: new Request(`https://christianfarioli.com${path}`), env, next });
    assert.equal(malformed.status, 400);
    assert.equal(calls, 0);
  }
  const redirect = await onRequest({ request: new Request('https://christianfarioli.com/insights/category/ai-pulse/?ref=qa'), env, next });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), 'https://christianfarioli.com/insights/ai-pulse/?ref=qa');
});
