import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
function setup(cap=100, budget=80, steps=5, tools=2) {
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0011_runtime_budget_ledger.sql',import.meta.url),'utf8'));
  db.prepare('INSERT INTO runtime_accounts VALUES (?,?)').run('owner',cap);
  for(const id of ['one','two']) db.prepare('INSERT INTO runtime_sessions VALUES (?,?,?,?,?,0)').run(id,'owner',budget,steps,tools);
  const reserve=(id,session,cost,toolCalls=0)=>db.prepare("INSERT INTO runtime_reservations(id,session_id,month,reserved,tool_calls) VALUES(?,?,strftime('%Y-%m','now'),?,?)").run(id,session,cost,toolCalls);
  return {db,reserve,enable:()=>db.exec('UPDATE runtime_controls SET generation_enabled=1')};
}
test('generation fails closed and stopping a session blocks new work',()=>{
 const {db,reserve,enable}=setup();
 assert.throws(()=>reserve('a','one',10),/generation_disabled/); enable();
 db.exec("UPDATE runtime_sessions SET stopped=1 WHERE id='one'");
 assert.throws(()=>reserve('a','one',10),/session_stopped/); db.close();
});
test('outstanding reservations enforce account cap across sessions',()=>{
 const {db,reserve,enable}=setup(); enable(); reserve('a','one',60);
 assert.throws(()=>reserve('b','two',50),/account_budget_exceeded/);
 reserve('b','two',40);
 assert.throws(()=>reserve('c','one',1),/account_budget_exceeded/); db.close();
});
test('settlement releases only unused reservation and cannot be rewritten',()=>{
 const {db,reserve,enable}=setup(); enable(); reserve('a','one',80);
 assert.throws(()=>reserve('b','one',1),/session_budget_exceeded/);
 assert.throws(()=>db.exec("UPDATE runtime_reservations SET actual=81 WHERE id='a'"),/CHECK/);
 db.exec("UPDATE runtime_reservations SET actual=30 WHERE id='a'"); reserve('b','one',50);
 assert.throws(()=>db.exec("UPDATE runtime_reservations SET actual=0 WHERE id='a'"),/immutable/);
 assert.throws(()=>db.exec("DELETE FROM runtime_reservations WHERE id='a'"),/immutable/); db.close();
});
test('free operations still consume step and tool limits',()=>{
 const {db,reserve,enable}=setup(100,80,2,1); enable(); reserve('a','one',0,1);
 assert.throws(()=>reserve('b','one',0,1),/tool_limit_exceeded/);
 reserve('b','one',0); assert.throws(()=>reserve('c','one',0),/step_limit_exceeded/); db.close();
});
test('invalid reservations roll back without consuming budget',()=>{
 const {db,reserve,enable}=setup(); enable();
 for(const amount of [-1,0.1]) assert.throws(()=>reserve('bad','one',amount),/CHECK/);
 assert.throws(()=>reserve('bad','one',1,0.5),/CHECK/);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM runtime_reservations').get().n,0);
 reserve('valid','one',80); db.close();
});
test('global stop preserves unsettled costs and allows reconciliation',()=>{
 const {db,reserve,enable}=setup(); enable(); reserve('a','one',70);
 db.exec('UPDATE runtime_controls SET generation_enabled=0');
 assert.throws(()=>reserve('b','two',1),/generation_disabled/);
 db.exec("UPDATE runtime_reservations SET actual=60 WHERE id='a'");
 enable(); assert.throws(()=>reserve('b','two',41),/account_budget_exceeded/);
 reserve('b','two',40); db.close();
});
