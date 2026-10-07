// Narrow GitHub client. Credentials stay in memory and are never included in errors.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

export const REPOSITORY = 'kiki76it/christianfarioli-site';
export const ORIGIN = `https://github.com/${REPOSITORY}.git`;
export const REQUIRED_CHECKS = ['build', 'Cloudflare Pages: christianfarioli-main', 'Cloudflare Pages: christianfarioli-insights'];
export function git(repository, args, {input, env = {}} = {}) {
  const result = spawnSync('git', ['-c',`safe.directory=${repository.replaceAll('\\','/')}`,...args], {cwd:repository, input, encoding:'utf8', windowsHide:true, timeout:120000,
    env:{...process.env, GIT_TERMINAL_PROMPT:'0', GCM_INTERACTIVE:'Never', ...env}});
  // Git stderr can include remote URLs. Never echo it into unattended logs.
  assert.equal(result.status, 0, `Git operation failed: ${args[0]}`);
  return result.stdout;
}
export function githubClient(repository) {
  const raw = git(repository, ['credential','fill'], {input:'protocol=https\nhost=github.com\n\n'});
  const token = raw.split(/\r?\n/).find(line => line.startsWith('password='))?.slice(9);
  assert.ok(token, 'GitHub credential unavailable');
  return async (route, method = 'GET', body) => {
    assert.ok(route === '' || route.startsWith('/'), 'Invalid API route');
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${route}`, {
      method, signal:AbortSignal.timeout(30000),
      headers:{Authorization:`Bearer ${token}`, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', 'Content-Type':'application/json'},
      ...(body === undefined ? {} : {body:JSON.stringify(body)})
    });
    if (!response.ok) throw new Error(`GitHub ${method} failed (${response.status}); publication retained for review/resume`);
    return response.status === 204 ? null : response.json();
  };
}
export function checkGate(checks, sha) {
  assert.ok(checks.total_count <= 100, 'Too many checks for a bounded audit');
  const pending = [];
  for (const name of REQUIRED_CHECKS) {
    const latest = checks.check_runs.filter(check => check.name === name).sort((a,b) => b.id-a.id)[0];
    if (!latest) { pending.push(name); continue; }
    assert.equal(latest.head_sha, sha, 'Check belongs to another commit');
    assert.equal(latest.app?.id, name==='build'?15368:85455, 'Required check has an unexpected publisher');
    if (latest.status !== 'completed') { pending.push(name); continue; }
    assert.equal(latest.conclusion, 'success', `Required check failed: ${name}`);
  }
  return pending;
}
export function verifyPullRequest(pr, files, record) {
  assert.equal(pr.head.repo?.full_name, REPOSITORY, 'Unexpected PR head repository');
  assert.equal(pr.base.repo?.full_name, REPOSITORY, 'Unexpected PR base repository');
  assert.equal(pr.base.ref, 'main', 'Unexpected PR base');
  assert.equal(pr.head.ref, record.branch, 'Unexpected PR branch');
  assert.equal(pr.head.sha, record.headSHA, 'PR head changed; manual review required');
  assert.equal(pr.changed_files, 1, 'PR must change exactly one file');
  assert.equal(files.length, 1, 'PR must contain exactly one file');
  assert.equal(files[0].filename, record.relativePath, 'PR contains an unapproved file');
  assert.equal(files[0].status, 'added', 'Publisher only adds new articles');
  assert.equal(files[0].sha, record.blobSHA, 'PR article differs from the approved publication');
  assert.equal(pr.draft, false, 'Unexpected draft PR');
}
