import test from 'node:test';
import assert from 'node:assert/strict';
import {supportEmailDraft,SUPPORT_EMAIL} from '../app/support-email.ts';
const valid={email:'buyer@example.com',rally:'Garden & friends',message:'The save button did not work.'};
test('signed-out support draft has fixed recipient and encoded content',()=>{
 const input={...valid,message:'My question & bcc=other@example.com? #garden\nSecond line'};
 const url=new URL(supportEmailDraft(input));
 assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,SUPPORT_EMAIL);
 assert.deepEqual([...url.searchParams.keys()],['subject','body']);
 assert.ok(url.searchParams.get('body').endsWith(input.message));
});
test('support draft rejects malformed email and unbounded or empty inputs',()=>{
 for(const email of ['', 'not-email','a@b.com\nBcc:bad@b.com','a'.repeat(255)+'@x.com'])assert.throws(()=>supportEmailDraft({...valid,email}));
 for(const message of ['','short',' '.repeat(12),'x'.repeat(1001)])assert.throws(()=>supportEmailDraft({...valid,message}));
 assert.throws(()=>supportEmailDraft({...valid,rally:'x'.repeat(201)}));
 assert.doesNotThrow(()=>supportEmailDraft({...valid,rally:'',message:'x'.repeat(1000)}));
});
