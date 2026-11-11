import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesRally} from '../app/market-search.ts';
import {outcomeHtml} from '../app/outcome-document.ts';
import {encodeOutcome,decodeOutcome} from '../app/share-document.ts';
import {settleBills} from '../app/rally/bachelorette/destinations.ts';
import {readBrowserDraft} from '../app/browser-draft.ts';
const garden={title:'The Little Garden Planner',category:'Garden',keywords:'raised beds weather journal'};
test('search finds free products with multi-word queries and category filters',()=>{
 assert.equal(matchesRally(garden,'garden','All'),true);
 assert.equal(matchesRally(garden,'garden weather','Garden'),true);
 assert.equal(matchesRally(garden,'garden','Study'),false);
 assert.equal(matchesRally(garden,'nursing','All'),false);
});
const doc={title:'Rose’s weekend 🌸',subtitle:'September',sections:[{heading:'Stay',paragraphs:['<script>alert(1)</script>'],grid:{columns:2,cells:['Tomatoes','<img onerror=x>']}}]};
test('portable document escapes all user text, does not run script and preserves grid',()=>{
 const html=outcomeHtml(doc);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('repeat(2,'));assert.ok(!html.includes('<img onerror'));
});
test('share link round trips unicode without sending plan content to a query string',()=>{
 assert.deepEqual(decodeOutcome(encodeOutcome(doc)),doc);
 assert.throws(()=>decodeOutcome('bad???'));assert.throws(()=>encodeOutcome({...doc,title:'x'.repeat(20000)}));
 assert.throws(()=>decodeOutcome(encodeOutcome({title:'bad',subtitle:'',sections:[{heading:'bad',grid:{columns:100,cells:[]}}]})));
});
test('recorded contribution offsets a bill repayment and returns unused funds',()=>{
 const bills=[{id:'dinner',title:'Dinner',amount:100,paidBy:'a',participants:['a','b']}];
 assert.deepEqual(settleBills(bills),[{from:'b',to:'a',cents:5000}]);
 assert.deepEqual(settleBills(bills,[{from:'b',to:'a',cents:5000}]),[]);
 assert.deepEqual(settleBills(bills,[{from:'b',to:'a',cents:7000}]),[{from:'a',to:'b',cents:2000}]);
 assert.throws(()=>settleBills(bills,[{from:'b',to:'a',cents:NaN}]));
});
test('browser drafts are scoped to owner, expire and do not supersede newer account saves',()=>{
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null};
 const now=Date.now();data.set('pep-rally-recovery:garden:one',JSON.stringify({updated:now,plan:{version:3}}));
 assert.deepEqual(readBrowserDraft('garden','one'),{version:3});
 assert.equal(readBrowserDraft('garden','two'),null);
 assert.equal(readBrowserDraft('garden','one',now+1),null);
 data.set('pep-rally-recovery:garden:one',JSON.stringify({updated:now-31*86400000,plan:{}}));assert.equal(readBrowserDraft('garden','one'),null);
 data.set('pep-rally-recovery:garden:one','broken');assert.equal(readBrowserDraft('garden','one'),null);
 delete globalThis.localStorage;
});
