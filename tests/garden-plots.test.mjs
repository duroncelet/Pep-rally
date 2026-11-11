import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlots,plotSummary,validPlot,resizePlot,gridSize} from '../app/rally/garden/plots.ts';
test('resize preserves crop coordinates and legacy grids',()=>{
 const p=makePlots('Raised beds',1,8,4,['Tomatoes'])[0];p.zones[3]='Herbs';
 assert.deepEqual(gridSize(p),{rows:2,columns:2});
 const expanded=resizePlot(p,3,4);
 assert.equal(expanded.zones.length,12);assert.equal(expanded.zones[5],'Herbs');assert.equal(expanded.zones[0],'Tomatoes');assert.ok(validPlot(expanded));
 assert.throws(()=>resizePlot(expanded,1,4),/Clear or move/);
 assert.deepEqual(resizePlot(expanded,2,2).zones,p.zones);
 for(const n of [0,13,1.5,NaN])assert.throws(()=>resizePlot(p,n,4));
});
test('legacy beds migrate without inventing plant counts or crops',()=>{
 const plots=makePlots('Raised beds',2,8,4,['Tomatoes','Herbs']);
 assert.deepEqual(plots[0].zones,['Tomatoes','','','']);
 assert.equal(plotSummary(plots,['Tomatoes','Herbs','Carrots']).area,64);
 assert.deepEqual(plotSummary(plots,['Tomatoes','Herbs','Carrots']).unassigned,['Carrots']);
 assert.ok(plots.every(validPlot));
});
test('mixed plot types and multi-crop zones are preserved',()=>{
 const plots=makePlots('Rows / in-ground',1,8,4,['Tomatoes']);
 plots.push({...makePlots('Pots / containers',1,3,3,['Herbs'])[0],id:'container'});
 plots[0].zones[1]='Carrots';
 assert.deepEqual(plotSummary(plots,['Carrots','Herbs']).unassigned,[]);
 assert.equal(plots[1].kind,'Container');assert.equal(plotSummary(plots,[]).area,33);
});
test('invalid plot sizes are rejected and empty maps stay empty',()=>{
 const p=makePlots('Raised beds',1,8,4,[])[0];
 for(const length of [0,-1,Infinity,101])assert.equal(validPlot({...p,length}),false);
 assert.deepEqual(plotSummary([],['Lettuce']),{placed:[],unassigned:['Lettuce'],area:0});
});
