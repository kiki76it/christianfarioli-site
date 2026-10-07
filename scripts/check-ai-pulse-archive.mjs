#!/usr/bin/env node
// Checks source provenance and all rendered review URLs. No external requests.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import {parse} from 'parse5';
import {XMLParser} from 'fast-xml-parser';
import {assertAiPulse,isOffsetTimestamp} from '../src/lib/ai-pulse.mjs';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const index=JSON.parse(readFileSync(join(repo,'docs/ai-pulse-archive-index.json'),'utf8'));
const records=index.records;
assert.equal(records.length,55,'Expected all 55 archive records; never filter away a changed status');
assert.equal(new Set(records.map(record=>record.id)).size,55,'Duplicate archive id');
assert.ok(records.every(record=>['draft','published'].includes(record.status)),'Unsupported archive provenance status');
const args=process.argv.slice(2);
const publishedMode=args[0]==='--published';
const selfTest=args[0]==='--self-test';
assert.ok(args.length<=(publishedMode?2:1) && (!args[0]?.startsWith('--') || publishedMode || selfTest),'Usage: node scripts/check-ai-pulse-archive.mjs [reviewDir] | --published [outputDir] | --self-test');
const reviewRoot=!publishedMode && !selfTest && args[0]?resolve(args[0]):null;
const outputRoot=publishedMode?(args[1]?resolve(args[1]):join(repo,'dist')):reviewRoot;
const paragraphs=new Map();
const attr=(node,key)=>node.attrs?.find(a=>a.name===key)?.value;
const hasClass=(node,name)=>(attr(node,'class')||'').split(/\s+/).includes(name);
const find=(node,predicate)=>[...(predicate(node)?[node]:[]),...(node.childNodes||[]).flatMap(child=>find(child,predicate))];
const raw=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(raw).join('');
const words=node=>raw(node).replace(/\s+/g,' ').trim();
const tags=(node,tag)=>find(node,n=>n.tagName===tag);
const readPage=path=>parse(readFileSync(join(outputRoot,path,'index.html'),'utf8'));
const schemas=doc=>tags(doc,'script').filter(n=>attr(n,'type')==='application/ld+json').flatMap(n=>{const v=JSON.parse(raw(n));return Array.isArray(v)?v:v['@graph']||[v];});
const walk=find;const text=raw;
const array=value=>value===undefined?[]:Array.isArray(value)?value:[value];
const xml=value=>new XMLParser({ignoreAttributes:false,parseTagValue:false}).parse(value);
function lifecycle(data,id,published,now=Date.now()) {
  assert.equal(data.status,published?'published':'draft',`${id}: status`);
  assert.equal(data.draft,!published,`${id}: draft flag`);
  for(const key of ['updatedAt','scheduledFor','reviewedBy','reviewedAt','internalTest'])assert.equal(data[key],undefined,`${id}: no invented ${key}`);
  if(!published){assert.equal(data.publishedAt,undefined,`${id}: no invented publishedAt`);return;}
  assert.ok(isOffsetTimestamp(data.publishedAt),`${id}: quoted publication timestamp with timezone required`);
  assert.ok(Date.parse(data.publishedAt)<=now,`${id}: future publication`);
}
function discoveryDate(sitemap,feed,canonical,publishedAt) {
  const urls=array(xml(sitemap).urlset?.url).filter(item=>item.loc===canonical);
  assert.equal(urls.length,1,`${canonical}: exactly one sitemap entry required`);
  assert.equal(urls[0].lastmod,new Date(publishedAt).toISOString().slice(0,10),`${canonical}: sitemap lastmod`);
  const items=array(xml(feed).rss?.channel?.item).filter(item=>item.link===canonical);
  assert.equal(items.length,1,`${canonical}: exactly one RSS item required`);
  // RSS serialises whole seconds; schema, OG and byline retain milliseconds.
  assert.equal(Date.parse(items[0].pubDate),Math.floor(Date.parse(publishedAt)/1000)*1000,`${canonical}: RSS publication date`);
}
function publicationMarkup(doc,publishedAt) {
  const expected=new Date(publishedAt).toISOString();
  const nodes=predicate=>walk(doc,predicate);
  const robots=nodes(n=>n.tagName==='meta'&&attr(n,'name')==='robots');
  assert.ok(robots.every(n=>!/noindex|none/i.test(attr(n,'content')||'')),'Published route must be indexable');
  const dates=nodes(n=>hasClass(n,'article-dates'));assert.equal(dates.length,1);
  const times=walk(dates[0],n=>n.tagName==='time');assert.equal(times.length,1);
  assert.equal(attr(times[0],'datetime'),expected);assert.match(text(times[0]),/Published/);
  const publishedMeta=nodes(n=>n.tagName==='meta'&&attr(n,'property')==='article:published_time');
  assert.equal(publishedMeta.length,1);assert.equal(attr(publishedMeta[0],'content'),expected);
  assert.equal(nodes(n=>n.tagName==='meta'&&attr(n,'property')==='article:modified_time').length,0);
  assert.equal(nodes(n=>hasClass(n,'preview-banner')).length,0);
}
if(selfTest){
  const now=Date.parse('2026-10-07T12:00:00Z');
  const draft={status:'draft',draft:true};const published={status:'published',draft:false,publishedAt:'2026-10-07T15:00:00.123+04:00'};
  lifecycle(draft,'test',false,now);lifecycle(published,'test',true,now);
  for(const mutation of [{publishedAt:undefined},{publishedAt:'2026-02-30T11:00:00Z'},{publishedAt:'2026-10-07'},{publishedAt:'2026-10-07T13:00:00Z'},{draft:true},{status:'draft'},{updatedAt:published.publishedAt},{reviewedBy:'Invented approval'}])assert.throws(()=>lifecycle({...published,...mutation},'test',true,now));
  assert.throws(()=>lifecycle(published,'test',false,now));
  const url='https://christianfarioli.com/insights/test/article/';
  const map=`<urlset><url><loc>${url}</loc><lastmod>2026-10-07</lastmod></url></urlset>`;
  const rss=`<rss><channel><item><link>${url}</link><pubDate>Wed, 07 Oct 2026 11:00:00 GMT</pubDate></item></channel></rss>`;
  discoveryDate(map,rss,url,published.publishedAt);
  assert.throws(()=>discoveryDate('<urlset/>',rss,url,published.publishedAt));
  assert.throws(()=>discoveryDate(map,'<rss><channel/></rss>',url,published.publishedAt));
  assert.throws(()=>discoveryDate(map.replace('2026-10-07','2026-08-12'),rss,url,published.publishedAt));
  assert.throws(()=>discoveryDate(map,rss.replace('11:00:00','10:00:00'),url,published.publishedAt));
  const expected=new Date(published.publishedAt).toISOString();
  const html=`<meta name="robots" content="index,follow"><meta property="article:published_time" content="${expected}"><div class="article-dates"><time datetime="${expected}">Published</time></div>`;
  publicationMarkup(parse(html),published.publishedAt);
  assert.throws(()=>publicationMarkup(parse(html.replace('index,follow','noindex,follow')),published.publishedAt));
  assert.throws(()=>publicationMarkup(parse(html.replace('class="article-dates"','class="missing"')),published.publishedAt));
  console.log(JSON.stringify({selfTest:'passed',checks:'lifecycle, impossible/future timestamps, missing/stale discovery, robots and visible dates'}));process.exit(0);
}

const dates=[];const sourceData=new Map();
const sitemap=publishedMode?readFileSync(join(outputRoot,'sitemap.xml'),'utf8'):null;
const feed=publishedMode?readFileSync(join(outputRoot,'insights/rss.xml'),'utf8'):null;
const pulseFeed=publishedMode?readFileSync(join(outputRoot,'insights/ai-pulse/feed.xml'),'utf8'):null;
for(const record of records){
  const {data,content}=matter(readFileSync(join(repo,'src/content/insights',record.id+'.md'),'utf8'));
  assertAiPulse(data,content);
  lifecycle(data,record.id,publishedMode);
  sourceData.set(record.id,data);
  if(publishedMode){
    assert.equal(data.sourceEditionDate,record.editionDate,`${record.id}: source edition provenance`);
    if(record.status==='published')assert.ok(isOffsetTimestamp(record.publishedAt),`${record.id}: published index timestamp missing`);
    if(record.publishedAt!==undefined)assert.equal(Date.parse(record.publishedAt),Date.parse(data.publishedAt),`${record.id}: index/source publication mismatch`);
    const canonical=`https://christianfarioli.com/insights/${record.id}/`;
    discoveryDate(sitemap,feed,canonical,data.publishedAt);
    discoveryDate(sitemap,pulseFeed,canonical,data.publishedAt);
  }
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
  if(reviewRoot || publishedMode){
    const document=readPage('insights/'+record.id);
    const h1=tags(document,'h1');assert.equal(h1.length,1);assert.equal(words(h1[0]),record.title);
    assert.equal(attr(tags(document,'link').find(n=>attr(n,'rel')==='canonical'),'href'),`https://christianfarioli.com/insights/${record.id}/`);
    if(publishedMode)publicationMarkup(document,data.publishedAt);
    else assert.ok(tags(document,'meta').some(n=>attr(n,'name')==='robots' && /noindex/.test(attr(n,'content'))));
    const articles=schemas(document).filter(s=>['Article','BlogPosting','NewsArticle'].includes(s['@type']));
    assert.equal(articles.length,1);assert.equal(articles[0]['@type'],'NewsArticle');
    assert.equal(articles[0].author.name,'Prof. Christian Farioli');
    const expectedDate=publishedMode?new Date(data.publishedAt).toISOString():undefined;
    assert.equal(articles[0].datePublished,expectedDate);assert.equal(articles[0].dateModified,expectedDate);
    assert.equal(articles[0].url,`https://christianfarioli.com/insights/${record.id}/`);
    assert.equal(articles[0].mainEntityOfPage['@id'],articles[0].url);
    for(const title of ['What happened','Why it matters','The bigger shift','My take','Sources'])assert.equal(tags(document,'h2').filter(n=>words(n)===title).length,1);
    const sources=find(document,n=>hasClass(n,'article-sources'));assert.equal(sources.length,1);
    for(const source of data.sources)assert.ok(tags(sources[0],'a').some(n=>attr(n,'href')===source.url));
    assert.equal(words(document).includes('Not published yet'),!publishedMode);
    for(const link of tags(document,'a')){
      const href=attr(link,'href');
      if(href?.startsWith('/insights/') && !href.includes('/admin/')){
        let target=join(outputRoot,new URL(href,'https://christianfarioli.com').pathname);
        if(existsSync(target) && statSync(target).isDirectory())target=join(target,'index.html');
        assert.ok(existsSync(target),`${record.id}: missing rendered link ${href}`);
      }
    }
  }
}
assert.deepEqual(dates,[...dates].sort().reverse());
if(!publishedMode && !reviewRoot && existsSync(join(repo,'dist/sitemap.xml'))){
  const discovery=['sitemap.xml','insights/rss.xml','insights/ai-pulse/feed.xml','insights/index.html','insights/ai-pulse/index.html'].map(path=>readFileSync(join(repo,'dist',path),'utf8')).join('\n');
  for(const record of records){
    assert.ok(!existsSync(join(repo,'dist/insights',record.id)),`Public draft route: ${record.id}`);
    assert.ok(!discovery.includes(record.id),`Draft leaked into production discovery: ${record.id}`);
  }
}
if(reviewRoot || publishedMode){
  const all=readPage('insights');
  for(const record of records)assert.ok(tags(all,'a').some(n=>attr(n,'href')===`/insights/${record.id}/`),`Not in All: ${record.id}`);
  const archiveIds=[];
  for(let page=1;page<=Math.ceil(records.length/12);page++){
    const document=readPage(page===1?'insights/ai-pulse':`insights/ai-pulse/page/${page}`);
    if(publishedMode){
      const canonical=`https://christianfarioli.com/insights/ai-pulse/${page===1?'':`page/${page}/`}`;
      assert.equal(attr(tags(document,'link').find(n=>attr(n,'rel')==='canonical'),'href'),canonical);
      assert.ok(tags(document,'meta').filter(n=>attr(n,'name')==='robots').every(n=>!/noindex|none/i.test(attr(n,'content')||'')),`Archive page ${page} is not indexable`);
      assert.equal(array(xml(sitemap).urlset?.url).filter(item=>item.loc===canonical).length,1,`Archive page ${page} missing from sitemap`);
    }
    const cards=find(document,n=>hasClass(n,'article-card'));
    archiveIds.push(...cards.map(card=>attr(find(card,n=>hasClass(n,'article-card-image'))[0],'href')));
  }
  const ordered=publishedMode?[...records].sort((a,b)=>Date.parse(sourceData.get(b.id).publishedAt)-Date.parse(sourceData.get(a.id).publishedAt) || b.editionDate.localeCompare(a.editionDate) || a.id.localeCompare(b.id)):records;
  assert.deepEqual(archiveIds,ordered.map(record=>`/insights/${record.id}/`));
  if(publishedMode)assert.deepEqual(array(xml(pulseFeed).rss?.channel?.item).map(item=>item.link),ordered.map(record=>`https://christianfarioli.com/insights/${record.id}/`),'AI Pulse RSS order and membership');
  for(const file of ['sitemap.xml','insights/rss.xml','insights/ai-pulse/feed.xml']){
    const path=join(outputRoot,file);
    if(publishedMode){assert.ok(existsSync(path),`Missing public discovery: ${file}`);continue;}
    if(!existsSync(path))continue;
    const xml=readFileSync(path,'utf8');for(const record of records)assert.ok(!xml.includes(record.id),`Draft in discovery: ${file}`);
  }
  assert.ok(!existsSync(join(outputRoot,'insights/ai-pulse/internal-editorial-preview')));
}
console.log(JSON.stringify({mode:publishedMode?'published':reviewRoot?'review':'draft',sourceArticles:records.length,renderedArticles:outputRoot?records.length:0,pages:outputRoot?Math.ceil(records.length/12):0,checks:'provenance, editorial structure, lifecycle dates, assets, published internal links, no repeated long paragraphs, rendered source/schema/archive/discovery controls'}));
