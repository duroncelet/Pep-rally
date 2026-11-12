import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformWithEsbuild} from 'vite';
const compiled=await transformWithEsbuild(readFileSync(new URL('../app/catalog.ts',import.meta.url),'utf8'),'catalog.ts',{loader:'ts'});
const {findConcept}=await import('data:text/javascript;base64,'+Buffer.from(compiled.code).toString('base64'));
test('NCLEX listing describes a typed-text planning preview, not verified flashcards',()=>{
 const listing=findConcept('nclex-study-sprint');
 assert.match(listing.promise,/does not upload files, verify sources, or generate answered flashcards/);
 assert.match(listing.inputs[0],/paste text/);
 assert.doesNotMatch(listing.outcome.join(' '),/source-linked|uploaded sources|Editable active-recall|tracker/);
 assert.match(listing.sourceNote,/not a verified exam question bank/);
});
