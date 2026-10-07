import assert from 'node:assert/strict';
import test from 'node:test';
import {accessedSourceUrls,dubaiDate,selectPack,validatePublishedBodyLinks,validateResult} from './ai-pulse-daily-core.mjs';

test('Dubai dates cross UTC midnight correctly',()=>{
  assert.equal(dubaiDate(new Date('2026-10-07T19:59:59Z')),'2026-10-07');
  assert.equal(dubaiDate(new Date('2026-10-07T20:00:00Z')),'2026-10-08');
});
test('explicit revisions beat originals; ambiguous revisions are held',()=>{
  const files=['Daily Content Pack - 2026-08-19.docx','Daily Content Pack - 2026-08-19 V3.docx','Daily Content Pack - 2026-08-19.md'].map(name=>({name}));
  assert.equal(selectPack(files,'2026-08-19').name,files[1].name);
  assert.equal(selectPack(files,'2026-08-20'),null);
  assert.throws(()=>selectPack([...files,files[1]],'2026-08-19'),/Ambiguous/);
  assert.throws(()=>selectPack([{name:'Daily Content Pack - 2026-08-19 APPROVED.docx'}],'2026-08-19'),/Unrecognised/);
});
test('only exact pack basenames qualify for an edition',()=>{
  const date='2026-10-07';
  for(const suffix of ['00 unexpected FRESH.docx',' extra FRESH.docx',' V3 copy.docx',' V3.md',' V0.docx',' V9007199254740992.docx']) {
    assert.throws(()=>selectPack([{name:`Daily Content Pack - ${date}${suffix}`}],date),/Unrecognised/);
  }
  const original={name:`Daily Content Pack - ${date}.docx`};
  assert.equal(selectPack([original,{name:`Daily Content Pack - ${date}00 unexpected FRESH.docx`}],date).name,original.name);
  assert.equal(selectPack([{name:`Daily Content Pack - ${date} V99999.docx`},{name:`Daily Content Pack - ${date} FRESH.docx`}],date).name,`Daily Content Pack - ${date} FRESH.docx`);
  assert.throws(()=>selectPack([], '2026-02-31'),/Invalid pack date/);
});
test('published internal links support inline titles, canonical URLs and escaped paths',()=>{
  const related=[{id:'ai-strategy/approved-guide'}],path='/insights/ai-strategy/approved-guide/';
  for(const link of [`[guide](${path})`,`[guide](${path} "A useful guide")`,`[guide](https://christianfarioli.com${path}#section)`,`[guide](https://www.christianfarioli.com${path}?source=article)`,`[guide](${path.replaceAll('/', '\\/')})`,`[guide](/insights/ai-strategy/%61pproved-guide/)`,`https://christianfarioli.com${path}`,`www.christianfarioli.com${path}`,'[primary](https://example.com/news_(2026)?x=1&y=2 "Primary source")','[section](#my-take)']) {
    assert.doesNotThrow(()=>validatePublishedBodyLinks(link,related),link);
  }
});
test('all supported internal destination variants reject unknown or draft articles',()=>{
  const related=[{id:'ai-strategy/approved-guide'}],path='/insights/ai-strategy/unpublished/';
  for(const link of [`[draft](${path})`,`[draft](${path} "title")`,`[draft](https://christianfarioli.com${path})`,`[draft](//www.christianfarioli.com${path})`,`[draft](${path.replaceAll('/', '\\/')})`,`[draft](/insights/ai-strategy/%75npublished/)`,`[draft](/insights%2fai-strategy%2funpublished/)`,`[draft](https://christianfarioli.com${path}?ref=x#intro)`,`https://christianfarioli.com${path}`,`www.christianfarioli.com${path}`,'[draft](../../ai-strategy/unpublished/)']) {
    assert.throws(()=>validatePublishedBodyLinks(link,related),undefined,link);
  }
});
test('ambiguous references and entity-encoded destinations fail closed',()=>{
  const related=[{id:'ai-strategy/approved-guide'}];
  for(const link of ['[draft][id]\n\n[id]: /insights/ai-strategy/unpublished/','[draft]\n\n[draft]: https://christianfarioli.com/insights/ai-strategy/unpublished/','[draft][id]\n\n> [id]: /insights/ai-strategy/unpublished/','[draft](&#47;insights/ai-strategy/unpublished/)','[draft](https&colon;//christianfarioli.com/insights/ai-strategy/unpublished/)','[draft](/insights/ai-strategy/unpublished/ "unclosed)']) {
    assert.throws(()=>validatePublishedBodyLinks(link,related),undefined,link);
  }
});
test('a request or failed open is not evidence of a successful source read',()=>{
  const url='https://example.com/announcement';
  const events=[
    {type:'item.started',item:{type:'web_search',query:url}},
    {type:'item.completed',item:{type:'web_search',action:{type:'open_page'},results:[]}},
    {type:'item.completed',item:{type:'web_search',action:{type:'search'},results:[{type:'text_result',url}]}},
    {type:'item.completed',item:{type:'web_search',action:{type:'open_page'},results:[{type:'text_result',url,title:'Internal Error ()',snippet:'Failed to fetch: (502) Bad Gateway'}]}},
    {type:'item.completed',item:{type:'web_search',action:{type:'open_page'},results:[{type:'text_result',url,title:'Original announcement',snippet:'Total lines: 99'}]}}
  ];
  assert.equal(accessedSourceUrls(events.slice(0,4).map(JSON.stringify).join('\n')).size,0);
  assert.deepEqual([...accessedSourceUrls(events.map(JSON.stringify).join('\n'))],[url]);
});
test('blocked output and impossible dates never reach intake',()=>{
  assert.throws(()=>validateResult({status:'blocked',issues:['No primary evidence']},{}),/Editorial hold/);
  assert.throws(()=>validateResult({status:'ready',issues:[],newsDate:'2026-02-31'},{date:'2026-10-07'}),/News date/);
});
