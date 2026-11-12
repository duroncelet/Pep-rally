import test from 'node:test';
import assert from 'node:assert/strict';
import {dateNumber,addDays,cropGuides,emptyProfile,plantingMarkdown} from '../app/rally/garden/planting.ts';
test('calendar math rejects impossible dates and crosses years correctly',()=>{
 assert.ok(Number.isNaN(dateNumber('2026-02-30')));
 assert.ok(Number.isNaN(dateNumber('')));
 assert.equal(addDays('2026-01-10',-35),'2025-12-06');
 assert.equal(addDays('2028-02-28',1),'2028-02-29');
 assert.equal(addDays('2026-09-24',7),'2026-10-01');
});
test('crop guidance has sources and no invented zone or harvest dates',()=>{
 assert.ok(cropGuides.every(c=>c.source.startsWith('https://extension.umn.edu/')));
 assert.match(plantingMarkdown(emptyProfile),/Not confirmed/);
 assert.match(plantingMarkdown(emptyProfile),/not automatically looked up/);
 assert.equal(cropGuides.find(c=>c.name==='Peppers').indoors[0],-56);
});
