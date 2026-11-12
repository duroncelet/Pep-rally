import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformWithEsbuild} from 'vite';
const compiled=await transformWithEsbuild(readFileSync(new URL('../app/catalog.ts',import.meta.url),'utf8'),'catalog.ts',{loader:'ts'});
const {findConcept,rallyConcepts}=await import('data:text/javascript;base64,'+Buffer.from(compiled.code).toString('base64'));
// Delisted Nov 11, 2026, per the consumer audit's three weakest buy cases:
// NCLEX Study Sprint (free plans more specific, QBanks own the value),
// Flashcard Shop Studio (no infrastructure, unanswered payment question),
// Care Circle Coordinator (free tools already do the core job).
test('delisted Rallies no longer resolve from the catalog',()=>{
 for (const slug of ['nclex-study-sprint','flashcard-shop-studio','care-circle-coordinator']) {
  assert.equal(findConcept(slug),undefined,`${slug} should be delisted`);
 }
 assert.equal(rallyConcepts.length,7);
 assert.doesNotMatch(rallyConcepts.map((item)=>item.title).join(' '),/NCLEX|Flashcard Shop|Care Circle/);
});
