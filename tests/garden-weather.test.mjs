import test from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../app/api/garden-weather/route.ts';
test('ambiguous weather locations require an explicit choice',async()=>{
 const original=globalThis.fetch;
 try {globalThis.fetch=async()=>Response.json({results:[{id:1,name:'Springfield'},{id:2,name:'Springfield'}]});
 const response=await GET(new Request('https://example.com/api/garden-weather?location=Springfield'));
 assert.equal(response.status,200);assert.equal((await response.json()).choices.length,2);
 }finally{globalThis.fetch=original;}
});
test('weather timeouts return a helpful error rather than a raw exception',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>{throw new Error('timeout');};
 const response=await GET(new Request('https://example.com/api/garden-weather?location=Austin'));
 assert.equal(response.status,503);assert.match((await response.json()).error,/journal still work/);
 }finally{globalThis.fetch=original;}
});
test('missing forecast values do not become confident care advice',async()=>{
 const original=globalThis.fetch;let count=0;
 try{globalThis.fetch=async()=>Response.json(count++?{current:{},daily:{time:['2026-09-23'],temperature_2m_max:[null]}}:{results:[{id:1,name:'Austin',latitude:30,longitude:-97}]});
 const response=await GET(new Request('https://example.com/api/garden-weather?location=Austin&place=1'));
 assert.equal(response.status,502);
 }finally{globalThis.fetch=original;}
});
