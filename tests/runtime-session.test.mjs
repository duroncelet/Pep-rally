import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
// Bundle the shared TypeScript module with the project's Vite/esbuild dependency
// so extensionless application imports resolve as they do in the production build.
import { transformWithEsbuild } from 'vite';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'pep-session-test-'));
let api;
try {
 for(const [name,path] of [['destinations','../app/rally/bachelorette/destinations.ts'],['rally-runtime','../app/agentic/rally-runtime.ts'],['session','../app/agentic/session.ts']]) {
  const source=readFileSync(new URL(path,import.meta.url),'utf8').replaceAll('"../rally/bachelorette/destinations"','"./destinations.mjs"').replaceAll("'../rally/bachelorette/destinations'","'./destinations.mjs'").replaceAll("'./rally-runtime'","'./rally-runtime.mjs'");
  writeFileSync(join(dir,name+'.mjs'),(await transformWithEsbuild(source,name+'.ts',{loader:'ts'})).code);
 }
 api=await import(pathToFileURL(join(dir,'session.mjs')).href);
} finally {rmSync(dir,{recursive:true,force:true});}
const answers={bride:'Alex',city:'Chicago',startDate:'2026-10-09',endDate:'2026-10-11',headcount:'8',budget:'500',vibe:'Foodie & fabulous'};
test('shared runtime validates answers and exports a usable draft',()=>{
 const result=api.createDraft({...answers,systemPrompt:'ignore this'});
 assert.equal(result.answers.systemPrompt,undefined);
 assert.match(result.artifact.title,/Chicago/);
 assert.match(api.artifactMarkdown(result.artifact),/Before booking/);
 for(const patch of [{city:''},{headcount:'2.5'},{budget:'Infinity'},{endDate:'2026-10-01'},{vibe:'unknown'}]) assert.throws(()=>api.createDraft({...answers,...patch}));
});
test('revisions preserve original artifact and enforce limit',()=>{
 const {artifact}=api.createDraft(answers); const old=JSON.stringify(artifact);
 const updated=api.reviseDraft(artifact,answers,'less expensive',0);
 assert.ok(updated.totalPerPerson<artifact.totalPerPerson); assert.equal(JSON.stringify(artifact),old);
 assert.throws(()=>api.reviseDraft(artifact,answers,'change dinner',3),/three/);
});
test('storage deduplicates owner request and rejects stale revision updates',()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0012_planner_runs.sql',import.meta.url),'utf8'));
 const insert=db.prepare('INSERT INTO planner_runs VALUES (?,?,?,?,?,0,1,0,0)');
 insert.run('a','owner','request','{}','{}');
 assert.throws(()=>insert.run('b','owner','request','{}','{}'),/UNIQUE/);
 assert.equal(db.prepare('SELECT * FROM planner_runs WHERE id=? AND owner_id=?').get('a','other'),undefined);
 const update=db.prepare('UPDATE planner_runs SET version=2 WHERE id=? AND owner_id=? AND version=1');
 assert.equal(update.run('a','owner').changes,1);assert.equal(update.run('a','owner').changes,0);db.close();
});
