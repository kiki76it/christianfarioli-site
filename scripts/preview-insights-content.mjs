#!/usr/bin/env node
// Build an isolated, loopback-only editorial review copy. Source drafts and
// production visibility rules are never changed. No deploy or push capability.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createReadStream,createWriteStream} from 'node:fs';
import {cp,mkdir,mkdtemp,readFile,realpath,stat,symlink,writeFile} from 'node:fs/promises';
import http from 'node:http';
import {tmpdir} from 'node:os';
import {dirname,extname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {INSIGHTS_CONTENT_BATCH} from '../src/lib/insights-content-cta.mjs';

const source=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const port=Number(process.env.INSIGHTS_REVIEW_PORT || 8795);
assert.ok(Number.isInteger(port) && port>=1024 && port<=65535);
const pulseIndexPath=join(source,'docs/ai-pulse-archive-index.json');
const pulseIndex=await stat(pulseIndexPath).then(()=>readFile(pulseIndexPath,'utf8')).then(JSON.parse).catch(error=>{
  if(error.code==='ENOENT')return {records:[]};
  throw error;
});
const pulseRecords=pulseIndex.records.filter(record=>record.status==='draft' && record.id);
assert.ok(pulseRecords.every(record=>/^ai-pulse\/[a-z0-9-]+$/.test(record.id) && /^\d{4}-\d{2}-\d{2}$/.test(record.editionDate)),'Invalid review allowlist');
const review=await mkdtemp(join(tmpdir(),'insights-editorial-review-'));
const marker={purpose:'Local editorial review only - never deploy',source,review,port,pid:process.pid,createdAt:new Date().toISOString(),ids:[...INSIGHTS_CONTENT_BATCH.map(a=>a.id),...pulseRecords.map(a=>a.id)]};
await writeFile(join(review,'.editorial-review-only.json'),JSON.stringify(marker,null,2));
for(const dir of ['src','scripts']) await cp(join(source,dir),join(review,dir),{recursive:true});
for(const file of ['astro.config.mjs','tsconfig.json','package.json','package-lock.json']) {
  if(await stat(join(source,file)).catch(()=>null)) await cp(join(source,file),join(review,file));
}
for(const dir of ['node_modules','public','main-site']) await symlink(await realpath(join(source,dir)),join(review,dir),process.platform==='win32'?'junction':'dir');
const patch=async(path,from,to)=>{
  const target=resolve(review,path);
  assert.ok(target.startsWith(review+sep));
  const text=await readFile(target,'utf8');
  assert.ok(text.includes(from),`Preview patch no longer matches ${path}`);
  await writeFile(target,text.replace(from,to));
};
// Allow exactly this batch through archive/detail/related rendering in the
// temporary copy. Draft flags, dates and source files remain untouched.
await patch('src/lib/insights.ts','  if (draft || entry.data.internalTest || isRedirectedInsight(entry.id)) return false;',
  `  if (entry.data.internalTest || isRedirectedInsight(entry.id)) return false;\n  if (${JSON.stringify(marker.ids)}.includes(entry.id)) return true;\n  if (draft) return false;`);
// Review archive order follows pack editions, without inventing publication
// timestamps in frontmatter, visible bylines, RSS or NewsArticle JSON-LD.
if(pulseRecords.length) {
  const dates=JSON.stringify(Object.fromEntries(pulseRecords.map(record=>[record.id,record.editionDate])));
  await patch('src/lib/insights.ts','  return [...entries].sort((a, b) => {',
    `  const reviewDates: Record<string, string> = ${dates};\n  return [...entries].sort((a, b) => {`);
  for(const variable of ['a','b']) await patch('src/lib/insights.ts',
    `const ${variable}Time = ${variable}.data.publishedAt?.getTime() ?? ${variable}.data.scheduledFor?.getTime() ?? 0;`,
    `const ${variable}Time = reviewDates[${variable}.id] ? Date.parse(reviewDates[${variable}.id]) : (${variable}.data.publishedAt?.getTime() ?? ${variable}.data.scheduledFor?.getTime() ?? 0);`);
}
await patch('src/pages/insights/[...slug].astro','<ArticleLayout entry={entry} allEntries={all}>','<ArticleLayout entry={entry} allEntries={all} preview={true}>');
await patch('src/layouts/BaseLayout.astro','(noindex || maxImagePreview)','(true)');
await patch('src/layouts/BaseLayout.astro',"...(noindex ? ['noindex', 'nofollow'] : [])","...(['noindex', 'nofollow'])");
// Review visits must not enter production analytics. Only edit the temporary
// layout; the existing site's tracking and consent behaviour are preserved.
const baseLayout=join(review,'src/layouts/BaseLayout.astro');
let layout=await readFile(baseLayout,'utf8');
for(const block of [
  /<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/,
  /<!-- Aladinia tracking -->\s*<script[^>]*><\/script>/,
  /<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/,
]) {
  assert.match(layout,block,'Review analytics patch no longer matches');
  layout=layout.replace(block,'<!-- Analytics disabled in local editorial review -->');
}
await writeFile(baseLayout,layout);
// Keep draft URLs out of discovery files even in the review copy.
await patch('src/pages/sitemap.xml.ts','publicOnly(all)',"publicOnly(all).filter((entry) => !entry.data.draft && entry.data.status !== 'draft')");
await patch('src/pages/rss.xml.js','publicOnly(all)',"publicOnly(all).filter((entry) => !entry.data.draft && entry.data.status !== 'draft')");
await patch('src/pages/ai-pulse/feed.xml.ts',"aiPulseEntries(await getCollection('insights'))", "aiPulseEntries(await getCollection('insights')).filter((entry) => !entry.data.draft && entry.data.status !== 'draft')");
const packageJson=JSON.parse(await readFile(join(review,'package.json'),'utf8'));
packageJson.scripts={build:packageJson.scripts.build};
await writeFile(join(review,'package.json'),JSON.stringify(packageJson,null,2));
const log=createWriteStream(join(review,'build.log'));
const child=spawn(process.execPath,[join(source,'node_modules/astro/astro.js'),'build'],{cwd:review,env:{...process.env},stdio:['ignore','pipe','pipe']});
child.stdout.pipe(log);child.stderr.pipe(log);
const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',done);});
log.end();
assert.equal(code,0,`Review build failed; inspect ${join(review,'build.log')}`);
const post=spawn(process.execPath,[join(review,'scripts/post-build.mjs')],{cwd:review,stdio:'ignore'});
assert.equal(await new Promise((done,reject)=>{post.once('error',reject);post.once('exit',done);}),0);
const root=join(review,'dist');
await mkdir(join(source,'docs'),{recursive:true});
await writeFile(join(source,'docs/insights-preview-runtime.json'),JSON.stringify(marker,null,2));
const types={'.html':'text/html; charset=utf-8','.xml':'application/xml','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.mp4':'video/mp4','.txt':'text/plain'};
http.createServer(async(req,res)=>{
  try {
    const hostname=(req.headers.host || '').split(':')[0];
    if(!['127.0.0.1','localhost'].includes(hostname)) {res.writeHead(403);res.end();return;}
    if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    let target=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(target!==root && !target.startsWith(root+sep)) {res.writeHead(403);res.end();return;}
    // Admin output includes unrelated drafts. It is never a review surface.
    if(target.slice(root.length).toLowerCase().split(sep).includes('admin')) {
      res.writeHead(404,{'X-Robots-Tag':'noindex, nofollow'});res.end();return;
    }
    let info=await stat(target).catch(()=>null);
    if(info?.isDirectory()) {
      if(!url.pathname.endsWith('/')) {res.writeHead(301,{Location:url.pathname+'/'+url.search});res.end();return;}
      target=join(target,'index.html');info=await stat(target).catch(()=>null);
    }
    const status=info?.isFile()?200:404;
    if(status===404) target=join(root,'404.html');
    res.writeHead(status,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
    if(req.method==='HEAD')res.end();else createReadStream(target).pipe(res);
  } catch {res.writeHead(500);res.end('Local review error');}
}).listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}/insights/`,...marker})));
