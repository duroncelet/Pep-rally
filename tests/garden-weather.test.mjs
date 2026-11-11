import test from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../app/api/garden-weather/route.ts';
import {gardenWeatherActions,weatherRequestGate} from '../app/rally/garden/weather.ts';
const daily={time:['2026-11-11'],temperature_2m_max:[20],temperature_2m_min:[10],precipitation_sum:[0],precipitation_probability_max:[90],wind_speed_10m_max:[5]};
test('likely rain with a low rain total never produces dry-week advice',()=>{
 const actions=gardenWeatherActions(daily).join(' ');
 assert.match(actions,/Rain is possible/);assert.doesNotMatch(actions,/Dry week|Little rain|more frequent watering/);
 assert.match(gardenWeatherActions({...daily,precipitation_probability_max:[10]}).join(' '),/Little rain/);
});
test('changing location immediately rejects old responses and newer requests supersede older ones',()=>{
 const gate=weatherRequestGate();const old=gate.begin();assert.equal(old(),true);
 gate.invalidate();assert.equal(old(),false);
 const current=gate.begin();const refresh=gate.begin();assert.equal(current(),false);assert.equal(refresh(),true);
 gate.invalidate();assert.equal(refresh(),false);
});
test('incomplete current readings or wind units are rejected even with a valid daily forecast',async()=>{
 const original=globalThis.fetch;
 const current={temperature_2m:20,apparent_temperature:19,precipitation:0,wind_speed_10m:5};
 try {
  for(const forecast of [{current:{},current_units:{wind_speed_10m:'km/h'}},{current},{current:{...current,temperature_2m:null},current_units:{wind_speed_10m:'km/h'}}]) {
   let count=0;globalThis.fetch=async()=>Response.json(count++?{daily,...forecast}:{results:[{id:1,name:'Austin',latitude:30,longitude:-97}]});
   const response=await GET(new Request('https://example.com/api/garden-weather?location=Austin'));
   assert.equal(response.status,502);assert.match((await response.json()).error,/incomplete/);
  }
 } finally {globalThis.fetch=original;}
});
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
