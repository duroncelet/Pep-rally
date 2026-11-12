type Config=Record<string,string|undefined>;
export function checkoutReadiness(config:Config,userId:string,slug:string) {
 const mode=config.PEP_RALLY_COMMERCE_MODE;
 const secret=config.STRIPE_SECRET_KEY||'';
 const testers=(config.PEP_RALLY_CHECKOUT_TESTERS||'').split(',').map(s=>s.trim()).filter(Boolean);
 const products=(config.PEP_RALLY_PAID_SLUGS||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(!products.includes(slug))return {enabled:false,mode:'off' as const};
 if(mode==='test'&&secret.startsWith('sk_test_')&&testers.includes(userId)&&config.STRIPE_WEBHOOK_SECRET)return {enabled:true,mode:'test' as const};
 const reviewed=config.PEP_RALLY_POLICIES_APPROVED==='true'&&config.PEP_RALLY_SUPPORT_READY==='true'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.PEP_RALLY_SUPPORT_EMAIL||'');
 // Live verification is restricted to named testers until an operator enables public commerce.
 if((mode==='live-verification'||mode==='live')&&secret.startsWith('sk_live_')&&config.STRIPE_WEBHOOK_SECRET&&reviewed&&(mode==='live'||testers.includes(userId)))return {enabled:true,mode:'live' as const};
 return {enabled:false,mode:'off' as const};
}
export async function checkoutOrderId(owner:string,key:string){
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(key))throw new Error('A request identifier is required.');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(owner+':'+key));
 return 'order-'+Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}
export function paymentMatches(session:{id:string;livemode?:boolean;currency?:string|null;amount_total?:number|null;metadata?:Record<string,string>|null},purchase:{stripeSessionId:string|null;amountCents:number;toolSlug:string;buyerUserId:string},live:boolean){
 return session.id===purchase.stripeSessionId&&session.livemode===live&&session.currency==='usd'&&session.amount_total===purchase.amountCents&&session.metadata?.buyer_user_id===purchase.buyerUserId&&session.metadata?.tool_slug===purchase.toolSlug;
}
export const revokedPayment=(status:string)=>['refunded','disputed','access_revoked'].includes(status);
