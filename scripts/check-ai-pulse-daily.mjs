import assert from 'node:assert/strict';
import test from 'node:test';
import {accessedSourceUrls,dubaiDate,selectPack,validateResult} from './ai-pulse-daily-core.mjs';

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
