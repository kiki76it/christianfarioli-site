#!/usr/bin/env node
// Checks source provenance and all rendered review URLs. No external requests.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import {parse} from 'parse5';
import {assertAiPulse} from '../src/lib/ai-pulse.mjs';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const index=JSON.parse(readFileSync(join(repo,'docs/ai-pulse-archive-index.json'),'utf8'));
const records=index.records.filter(r=>r.status==='draft');
const reviewRoot=process.argv[2] ? resolve(process.argv[2]) : null;
const paragraphs=new Map();
const attr=(node,key)=>node.attrs?.find(a=>a.name===key)?.value;
const hasClass=(node,name)=>(attr(node,'class')||'').split(/\s+/).includes(name);
const find=(node,predicate)=>[...(predicate(node)?[node]:[]),...(node.childNodes||[]).flatMap(child=>find(child,predicate))];
const raw=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(raw).join('');
const words=node=>raw(node).replace(/\s+/g,' ').trim();
const tags=(node,tag)=>find(node,n=>n.tagName===tag);
const readPage=path=>parse(readFileSync(join(reviewRoot,path,'index.html'),'utf8'));
const schemas=doc=>tags(doc,'script').filter(n=>attr(n,'type')==='application/ld+json').flatMap(n=>{const v=JSON.parse(raw(n));return Array.isArray(v)?v:v['@graph']||[v];});
const dates=[];
for(const record of records){
  const {data,content}=matter(readFileSync(join(repo,'src/content/insights',record.id+'.md'),'utf8'));
  assertAiPulse(data,content);
  assert.equal(data.status,'draft');
  for(const field of ['publishedAt','updatedAt','scheduledFor','reviewedAt','reviewedBy','internalTest']) assert.ok(!data[field],`${record.id}: ${field}`);
  assert.equal(data.language,'en-GB');
  assert.equal(data.title,record.title);
  assert.equal((content.match(/^## /gm)||[]).length,4);
  assert.ok(!/^# |<|^\s*(import|export)\s|\b(TODO|TBD|Lorem ipsum)\b/m.test(content),`${record.id}: placeholder or executable content`);
  assert.ok(content.trim().split(/\s+/).length>=450);
  assert.ok(data.sources.length>=1);
  assert.ok(existsSync(join(repo,'public',data.featuredImage)),`${record.id}: missing image`);
  for(const link of data.related||[]){
    const file=['.md','.mdx'].map(ext=>join(repo,'src/content/insights',link.slug+ext)).find(existsSync);
    assert.ok(file,`${record.id}: missing related ${link.slug}`);
    const target=matter(readFileSync(file,'utf8')).data;
    assert.equal(target.status,'published',`${record.id}: related draft ${link.slug}`);assert.ok(!target.draft);
  }
  for(const p of content.split(/\n\s*\n/).map(p=>p.trim()).filter(p=>p.split(/\s+/).length>=30 && !p.startsWith('#'))){
    const key=p.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ');
    assert.ok(!paragraphs.has(key),`Repeated paragraph in ${record.id} and ${paragraphs.get(key)}`);paragraphs.set(key,record.id);
  }
  dates.push(record.editionDate);
  if(reviewRoot){
    const document=readPage('insights/'+record.id);
    const h1=tags(document,'h1');assert.equal(h1.length,1);assert.equal(words(h1[0]),record.title);
    assert.equal(attr(tags(document,'link').find(n=>attr(n,'rel')==='canonical'),'href'),`https://christianfarioli.com/insights/${record.id}/`);
    assert.ok(tags(document,'meta').some(n=>attr(n,'name')==='robots' && /noindex/.test(attr(n,'content'))));
    const articles=schemas(document).filter(s=>['Article','BlogPosting','NewsArticle'].includes(s['@type']));
    assert.equal(articles.length,1);assert.equal(articles[0]['@type'],'NewsArticle');
    assert.equal(articles[0].author.name,'Prof. Christian Farioli');
    assert.ok(!articles[0].datePublished && !articles[0].dateModified);
    for(const title of ['What happened','Why it matters','The bigger shift','My take','Sources'])assert.equal(tags(document,'h2').filter(n=>words(n)===title).length,1);
    const sources=find(document,n=>hasClass(n,'article-sources'));assert.equal(sources.length,1);
    for(const source of data.sources)assert.ok(tags(sources[0],'a').some(n=>attr(n,'href')===source.url));
    assert.ok(words(document).includes('Not published yet'));
    for(const link of tags(document,'a')){
      const href=attr(link,'href');
      if(href?.startsWith('/insights/') && !href.includes('/admin/')){
        let target=join(reviewRoot,new URL(href,'https://christianfarioli.com').pathname);
        if(existsSync(target) && statSync(target).isDirectory())target=join(target,'index.html');
        assert.ok(existsSync(target),`${record.id}: missing rendered link ${href}`);
      }
    }
  }
}
assert.deepEqual(dates,[...dates].sort().reverse());
if(!reviewRoot && existsSync(join(repo,'dist/sitemap.xml'))){
  const discovery=['sitemap.xml','insights/rss.xml','insights/ai-pulse/feed.xml','insights/index.html','insights/ai-pulse/index.html'].map(path=>readFileSync(join(repo,'dist',path),'utf8')).join('\n');
  for(const record of records){
    assert.ok(!existsSync(join(repo,'dist/insights',record.id)),`Public draft route: ${record.id}`);
    assert.ok(!discovery.includes(record.id),`Draft leaked into production discovery: ${record.id}`);
  }
}
if(reviewRoot){
  const all=readPage('insights');
  for(const record of records)assert.ok(tags(all,'a').some(n=>attr(n,'href')===`/insights/${record.id}/`),`Not in All: ${record.id}`);
  const archiveIds=[];
  for(let page=1;page<=Math.ceil(records.length/12);page++){
    const document=readPage(page===1?'insights/ai-pulse':`insights/ai-pulse/page/${page}`);
    const cards=find(document,n=>hasClass(n,'article-card'));
    archiveIds.push(...cards.map(card=>attr(find(card,n=>hasClass(n,'article-card-image'))[0],'href')));
  }
  assert.deepEqual(archiveIds,records.map(record=>`/insights/${record.id}/`));
  for(const file of ['sitemap.xml','insights/rss.xml','insights/ai-pulse/feed.xml']){
    const path=join(reviewRoot,file);if(!existsSync(path))continue;
    const xml=readFileSync(path,'utf8');for(const record of records)assert.ok(!xml.includes(record.id),`Draft in discovery: ${file}`);
  }
  assert.ok(!existsSync(join(reviewRoot,'insights/ai-pulse/internal-editorial-preview')));
}
console.log(JSON.stringify({sourceDrafts:records.length,renderedArticles:reviewRoot?records.length:0,pages:reviewRoot?Math.ceil(records.length/12):0,checks:'provenance, editorial structure, real draft dates, assets, published internal links, no repeated long paragraphs, rendered source/schema/archive/discovery controls'}));
