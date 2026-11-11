import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformWithEsbuild} from 'vite';
const source=readFileSync(new URL('../app/commerce.ts',import.meta.url),'utf8');
const compiled=await transformWithEsbuild(source,'commerce.ts',{loader:'ts'});
const {checkoutReadiness,checkoutOrderId,paymentMatches,revokedPayment}=await import('data:text/javascript;base64,'+Buffer.from(compiled.code).toString('base64'));
const config={PEP_RALLY_PAID_SLUGS:'example',PEP_RALLY_CHECKOUT_TESTERS:'owner',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'fixture',PEP_RALLY_COMMERCE_MODE:'test'};
test('checkout fails closed and test checkout is owner restricted',()=>{
 assert.equal(checkoutReadiness({},'owner','example').enabled,false);
 assert.equal(checkoutReadiness(config,'owner','example').enabled,true);
 assert.equal(checkoutReadiness(config,'stranger','example').enabled,false);
 assert.equal(checkoutReadiness(config,'owner','garden-planner').enabled,false);
});
test('live checkout needs policies, support and explicit release',()=>{
 const live={...config,STRIPE_SECRET_KEY:'sk_live_fixture',PEP_RALLY_COMMERCE_MODE:'live-verification'};
 assert.equal(checkoutReadiness(live,'owner','example').enabled,false);
 Object.assign(live,{PEP_RALLY_POLICIES_APPROVED:'true',PEP_RALLY_SUPPORT_READY:'true',PEP_RALLY_SUPPORT_EMAIL:'support@example.com'});
 assert.equal(checkoutReadiness(live,'owner','example').enabled,true);
 assert.equal(checkoutReadiness(live,'stranger','example').enabled,false);
 assert.equal(checkoutReadiness({...live,PEP_RALLY_COMMERCE_MODE:'live'},'stranger','example').enabled,true);
});
test('checkout retry identifiers are stable and isolated by owner',async()=>{
 const key='12345678-1234-1234-1234-123456789012';
 assert.equal(await checkoutOrderId('a',key),await checkoutOrderId('a',key));
 assert.notEqual(await checkoutOrderId('a',key),await checkoutOrderId('b',key));
 await assert.rejects(checkoutOrderId('a','bad'));
});
test('payment validates owner, product, price, currency and environment',()=>{
 const order={stripeSessionId:'cs_live_example',amountCents:1000,toolSlug:'catalog:example',buyerUserId:'owner'};
 const session={id:order.stripeSessionId,livemode:true,currency:'usd',amount_total:1000,metadata:{buyer_user_id:'owner',tool_slug:order.toolSlug}};
 assert.equal(paymentMatches(session,order,true),true);
 for(const patch of [{livemode:false},{currency:'eur'},{amount_total:1},{id:'other'},{metadata:{buyer_user_id:'other',tool_slug:order.toolSlug}}])assert.equal(paymentMatches({...session,...patch},order,true),false);
 for(const status of ['refunded','disputed','access_revoked'])assert.equal(revokedPayment(status),true);
 assert.equal(revokedPayment('paid_and_unlocked'),false);
});
