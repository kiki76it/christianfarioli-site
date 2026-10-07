#!/usr/bin/env node
// Deterministic promotion of one imported, revalidated AI Pulse draft. No model calls.
import assert from 'node:assert/strict';
import {existsSync, lstatSync, readFileSync, readdirSync, realpathSync} from 'node:fs';
import {mkdir, open, rename, unlink, writeFile} from 'node:fs/promises';
import {basename, dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import {parse} from 'parse5';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {assertAiPulse, isOffsetTimestamp} from '../src/lib/ai-pulse.mjs';
import {isRedirectedInsight} from '../src/lib/insight-redirects.mjs';
import {accessedSourceUrls, dubaiDate, readJson, selectPack, sha256, validateResult} from './ai-pulse-daily-core.mjs';
import {checkGate, git, githubClient, ORIGIN, REPOSITORY, verifyPullRequest} from './github-ai-pulse.mjs';

export const AUTOMATION_BRANCH = 'automation/ai-pulse-daily';
const scriptRepository = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const same = (a,b) => resolve(a).toLowerCase() === resolve(b).toLowerCase();
const within = (child,parent) => resolve(child).toLowerCase().startsWith(resolve(parent).toLowerCase()+sep);
function destination(path) {
  let current=resolve(path); const parts=[];
  while(!existsSync(current)){parts.unshift(basename(current)); const parent=dirname(current); assert.notEqual(parent,current); current=parent;}
  return resolve(realpathSync(current),...parts);
}
export function publicationPaths(config, repository=scriptRepository) {
  assert.equal(config.mode,'draft','Generator must remain in draft mode');
  assert.equal(config.publication?.enabled,true,'Publication is not enabled in this configuration');
  assert.equal(config.publication.expectedBranch,AUTOMATION_BRANCH,'Unexpected automation branch');
  assert.ok(typeof config.startDate==='string' && /^\d{4}-\d{2}-\d{2}$/.test(config.startDate) && new Date(config.startDate).toISOString().slice(0,10)===config.startDate,'Invalid start date');
  for(const key of ['repositoryPath']) assert.equal(typeof config.publication[key],'string',`Missing publication.${key}`);
  for(const key of ['contentRoot','sourceDirectory','stateDirectory']) assert.equal(typeof config[key],'string',`Missing ${key}`);
  const repo=realpathSync(config.publication.repositoryPath);
  assert.ok(same(repo,repository),'Publisher must run from its configured isolated checkout');
  const content=realpathSync(config.contentRoot), source=realpathSync(config.sourceDirectory), state=destination(config.stateDirectory);
  assert.ok(same(content,join(repo,'src/content/insights')),'Publication contentRoot must be this checkout\'s Insights directory');
  const overlaps=(a,b)=>same(a,b)||within(a,b)||within(b,a);
  assert.ok(!overlaps(state,repo) && !overlaps(state,source) && !overlaps(source,repo),'Repository, Dropbox source and state must be separate');
  const pulse=join(content,'ai-pulse');
  assert.ok(!existsSync(pulse) || (!lstatSync(pulse).isSymbolicLink() && same(realpathSync(pulse),pulse)),'AI Pulse directory cannot be redirected');
  return {repo,content,source,state,startDate:config.startDate};
}
function verifyIdentity(paths) {
  assert.ok(git(paths.repo,['remote','get-url','origin']).trim()===ORIGIN,'Unexpected origin');
  assert.ok(git(paths.repo,['remote','get-url','--push','origin']).trim()===ORIGIN,'Unexpected push origin');
  assert.equal(git(paths.repo,['branch','--show-current']).trim(),AUTOMATION_BRANCH,'Unexpected checkout branch');
}
export function verifyCheckout(paths, allowedDraft) {
  verifyIdentity(paths);
  const changes=git(paths.repo,['status','--porcelain=v1','-z','--untracked-files=all']).split('\0').filter(Boolean);
  assert.ok(changes.every(line=>allowedDraft && line===`?? ${allowedDraft}`),'Automation checkout is dirty; no automatic reset, stash or staging');
}
export function promoteDraft(markdown, edition, publishedAt) {
  assert.ok(isOffsetTimestamp(publishedAt) && Date.parse(publishedAt)<=Date.now(),'Use a real, current publication timestamp');
  const parsed=matter(markdown), data=parsed.data;
  assert.equal(data.category,'ai-pulse'); assert.equal(data.status,'draft');
  assert.ok(!data.internalTest,'Internal test drafts cannot publish');
  for(const key of ['publishedAt','updatedAt','reviewedAt','reviewedBy','scheduledFor','sourceEditionDate']) assert.ok(!(key in data),`Draft contains ${key}`);
  const promoted={...data,status:'published',draft:false,publishedAt,sourceEditionDate:edition};
  assertAiPulse(promoted,parsed.content);
  return matter.stringify(parsed.content,promoted);
}
function catalog(paths, excludedId) {
  const images=readJson(join(paths.repo,'scripts/ai-pulse-image-catalog.json'));
  for(const image of images) assert.ok(existsSync(join(paths.repo,'public',image.path)),'Approved image missing');
  const related=[],existingTitles=[];
  function walk(dir) {for(const entry of readdirSync(dir,{withFileTypes:true})){
    const file=join(dir,entry.name);
    if(entry.isDirectory())walk(file);
    else if(/\.mdx?$/.test(entry.name)){
      const {data}=matter(readFileSync(file,'utf8'));
      const id=file.slice(paths.content.length+1).replaceAll('\\','/').replace(/\.mdx?$/,'');
      if(id!==excludedId)existingTitles.push(data.title);
      const due=data.status==='published'||(data.status==='scheduled'&&data.scheduledFor&&Date.parse(data.scheduledFor)<=Date.now());
      if(due&&!data.draft&&!data.internalTest&&!isRedirectedInsight(id)&&data.category!=='ai-pulse')related.push({id,title:data.title});
    }
  }}
  walk(paths.content); return {images,related,existingTitles};
}
export function validateImported(paths, edition, record, archivedDraft) {
  assert.ok(typeof edition==='string' && /^\d{4}-\d{2}-\d{2}$/.test(edition) && Number.isFinite(Date.parse(edition)) && new Date(edition).toISOString().slice(0,10)===edition,'Invalid edition date');
  assert.ok(edition>=paths.startDate && edition<=dubaiDate(),'Edition outside authorised runtime dates');
  assert.equal(record.status,'imported','Only successfully imported drafts qualify');
  assert.equal(record.editorialStatus,'machine-checked-draft-awaiting-author-review','Unexpected editorial provenance');
  assert.match(record.id,/^ai-pulse\/[a-z0-9]+(?:-[a-z0-9]+)*$/);
  for(const key of ['packSHA256','articleSHA256','resultSHA256'])assert.match(record[key],/^[a-f0-9]{64}$/);
  const relativePath=`src/content/insights/${record.id}.md`, articlePath=join(paths.repo,relativePath);
  assert.ok(same(record.articlePath,articlePath),'Ledger article path escaped the one-file allowlist');
  assert.ok(!existsSync(articlePath.replace(/\.md$/,'.mdx')),'Conflicting MDX article');
  if(existsSync(articlePath))assert.ok(!lstatSync(articlePath).isSymbolicLink() && same(realpathSync(articlePath),articlePath),'Article cannot be redirected');
  const runDir=realpathSync(record.runDir);
  assert.ok(within(runDir,join(paths.state,'runs',edition)),'Run evidence must belong to this edition and state directory');
  const resultFile=join(runDir,'result.json');
  assert.equal(sha256(readFileSync(resultFile)),record.resultSHA256,'Generator result changed');
  const result=readJson(resultFile);
  const {draft}=validateResult(result,{...catalog(paths,record.id),date:edition});
  assert.equal(record.id,`ai-pulse/${draft.slug}`); assert.equal(record.newsDate,result.newsDate);
  const accessed=accessedSourceUrls(readFileSync(join(runDir,'events.jsonl'),'utf8'));
  for(const source of result.article.sources)assert.ok(accessed.has(source.url),'Source lacks a successful page-open record');
  const files=readdirSync(paths.source,{withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>({name:entry.name,path:join(paths.source,entry.name)}));
  const pack=selectPack(files,edition);
  assert.ok(pack && pack.name===record.packFileName,'Canonical source selection changed');
  assert.equal(sha256(readFileSync(pack.path)),record.packSHA256,'Source pack changed after import');
  assert.equal(sha256(draft.markdown),record.articleSHA256,'Validated Markdown no longer matches ledger');
  const markdown=archivedDraft ?? readFileSync(articlePath,'utf8');
  assert.equal(markdown,draft.markdown,'Draft differs from the exact validated import');
  return {relativePath,articlePath,markdown,title:draft.data.title};
}
async function atomic(file,value) {const temp=file+'.tmp'; await writeFile(temp,JSON.stringify(value,null,2),'utf8'); await rename(temp,file);}
function readPublication(state) {const path=join(state,'publication.json'); const data=existsSync(path)?readJson(path):{version:1,editions:{}}; assert.equal(data.version,1); assert.ok(data.editions&&typeof data.editions==='object'); return data;}
function trackedAt(paths,ref,path) {return git(paths.repo,['ls-tree','-r','--name-only',ref,'--',path]).trim()!=='';}
export function syncMain(paths) {
  verifyCheckout(paths);
  git(paths.repo,['fetch','--no-tags','origin','refs/heads/main:refs/remotes/origin/main']);
  // ff-only preserves unexpected local commits by refusing to reconcile them.
  git(paths.repo,['merge','--ff-only','origin/main']);
  assert.equal(git(paths.repo,['rev-parse','HEAD']).trim(),git(paths.repo,['rev-parse','origin/main']).trim(),'Local branch has commits not present on main');
  verifyCheckout(paths); return git(paths.repo,['rev-parse','HEAD']).trim();
}
export async function createArticleCommit(paths, record) {
  const index=join(paths.state,`publication-index-${record.edition}.tmp`);
  // A interrupted temporary index contains no user data. Do not follow links.
  for(const file of [index,index+'.lock'])if(existsSync(file)){assert.ok(!lstatSync(file).isSymbolicLink(),'Unsafe temporary index');await unlink(file);}
  const env={GIT_INDEX_FILE:index,GIT_AUTHOR_NAME:'kiki76it',GIT_AUTHOR_EMAIL:'55746338+kiki76it@users.noreply.github.com',GIT_COMMITTER_NAME:'kiki76it',GIT_COMMITTER_EMAIL:'55746338+kiki76it@users.noreply.github.com',GIT_AUTHOR_DATE:record.publishedAt,GIT_COMMITTER_DATE:record.publishedAt};
  try {
    git(paths.repo,['read-tree',record.baseSHA],{env});
    const blobSHA=git(paths.repo,['hash-object','-w','--stdin'],{input:record.publishedMarkdown,env}).trim();
    git(paths.repo,['update-index','--add','--cacheinfo',`100644,${blobSHA},${record.relativePath}`],{env});
    const tree=git(paths.repo,['write-tree'],{env}).trim();
    const headSHA=git(paths.repo,['commit-tree',tree,'-p',record.baseSHA],{input:`Publish AI Pulse edition ${record.edition}\n`,env}).trim();
    assert.equal(git(paths.repo,['diff','--name-status',record.baseSHA,headSHA]).trim(),`A\t${record.relativePath}`,'Publication commit escaped its one-file scope');
    assert.equal(sha256(git(paths.repo,['show',`${headSHA}:${record.relativePath}`])),record.publishedSHA256,'Committed article changed');
    return {headSHA,blobSHA};
  } finally {if(existsSync(index))await unlink(index);}
}
export function verifyArticleCommit(paths,record) {
  assert.equal(git(paths.repo,['rev-list','--parents','-n','1',record.headSHA]).trim(),`${record.headSHA} ${record.baseSHA}`,'Publication commit has unexpected parents');
  assert.equal(git(paths.repo,['diff','--name-status',record.baseSHA,record.headSHA]).trim(),`A\t${record.relativePath}`,'Publication commit escaped its one-file scope');
  assert.equal(git(paths.repo,['rev-parse',`${record.headSHA}:${record.relativePath}`]).trim(),record.blobSHA,'Publication blob changed');
  assert.equal(sha256(git(paths.repo,['show',`${record.headSHA}:${record.relativePath}`])),record.publishedSHA256,'Committed article differs from journal');
}
async function protection(api) {
  const [info,rules]=await Promise.all([api(''),api('/branches/main/protection')]);
  assert.equal(info.full_name,REPOSITORY); assert.equal(info.default_branch,'main'); assert.equal(info.allow_squash_merge,true);
  assert.equal(rules.enforce_admins?.enabled,true,'Admin protection must remain enabled');
  assert.equal(rules.required_status_checks?.strict,true,'Main must require an up-to-date build');
  assert.ok(rules.required_status_checks?.checks?.some(check=>check.context==='build'&&check.app_id===15368),'Protected GitHub Actions build missing');
  assert.ok(!rules.allow_force_pushes?.enabled,'Force pushes must remain disabled');
}
export function verifyProductionEvidence(record,{html,sitemap,feed}) {
  const expectedUrl=`https://christianfarioli.com/insights/${record.relativePath.replace(/^src\/content\/insights\//,'').replace(/\.md$/,'')}/`;
  const document=parse(html), nodes=[];
  function walk(node){nodes.push(node);for(const child of node.childNodes||[])walk(child);}walk(document);
  const attr=(node,name)=>node.attrs?.find(item=>item.name===name)?.value;
  const raw=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(raw).join('');
  const canonicals=nodes.filter(node=>node.tagName==='link'&&attr(node,'rel')==='canonical');
  assert.equal(canonicals.length,1,'Production canonical missing or duplicated');
  assert.equal(attr(canonicals[0],'href'),expectedUrl,'Production URL is not the expected article');
  assert.ok(!nodes.some(node=>node.tagName==='meta'&&attr(node,'name')==='robots'&&/noindex/i.test(attr(node,'content')||'')),'Production article is not indexable');
  const list=value=>value===undefined?[]:Array.isArray(value)?value:[value];
  const schemas=nodes.filter(node=>node.tagName==='script'&&attr(node,'type')==='application/ld+json').flatMap(node=>list(JSON.parse(raw(node)))).flatMap(value=>value['@graph']||value);
  const articles=schemas.filter(value=>list(value['@type']).some(type=>['NewsArticle','BlogPosting','Article'].includes(type)));
  assert.equal(articles.length,1,'Production article schema missing or duplicated');
  assert.equal(articles[0]['@type'],'NewsArticle');assert.equal(articles[0].headline,record.title);
  assert.equal(articles[0].url,expectedUrl);assert.equal(articles[0].datePublished,new Date(record.publishedAt).toISOString());
  const h1=nodes.filter(node=>node.tagName==='h1');assert.equal(h1.length,1);assert.equal(raw(h1[0]).trim(),record.title);
  assert.equal(XMLValidator.validate(sitemap),true,'Production sitemap invalid');assert.equal(XMLValidator.validate(feed),true,'Production feed invalid');
  const parser=new XMLParser();
  assert.ok(list(parser.parse(sitemap).urlset?.url).some(item=>item.loc===expectedUrl),'Production sitemap is missing the article');
  const items=list(parser.parse(feed).rss?.channel?.item).filter(item=>item.link===expectedUrl);
  assert.equal(items.length,1,'Production feed is missing or duplicates the article');
  assert.equal(items[0].title,record.title);
  assert.equal(Math.floor(Date.parse(items[0].pubDate)/1000),Math.floor(Date.parse(record.publishedAt)/1000),'Production feed date differs');
  return expectedUrl;
}
export async function verifyProduction(record,save,api,fetchPage=fetch) {
  assert.match(record.mergeSHA,/^[a-f0-9]{40}$/,'Merged commit missing');
  record.liveStatus='pending';
  try {
    const pending=checkGate(await api(`/commits/${record.mergeSHA}/check-runs?per_page=100`),record.mergeSHA);
    if(pending.length){record.livePending=pending;await save();return {status:'pending-deployment',edition:record.edition,pr:record.prUrl,pending};}
    const relative=record.relativePath.replace(/^src\/content\/insights\//,'').replace(/\.md$/,'');
    const urls=[`https://christianfarioli.com/insights/${relative}/`,'https://christianfarioli.com/sitemap.xml','https://christianfarioli.com/insights/ai-pulse/feed.xml'];
    const texts=await Promise.all(urls.map(async url=>{
      const response=await fetchPage(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
      assert.equal(response.status,200,'Production endpoint is not ready');
      assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag')||''),'Production endpoint excludes indexing');
      const text=await response.text();assert.ok(text.length<=5000000,'Production response exceeds verification limit');return text;
    }));
    record.liveUrl=verifyProductionEvidence(record,{html:texts[0],sitemap:texts[1],feed:texts[2]});
    record.liveStatus='verified';record.liveVerifiedAt=new Date().toISOString();delete record.livePending;await save();
    return {status:'live',edition:record.edition,url:record.liveUrl,pr:record.prUrl};
  } catch(error) {
    record.livePending=[error.message];await save();
    return {status:'pending-deployment',edition:record.edition,pr:record.prUrl,reason:error.message};
  }
}
export async function advancePublication(paths, record, save, api, remoteGit=git) {
  verifyCheckout(paths);
  await protection(api);
  if(!record.headSHA){Object.assign(record,await createArticleCommit(paths,record));await save();}
  verifyArticleCommit(paths,record);
  const prs=await api(`/pulls?state=all&head=${encodeURIComponent('kiki76it:'+record.branch)}&base=main&per_page=100`);
  assert.ok(prs.length<=1,'Multiple PRs for one edition require review');
  let pr=prs[0];
  if(pr){
    pr=await api(`/pulls/${pr.number}`);
    verifyPullRequest(pr,await api(`/pulls/${pr.number}/files?per_page=100`),record);
    record.prNumber=pr.number;record.prUrl=pr.html_url;
    if(pr.merged){record.status='merged';record.liveStatus='pending';record.mergeSHA=pr.merge_commit_sha;record.mergedAt=pr.merged_at;await save();return {status:'merged',edition:record.edition,pr:record.prUrl};}
    assert.equal(pr.state,'open','Publication PR was closed without merge; review required');
  }
  // The exact commit/hash is journalled before any remote mutation.
  verifyCheckout(paths); verifyArticleCommit(paths,record);
  const remote=remoteGit(paths.repo,['ls-remote','--heads','origin',`refs/heads/${record.branch}`]).trim();
  if(remote)assert.equal(remote.split(/\s+/)[0],record.headSHA,'Remote publication branch changed');
  else {
    assert.ok(!pr,'An existing PR lost its remote branch; review required');
    assert.ok((record.pushAttempts||0)<2,'Push retry limit reached; inspect journal');
    record.pushAttempts=(record.pushAttempts||0)+1;await save();
    remoteGit(paths.repo,['push','origin',`${record.headSHA}:refs/heads/${record.branch}`]);
  }
  if(!pr){
    assert.ok((record.prAttempts||0)<2,'PR creation retry limit reached; inspect journal');
    record.prAttempts=(record.prAttempts||0)+1;await save();
    pr=await api('/pulls','POST',{title:record.title,head:record.branch,base:'main',body:`Publishes one independently checked AI Pulse article from the ${record.edition} pack.\n\nThe source edition is recorded separately from the release timestamp. Only the validated article is included; the publication waits for the protected build and both Cloudflare checks.\n\nSource pack SHA-256: ${record.packSHA256}\nValidated draft SHA-256: ${record.articleSHA256}`,draft:false});
  }
  record.prNumber=pr.number;record.prUrl=pr.html_url;record.status='pending-checks';await save();
  pr=await api(`/pulls/${record.prNumber}`);
  const files=await api(`/pulls/${record.prNumber}/files?per_page=100`);
  verifyPullRequest(pr,files,record);
  if(pr.merged){record.status='merged';record.liveStatus='pending';record.mergeSHA=pr.merge_commit_sha;record.mergedAt=pr.merged_at;await save();return {status:'merged',edition:record.edition,pr:record.prUrl};}
  assert.equal(pr.state,'open','Publication PR was closed without merge; review required');
  const main=await api('/git/ref/heads/main');
  assert.equal(main.object.sha,record.baseSHA,'Main changed during publication; review/rebase and renewed checks required');
  assert.equal(pr.base.sha,record.baseSHA,'PR base changed');
  const checks=await api(`/commits/${record.headSHA}/check-runs?per_page=100`);
  const pending=checkGate(checks,record.headSHA);
  if(pending.length || pr.mergeable!==true || pr.mergeable_state!=='clean')return {status:'pending-checks',edition:record.edition,pr:record.prUrl,pending};
  await protection(api);
  // Re-read all merge evidence after protection inspection, immediately before merge.
  const [fresh,freshMain,freshChecks,freshFiles]=await Promise.all([api(`/pulls/${record.prNumber}`),api('/git/ref/heads/main'),api(`/commits/${record.headSHA}/check-runs?per_page=100`),api(`/pulls/${record.prNumber}/files?per_page=100`)]);
  verifyPullRequest(fresh,freshFiles,record);
  assert.equal(freshMain.object.sha,record.baseSHA,'Main changed before merge');
  assert.equal(fresh.base.sha,record.baseSHA); assert.equal(fresh.state,'open'); assert.equal(fresh.mergeable,true); assert.equal(fresh.mergeable_state,'clean');
  assert.deepEqual(checkGate(freshChecks,record.headSHA),[],'Checks changed before merge');
  assert.ok((record.mergeAttempts||0)<2,'Merge retry limit reached; inspect journal');
  record.mergeAttempts=(record.mergeAttempts||0)+1; await save();
  const merged=await api(`/pulls/${record.prNumber}/merge`,'PUT',{sha:record.headSHA,merge_method:'squash'});
  assert.equal(merged.merged,true,'Protected merge did not complete');
  record.status='merged';record.liveStatus='pending';record.mergeSHA=merged.sha;record.mergedAt=new Date().toISOString();await save();
  return {status:'merged',edition:record.edition,pr:record.prUrl};
}
export async function publishOnce(paths,{dryRun=false,apiFactory=githubClient}={}) {
  const journal=readPublication(paths.state);
  const ledger=existsSync(join(paths.state,'ledger.json'))?readJson(join(paths.state,'ledger.json')):{editions:{}};
  const active=Object.entries(journal.editions).filter(([,record])=>record.status!=='merged'||record.liveStatus!=='verified');
  assert.ok(active.length<=1,'Only one publication may be active');
  const edition=active[0]?.[0] ?? Object.keys(ledger.editions).sort().find(date=>date>=paths.startDate && ledger.editions[date].status==='imported' && !journal.editions[date]);
  if(!edition){verifyCheckout(paths);return {status:'idle'};}
  let record=journal.editions[edition];
  const imported=ledger.editions[edition];
  const checked=validateImported(paths,edition,imported,record?.draftMarkdown);
  verifyCheckout(paths,checked.relativePath);
  if(record?.status!=='merged')assert.ok(!trackedAt(paths,'HEAD',checked.relativePath),'An existing tracked article cannot be published again');
  if(record){
    assert.ok(['prepared','pending-checks','merged'].includes(record.status),'Unknown publication state');
    for(const key of ['baseSHA','headSHA','blobSHA'])if(record[key])assert.match(record[key],/^[a-f0-9]{40}$/);
    assert.equal(record.edition,edition);assert.equal(record.title,checked.title);assert.equal(record.relativePath,checked.relativePath);assert.equal(record.articleSHA256,imported.articleSHA256);assert.equal(record.packSHA256,imported.packSHA256);
    assert.equal(record.publishedMarkdown,promoteDraft(checked.markdown,edition,record.publishedAt));
    assert.equal(sha256(record.publishedMarkdown),record.publishedSHA256);
    assert.equal(record.branch,`automation/ai-pulse-${edition}-${record.articleSHA256.slice(0,12)}`);
  }
  if(dryRun)return {status:'dry-run-validated',edition,id:imported.id,articleSHA256:imported.articleSHA256,relativePath:checked.relativePath,resuming:!!record};
  const save=()=>atomic(join(paths.state,'publication.json'),journal);
  if(record?.status==='merged')return verifyProduction(record,save,apiFactory(paths.repo));
  if(!record){
    const publishedAt=new Date().toISOString(), publishedMarkdown=promoteDraft(checked.markdown,edition,publishedAt);
    record=journal.editions[edition]={edition,status:'prepared',relativePath:checked.relativePath,title:checked.title,articleSHA256:imported.articleSHA256,packSHA256:imported.packSHA256,draftMarkdown:checked.markdown,publishedMarkdown,publishedSHA256:sha256(publishedMarkdown),publishedAt,branch:`automation/ai-pulse-${edition}-${imported.articleSHA256.slice(0,12)}`};
    await save();
  }
  // This is the sole deletion: an exact, untracked draft already archived in the journal.
  if(existsSync(checked.articlePath)){
    assert.equal(sha256(readFileSync(checked.articlePath)),record.articleSHA256,'Untracked draft changed; preserve it');
    assert.equal(git(paths.repo,['ls-files','--',checked.relativePath]).trim(),'','Never remove a tracked file');
    await unlink(checked.articlePath);
  }
  if(!record.baseSHA){
    record.baseSHA=syncMain(paths);
    assert.ok(!trackedAt(paths,record.baseSHA,checked.relativePath),'Remote article already exists');
    const files=git(paths.repo,['ls-tree','-r','--name-only',record.baseSHA,'--','src/content/insights/ai-pulse']).trim().split('\n').filter(file=>/\.mdx?$/.test(file));
    for(const file of files){const {data}=matter(git(paths.repo,['show',`${record.baseSHA}:${file}`]));assert.notEqual(data.sourceEditionDate,edition,'This edition is already on main');}
    await save();
  }
  const outcome=await advancePublication(paths,record,save,apiFactory(paths.repo));
  return outcome.status==='merged'?{...outcome,status:'pending-deployment'}:outcome;
}
async function main() {
  const args=process.argv.slice(2), index=args.indexOf('--config');
  assert.ok(index>=0&&args[index+1],'Usage: --config absolute.json [--preflight | --dry-run | --sync]');
  const flags=args.filter((_,i)=>i!==index&&i!==index+1);
  assert.ok(flags.length<=1&&flags.every(flag=>['--preflight','--dry-run','--sync'].includes(flag)),'Unexpected publisher arguments');
  const paths=publicationPaths(readJson(resolve(args[index+1])));
  if(flags[0]==='--preflight'){verifyIdentity(paths);console.log(JSON.stringify({status:'publication-paths-validated',stateDirectory:paths.state,repository:paths.repo}));return;}
  if(flags[0]==='--dry-run'){console.log(JSON.stringify(await publishOnce(paths,{dryRun:true})));return;}
  await mkdir(paths.state,{recursive:true});
  let lock;
  try{lock=await open(join(paths.state,'run.lock'),'wx');}catch(error){if(error.code==='EEXIST'){console.log(JSON.stringify({status:'already-running-or-stale-lock'}));return;}throw error;}
  await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString(),operation:'publication'}));
  try {
    if(flags[0]==='--sync')assert.ok(Object.values(readPublication(paths.state).editions).every(record=>record.status==='merged'&&record.liveStatus==='verified'),'Cannot sync while publication or deployment is pending');
    const outcome=flags[0]==='--sync'?{status:'synced',baseSHA:syncMain(paths)}:await publishOnce(paths);
    await atomic(join(paths.state,'publication-last-run.json'),{...outcome,checkedAt:new Date().toISOString()});console.log(JSON.stringify(outcome));
  } finally {await lock.close();await unlink(join(paths.state,'run.lock'));}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
