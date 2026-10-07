import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import matter from 'gray-matter';
import {prepareAiPulseDraft} from './intake-ai-pulse.mjs';
import {sha256,dubaiDate} from './ai-pulse-daily-core.mjs';
import {AUTOMATION_BRANCH,advancePublication,createArticleCommit,publicationPaths,promoteDraft,publishOnce,validateImported,verifyArticleCommit,verifyCheckout,verifyProductionEvidence,verifyProduction} from './publish-ai-pulse-daily.mjs';
import {checkGate,git,ORIGIN,REPOSITORY,REQUIRED_CHECKS,verifyPullRequest} from './github-ai-pulse.mjs';

const edition=dubaiDate();
const sourceUrl='https://example.com/verified-announcement';
const payload={title:'An evidence-backed business announcement for testing',slug:'synthetic-business-announcement',category:'ai-pulse',excerpt:'This synthetic article exists only inside an isolated publisher test fixture.',content:`An isolated synthetic announcement.\n\n${['What happened','Why it matters','The bigger shift','My take'].map(section=>`## ${section}\n\n${'Example '.repeat(118)}`).join('\n\n')}\nRead the [strategy guide](/insights/ai-marketing/strategy/).`,featured_image:'/images/test.jpg',featured_image_alt:'Synthetic test illustration',sources:[{name:'Example source',title:'Announcement',url:sourceUrl}],meta_title:'An evidence-backed business announcement for testing',meta_description:'This synthetic article exists only inside an isolated publisher test fixture.',author:'Prof. Christian Farioli',schema_type:'NewsArticle',internal_links:[{slug:'ai-marketing/strategy'}]};
const draft=prepareAiPulseDraft(payload).markdown;
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'ai-pulse-publisher-'));
  t.after(()=>{assert.ok(resolve(root).startsWith(resolve(tmpdir())+'\\')||resolve(root).startsWith(resolve(tmpdir())+'/'));assert.ok(root.includes('ai-pulse-publisher-'));rmSync(root,{recursive:true,force:true});});
  const repo=join(root,'repo'),state=join(root,'state'),source=join(root,'source'),content=join(repo,'src/content/insights');
  for(const dir of [state,source,join(content,'ai-pulse'),join(content,'ai-marketing'),join(repo,'scripts'),join(repo,'public/images')])mkdirSync(dir,{recursive:true});
  writeFileSync(join(repo,'public/images/test.jpg'),'synthetic asset');
  writeFileSync(join(repo,'scripts/ai-pulse-image-catalog.json'),JSON.stringify([{path:payload.featured_image,alt:payload.featured_image_alt}]));
  writeFileSync(join(content,'ai-marketing/strategy.md'),matter.stringify('Evergreen',{title:'Strategy guide',description:'Example',category:'ai-marketing',status:'published'}));
  writeFileSync(join(repo,'baseline.txt'),'Preserve baseline\n');
  git(repo,['init','--initial-branch',AUTOMATION_BRANCH]);git(repo,['config','user.name','Fixture']);git(repo,['config','user.email','fixture@example.invalid']);git(repo,['config','core.autocrlf','false']);
  git(repo,['add','.']);git(repo,['commit','-m','Synthetic baseline']);git(repo,['remote','add','origin',ORIGIN]);
  const paths={repo,state,source,content,startDate:edition};
  const runDir=join(state,'runs',edition,'fixture');mkdirSync(runDir,{recursive:true});
  const result={status:'ready',issues:[],newsDate:edition,claims:[{fact:'This synthetic fact is used to test source provenance.',sourceUrl,support:'The synthetic evidence supports the local fixture claim.'}],article:payload};
  writeFileSync(join(runDir,'result.json'),JSON.stringify(result));
  writeFileSync(join(runDir,'events.jsonl'),JSON.stringify({type:'item.completed',item:{type:'web_search',action:{type:'open_page'},results:[{type:'text_result',url:sourceUrl,title:'Synthetic announcement'}]}}));
  const packFileName=`Daily Content Pack - ${edition}.md`;writeFileSync(join(source,packFileName),'Synthetic pack - no private content');
  const record={status:'imported',editorialStatus:'machine-checked-draft-awaiting-author-review',id:`ai-pulse/${payload.slug}`,articlePath:join(content,'ai-pulse',payload.slug+'.md'),runDir,newsDate:edition,packFileName,packSHA256:sha256(readFileSync(join(source,packFileName))),resultSHA256:sha256(readFileSync(join(runDir,'result.json'))),articleSHA256:sha256(draft)};
  writeFileSync(record.articlePath,draft);writeFileSync(join(state,'ledger.json'),JSON.stringify({version:1,editions:{[edition]:record}}));
  return {root,paths,record};
}
async function committed(t) {
  const f=fixture(t);rmSync(f.record.articlePath);
  const publishedAt=new Date().toISOString(),publishedMarkdown=promoteDraft(draft,edition,publishedAt);
  const record={edition,title:payload.title,relativePath:`src/content/insights/ai-pulse/${payload.slug}.md`,baseSHA:git(f.paths.repo,['rev-parse','HEAD']).trim(),publishedAt,publishedMarkdown,publishedSHA256:sha256(publishedMarkdown),articleSHA256:sha256(draft),packSHA256:f.record.packSHA256,branch:`automation/ai-pulse-${edition}-${sha256(draft).slice(0,12)}`};
  Object.assign(record,await createArticleCommit(f.paths,record));return {...f,publication:record};
}
const goodChecks=sha=>({total_count:3,check_runs:REQUIRED_CHECKS.map((name,i)=>({id:i+1,name,head_sha:sha,status:'completed',conclusion:'success',app:{id:name==='build'?15368:85455}}))});
function fakeRemote(record,{pending=false,merged=false,exists=true,baseChanged=false}={}) {
  const calls=[];
  let found=exists,isMerged=merged,remote=exists?record.headSHA:'';
  const pr=()=>({number:17,html_url:'https://github.com/'+REPOSITORY+'/pull/17',head:{repo:{full_name:REPOSITORY},ref:record.branch,sha:record.headSHA},base:{repo:{full_name:REPOSITORY},ref:'main',sha:record.baseSHA},changed_files:1,draft:false,state:isMerged?'closed':'open',merged:isMerged,merge_commit_sha:isMerged?'f'.repeat(40):null,merged_at:isMerged?new Date().toISOString():null,mergeable:true,mergeable_state:'clean'});
  const api=async(route,method='GET',body)=>{
    calls.push({route,method,body});
    if(route==='')return {full_name:REPOSITORY,default_branch:'main',allow_squash_merge:true};
    if(route==='/branches/main/protection')return {enforce_admins:{enabled:true},required_status_checks:{strict:true,checks:[{context:'build',app_id:15368}]},allow_force_pushes:{enabled:false}};
    if(route.startsWith('/pulls?'))return found?[pr()]:[];
    if(route==='/pulls'&&method==='POST'){found=true;return pr();}
    if(route==='/pulls/17')return pr();
    if(route==='/pulls/17/files?per_page=100')return [{filename:record.relativePath,status:'added',sha:record.blobSHA}];
    if(route==='/git/ref/heads/main')return {object:{sha:baseChanged?'a'.repeat(40):record.baseSHA}};
    if(route.includes('/check-runs'))return pending?{total_count:0,check_runs:[]}:goodChecks(record.headSHA);
    if(route==='/pulls/17/merge'&&method==='PUT'){assert.equal(body.sha,record.headSHA);assert.equal(body.merge_method,'squash');isMerged=true;return {merged:true,sha:'f'.repeat(40)};}
    throw new Error('Unexpected mock route '+route);
  };
  const remoteGit=(_repo,args)=>{calls.push({git:args});if(args[0]==='ls-remote')return remote?`${remote}\trefs/heads/${record.branch}\n`:'';if(args[0]==='push'){assert.ok(!args.includes('--force'));remote=record.headSHA;return '';}throw new Error('Unexpected remote operation');};
  return {api,remoteGit,calls};
}
test('promotion preserves body and records actual release separately from edition',()=>{
  const timestamp=new Date().toISOString(),before=matter(draft),after=matter(promoteDraft(draft,edition,timestamp));
  assert.equal(after.content,before.content);assert.equal(after.data.status,'published');assert.equal(after.data.draft,false);assert.equal(after.data.sourceEditionDate,edition);assert.equal(after.data.publishedAt,timestamp);assert.ok(!after.data.updatedAt&&!after.data.reviewedAt);
  for(const changes of [{internalTest:true},{updatedAt:timestamp},{reviewedBy:'Someone'},{publishedAt:timestamp}])assert.throws(()=>promoteDraft(matter.stringify(before.content,{...before.data,...changes}),edition,timestamp));
});
test('check gates pin head, app identity and newest result; pending is resumable',()=>{
  const sha='b'.repeat(40);assert.deepEqual(checkGate(goodChecks(sha),sha),[]);
  assert.equal(checkGate({total_count:0,check_runs:[]},sha).length,3);
  for(const change of [{head_sha:'c'.repeat(40)},{app:{id:99}},{conclusion:'failure'}]){const checks=goodChecks(sha);Object.assign(checks.check_runs[1],change);assert.throws(()=>checkGate(checks,sha));}
  const checks=goodChecks(sha);checks.check_runs.push({...checks.check_runs[0],id:10,conclusion:'failure'});checks.total_count++;assert.throws(()=>checkGate(checks,sha));
});
test('dry run validates exact imported evidence without filesystem or remote mutation',async t=>{
  const f=fixture(t),before=git(f.paths.repo,['status','--porcelain=v1']);
  const result=await publishOnce(f.paths,{dryRun:true,apiFactory:()=>{throw new Error('Dry run must not authenticate');}});
  assert.equal(result.status,'dry-run-validated');assert.equal(git(f.paths.repo,['status','--porcelain=v1']),before);assert.ok(!existsSync(join(f.paths.state,'publication.json')));
});
test('changed draft, source, result, escaped evidence or wrong edition all fail closed',t=>{
  const f=fixture(t);validateImported(f.paths,edition,f.record);
  for(const record of [{...f.record,articlePath:join(f.root,'elsewhere.md')},{...f.record,runDir:f.root},{...f.record,articleSHA256:'0'.repeat(64)}])assert.throws(()=>validateImported(f.paths,edition,record));
  assert.throws(()=>validateImported(f.paths,'2026-02-31',f.record));
  writeFileSync(f.record.articlePath,draft+'Changed');assert.throws(()=>validateImported(f.paths,edition,f.record));writeFileSync(f.record.articlePath,draft);
  writeFileSync(join(f.paths.source,f.record.packFileName),'Changed pack');assert.throws(()=>validateImported(f.paths,edition,f.record));
});
test('state/source overlap and wrong checkout root are rejected',t=>{
  const f=fixture(t),config={mode:'draft',startDate:edition,contentRoot:f.paths.content,sourceDirectory:f.paths.source,stateDirectory:f.paths.state,publication:{enabled:true,repositoryPath:f.paths.repo,expectedBranch:AUTOMATION_BRANCH}};
  assert.equal(publicationPaths(config,f.paths.repo).repo,f.paths.repo);
  assert.throws(()=>publicationPaths({...config,stateDirectory:f.paths.source},f.paths.repo));
  assert.throws(()=>publicationPaths({...config,stateDirectory:join(f.paths.repo,'state')},f.paths.repo));
  assert.throws(()=>publicationPaths(config,f.root));
});
test('checkout allows only its exact untracked draft and hides credential-bearing remotes',t=>{
  const f=fixture(t),relative=`src/content/insights/${f.record.id}.md`;
  verifyCheckout(f.paths,relative);assert.throws(()=>verifyCheckout(f.paths));
  writeFileSync(join(f.paths.repo,'baseline.txt'),'Changed');assert.throws(()=>verifyCheckout(f.paths,relative));
  git(f.paths.repo,['remote','set-url','origin','https://hidden-secret@example.com/repo.git']);
  try{verifyCheckout(f.paths,relative);assert.fail('Expected refusal');}catch(error){assert.ok(!error.message.includes('hidden-secret'));}
});
test('isolated index commit adds one article, preserves checkout/index and is deterministic',async t=>{
  const f=await committed(t),before=git(f.paths.repo,['status','--porcelain=v1']);
  verifyArticleCommit(f.paths,f.publication);
  assert.equal(before,'');assert.equal(git(f.paths.repo,['rev-parse','HEAD']).trim(),f.publication.baseSHA);
  assert.equal((await createArticleCommit(f.paths,f.publication)).headSHA,f.publication.headSHA);
  assert.throws(()=>verifyArticleCommit(f.paths,{...f.publication,publishedSHA256:'0'.repeat(64)}));
  assert.equal(git(f.paths.repo,['status','--porcelain=v1']),before);
});
test('PR scope rejects a second file, modified article, foreign head and wrong blob',async t=>{
  const f=await committed(t),mock=fakeRemote(f.publication),pr=await mock.api('/pulls/17'),files=await mock.api('/pulls/17/files?per_page=100');
  verifyPullRequest(pr,files,f.publication);
  assert.throws(()=>verifyPullRequest({...pr,changed_files:2},files,f.publication));
  assert.throws(()=>verifyPullRequest(pr,[{...files[0],status:'modified'}],f.publication));
  assert.throws(()=>verifyPullRequest(pr,[{...files[0],sha:'0'.repeat(40)}],f.publication));
  assert.throws(()=>verifyPullRequest({...pr,head:{...pr.head,sha:'0'.repeat(40)}},files,f.publication));
});
test('new publication pushes non-force once, creates one PR and holds for checks',async t=>{
  const f=await committed(t),mock=fakeRemote(f.publication,{exists:false,pending:true});
  const result=await advancePublication(f.paths,f.publication,async()=>{},mock.api,mock.remoteGit);
  assert.equal(result.status,'pending-checks');assert.equal(mock.calls.filter(c=>c.git?.[0]==='push').length,1);assert.equal(mock.calls.filter(c=>c.route==='/pulls'&&c.method==='POST').length,1);assert.equal(mock.calls.filter(c=>c.route?.endsWith('/merge')).length,0);
});
test('existing green PR merges only exact head after fresh gates',async t=>{
  const f=await committed(t),mock=fakeRemote(f.publication);
  const result=await advancePublication(f.paths,f.publication,async()=>{},mock.api,mock.remoteGit);
  assert.equal(result.status,'merged');assert.equal(mock.calls.filter(c=>c.git?.[0]==='push').length,0);assert.equal(mock.calls.filter(c=>c.route?.includes('/check-runs')).length,2);assert.equal(f.publication.mergeAttempts,1);
});
test('merge crash recovery recognises merged PR without push even with exhausted counters',async t=>{
  const f=await committed(t);f.publication.pushAttempts=2;f.publication.prAttempts=2;f.publication.mergeAttempts=2;
  const mock=fakeRemote(f.publication,{merged:true});
  const result=await advancePublication(f.paths,f.publication,async()=>{},mock.api,()=>{throw new Error('Merged recovery must not touch remote branch');});
  assert.equal(result.status,'merged');assert.equal(mock.calls.filter(c=>c.method!=='GET').length,0);
});
test('changed main and mismatched remote branch hold without merge or force push',async t=>{
  const f=await committed(t),mock=fakeRemote(f.publication,{baseChanged:true});
  await assert.rejects(()=>advancePublication(f.paths,f.publication,async()=>{},mock.api,mock.remoteGit),/Main changed/);
  assert.equal(mock.calls.filter(c=>c.route?.endsWith('/merge')).length,0);
  const second=fakeRemote(f.publication,{exists:false});
  await assert.rejects(()=>advancePublication(f.paths,f.publication,async()=>{},second.api,()=>`other-sha\trefs/heads/${f.publication.branch}`),/Remote publication branch changed/);
});
function productionEvidence(record) {
  const url=`https://christianfarioli.com/insights/${record.relativePath.replace(/^src\/content\/insights\//,'').replace(/\.md$/,'')}/`;
  return {html:`<html><head><link rel="canonical" href="${url}"><script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',headline:record.title,url,datePublished:record.publishedAt})}</script></head><body><h1>${record.title}</h1></body></html>`,sitemap:`<?xml version="1.0"?><urlset><url><loc>${url}</loc></url></urlset>`,feed:`<?xml version="1.0"?><rss><channel><item><title>${record.title}</title><link>${url}</link><pubDate>${new Date(record.publishedAt).toUTCString()}</pubDate></item></channel></rss>`};
}
test('production evidence rejects a status-200 homepage fallback, stale dates and missing feed entry',async t=>{
  const f=await committed(t),evidence=productionEvidence(f.publication);
  assert.match(verifyProductionEvidence(f.publication,evidence),/christianfarioli.com\/insights\/ai-pulse/);
  assert.throws(()=>verifyProductionEvidence(f.publication,{...evidence,html:'<html><link rel="canonical" href="https://christianfarioli.com/"><h1>Home</h1></html>'}));
  assert.throws(()=>verifyProductionEvidence({...f.publication,publishedAt:'2020-01-01T00:00:00Z'},evidence));
  assert.throws(()=>verifyProductionEvidence(f.publication,{...evidence,feed:'<rss><channel></channel></rss>'}));
});
test('merged is pending until exact merge-SHA checks and real output evidence pass',async t=>{
  const f=await committed(t),record={...f.publication,mergeSHA:'f'.repeat(40)},evidence=productionEvidence(f.publication);
  let fetches=0;
  const pending=await verifyProduction(record,async()=>{},async()=>({total_count:0,check_runs:[]}),()=>{throw new Error('Pending checks must not fetch pages');});
  assert.equal(pending.status,'pending-deployment');assert.equal(record.liveStatus,'pending');
  const live=await verifyProduction(record,async()=>{},async()=>goodChecks(record.mergeSHA),async url=>{fetches++;return new Response(url.endsWith('sitemap.xml')?evidence.sitemap:url.endsWith('feed.xml')?evidence.feed:evidence.html,{status:200});});
  assert.equal(live.status,'live');assert.equal(record.liveStatus,'verified');assert.equal(fetches,3);
});
test('stored head tampering fails before remote branch access or mutation',async t=>{
  const f=await committed(t),mock=fakeRemote(f.publication);
  f.publication.headSHA=f.publication.baseSHA;
  await assert.rejects(()=>advancePublication(f.paths,f.publication,async()=>{},mock.api,()=>{throw new Error('No remote mutation permitted');}),/unexpected parents/);
  assert.equal(mock.calls.filter(c=>c.method!=='GET').length,0);
});
