#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import {parse} from 'parse5';
import {XMLParser} from 'fast-xml-parser';
import {isOffsetTimestamp} from '../src/lib/ai-pulse.mjs';
import {INSIGHTS_CONTENT_BATCH} from '../src/lib/insights-content-cta.mjs';
import {resolveArticleCTA,articleCTAWhatsAppUrl,ARTICLE_CONTACT} from '../src/lib/article-contact-cta.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const publishedMode=args[0]==='--published';
const selfTest=args[0]==='--self-test';
assert.ok(args.length<=(publishedMode?2:1) && (!args[0]?.startsWith('--') || publishedMode || selfTest),'Usage: node scripts/check-insights-content.mjs [reviewDir] | --published [outputDir] | --self-test');
const reviewDir=!publishedMode && !selfTest && args[0]?resolve(args[0]):null;
const output=publishedMode?(args[1]?resolve(args[1]):join(root,'dist')):reviewDir || join(root,'dist');
const mode=publishedMode?'published':reviewDir?'review':'production';
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
const walk=(node,predicate,out=[])=>{if(predicate(node))out.push(node);for(const child of node.childNodes||[])walk(child,predicate,out);return out;};
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join(' ');
const hasClass=(node,name)=>(attr(node,'class')||'').split(/\s+/).includes(name);
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
const words=text=>(text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[]).length;
const summaries=[];const paragraphOwners=new Map();const seoTitles=new Set();const paragraphFingerprints=[];
const sitemap=readFileSync(join(output,'sitemap.xml'),'utf8');
const feed=readFileSync(join(output,'insights/rss.xml'),'utf8');
for(const item of INSIGHTS_CONTENT_BATCH) {
  const path=join(root,'src/content/insights',item.id+'.mdx');
  assert.ok(existsSync(path),`Missing article ${item.code}`);
  const {data,content}=matter(readFileSync(path,'utf8'));
  assert.equal(data.title,item.title);assert.equal(data.category,item.id.split('/')[0]);
  lifecycle(data,item.code,publishedMode);assert.equal(data.language,'en-GB');
  assert.equal(data.author.name,'Prof. Christian Farioli');
  assert.ok(data.excerpt?.length>=40 && data.description?.length>=40 && data.seoTitle?.length>=10);
  assert.ok(!seoTitles.has(data.seoTitle));seoTitles.add(data.seoTitle);
  assert.ok(!/^# /m.test(content),`${item.code}: duplicate H1`);
  assert.ok(!/[—–]/.test(content),`${item.code}: use simple hyphens`);
  assert.ok(!/\b(TODO|TBD|Lorem ipsum|placeholder|coming soon)\b/i.test(content));
  assert.ok(!/I (?:recently trained|worked with a client)|one of my clients achieved/i.test(content));
  assert.ok(existsSync(join(root,'public',data.featuredImage.replace(/^\//,''))));
  const canonical=`https://christianfarioli.com/insights/${item.id}/`;
  if(publishedMode)discoveryDate(sitemap,feed,canonical,data.publishedAt);
  else {
    assert.ok(!sitemap.includes(canonical),`${item.code}: draft in sitemap`);
    assert.ok(!feed.includes(canonical),`${item.code}: draft in feed`);
  }
  const cta=resolveArticleCTA(item.id,data.category);
  assert.equal(cta.bookingLabel,'Book a Call with Christian');
  const whatsapp=new URL(articleCTAWhatsAppUrl(item.id,canonical));
  assert.equal(whatsapp.origin+whatsapp.pathname,'https://wa.me/971509596182');
  assert.equal(whatsapp.searchParams.get('text'),`Hi Christian, I’ve just read “${item.title}”. I’d like to discuss ${item.topic} for our organisation.\n\n${canonical}`);
  const publicFile=join(output,'insights',item.id,'index.html');
  if(!reviewDir && !publishedMode)assert.ok(!existsSync(publicFile),`${item.code}: draft has public output`);
  const html=readFileSync(reviewDir||publishedMode?publicFile:join(output,'insights/admin/preview',item.id,'index.html'),'utf8');
  if(reviewDir)assert.ok(!/googletagmanager\.com|aladinia\.app\/tracking/.test(html),`${item.code}: production analytics in review`);
  const doc=parse(html);
  const find=predicate=>walk(doc,predicate);
  const metas=find(n=>n.tagName==='meta');
  const meta=(name)=>metas.find(n=>attr(n,'name')===name||attr(n,'property')===name);
  assert.equal(find(n=>n.tagName==='h1').length,1);
  if(publishedMode)publicationMarkup(doc,data.publishedAt);
  else assert.match(attr(meta('robots'),'content'),/noindex/);
  assert.equal(attr(find(n=>n.tagName==='link'&&attr(n,'rel')==='canonical')[0],'href'),canonical);
  assert.equal(attr(meta('og:url'),'content'),canonical);
  assert.equal(attr(meta('og:title'),'content'),data.seoTitle);
  assert.equal(attr(meta('description'),'content'),data.description);
  assert.equal(find(n=>hasClass(n,'article-contact-cta')).length,1);
  assert.ok(find(n=>hasClass(n,'article-contact-reminder')).length<=1);
  const booking=find(n=>attr(n,'data-article-cta-link')==='booking'&&attr(n,'data-cta-position')==='end_article');
  assert.equal(booking.length,1);assert.equal(attr(booking[0],'href'),ARTICLE_CONTACT.bookingUrl);
  assert.equal(text(booking[0]).trim(),'Book a Call with Christian');
  const message=find(n=>attr(n,'data-article-cta-link')==='whatsapp');
  assert.equal(message.length,1);assert.equal(attr(message[0],'href'),whatsapp.toString());
  const body=find(n=>hasClass(n,'article-body'))[0];assert.ok(body);
  const bodyWordCount=words(text(body));
  assert.ok(bodyWordCount>=950,`${item.code}: unexpectedly incomplete ${bodyWordCount} words`);
  assert.ok(Number.isInteger(data.readingTime)&&data.readingTime>0);
  const paragraphs=walk(body,n=>n.tagName==='p').map(n=>text(n).replace(/\s+/g,' ').trim()).filter(p=>words(p)>=30);
  for(const paragraph of paragraphs) {
    assert.ok(!paragraphOwners.has(paragraph),`${item.code}: paragraph duplicated from ${paragraphOwners.get(paragraph)}`);
    paragraphOwners.set(paragraph,item.code);
    const tokens=paragraph.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
    if(tokens.length>=45) {
      const grams=new Set(tokens.slice(0,-3).map((_,i)=>tokens.slice(i,i+4).join(' ')));
      for(const previous of paragraphFingerprints.filter(p=>p.code!==item.code)) {
        const overlap=[...grams].filter(g=>previous.grams.has(g)).length;
        const similarity=overlap/(grams.size+previous.grams.size-overlap);
        assert.ok(similarity<0.65,`${item.code}: substantially duplicate paragraph from ${previous.code}`);
      }
      paragraphFingerprints.push({code:item.code,grams});
    }
  }
  const tables=walk(body,n=>n.tagName==='table');
  for(const table of tables) {
    assert.ok(walk(table,n=>n.tagName==='caption').length===1);
    assert.ok(walk(table,n=>n.tagName==='th').every(n=>['col','row'].includes(attr(n,'scope'))));
    assert.ok(hasClass(table.parentNode,'insights-batch-table'));
    assert.equal(attr(table.parentNode,'role'),'region');assert.equal(attr(table.parentNode,'tabindex'),'0');
  }
  const json=find(n=>n.tagName==='script'&&attr(n,'type')==='application/ld+json').flatMap(n=>JSON.parse(text(n)));
  assert.equal(json.filter(n=>n['@type']==='BlogPosting').length,1);
  assert.equal(json.filter(n=>n['@type']==='BreadcrumbList').length,1);
  assert.equal(json.filter(n=>n['@type']==='NewsArticle'||n['@type']==='FAQPage').length,0);
  const article=json.find(n=>n['@type']==='BlogPosting');
  const expectedDate=publishedMode?new Date(data.publishedAt).toISOString():undefined;
  assert.equal(article.datePublished,expectedDate);assert.equal(article.dateModified,expectedDate);assert.equal(article.author.name,data.author.name);
  assert.equal(article.url,canonical);assert.equal(article.mainEntityOfPage['@id'],canonical);
  const links=walk(body,n=>n.tagName==='a').map(n=>attr(n,'href'));
  for(const link of links.filter(l=>l?.startsWith('/'))) {
    const url=new URL(link,'https://christianfarioli.com');
    const file=join(output,url.pathname,'index.html');
    if(reviewDir || publishedMode) {
      assert.ok(existsSync(file),`${item.code}: missing internal ${link}`);
      if(url.hash)assert.ok(walk(parse(readFileSync(file,'utf8')),n=>attr(n,'id')===decodeURIComponent(url.hash.slice(1))).length);
    }
  }
  summaries.push({code:item.code,title:item.title,id:item.id,words:bodyWordCount,readingTime:data.readingTime,tables:tables.length,externalLinks:links.filter(l=>/^https?:/.test(l)),internalLinks:links.filter(l=>l?.startsWith('/')),checks:'passed'});
}
if(reviewDir || publishedMode) {
  for(const category of ['ai-marketing','future-of-work','human-centered-ai']) {
    const html=readFileSync(join(output,'insights/category',category,'index.html'),'utf8');
    for(const item of INSIGHTS_CONTENT_BATCH.filter(a=>a.id.startsWith(category+'/')))assert.ok(html.includes(`/insights/${item.id}/`));
    assert.ok(!html.includes('No insights in this category yet'));
  }
  const hub=readFileSync(join(output,'insights/index.html'),'utf8');
  for(const item of INSIGHTS_CONTENT_BATCH)assert.ok(hub.includes(`/insights/${item.id}/`));
}
const result={mode,checkedAt:new Date().toISOString(),articleCount:summaries.length,summaries};
writeFileSync(join(root,'docs',`insights-content-${mode}-qa.json`),JSON.stringify(result,null,2));
console.log(JSON.stringify({mode,articles:summaries.length,totalWords:summaries.reduce((s,a)=>s+a.words,0),checks:'all passed',summary:summaries.map(({code,words,tables})=>({code,words,tables}))}));
