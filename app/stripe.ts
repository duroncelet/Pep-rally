import { and, eq, notInArray } from "drizzle-orm";
import { paymentMatches, revokedPayment } from './commerce';
import { getDb } from "../db";
import { creatorApps, purchases, savedRallies } from "../db/schema";
import { findConcept } from "./catalog";

type StripeSession = {
  id: string;
  livemode?:boolean;
  currency?:string|null;
  payment_intent?:string|{latest_charge?:string|StripeCharge|null}|null;
  url?: string | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required";
  amount_total?: number | null;
  client_reference_id?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
};
type StripeCharge={id:string;refunded?:boolean;disputed?:boolean;amount:number;currency:string;livemode:boolean;receipt_url?:string;metadata?:Record<string,string>};

export function isStripeTestMode(secret: string) {
  return secret.startsWith("sk_test_");
}

async function stripeRequest<T=StripeSession>(secret: string, path: string, init?: RequestInit):Promise<T> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    signal:AbortSignal.timeout(15000),
    headers: { authorization: `Bearer ${secret}`, ...(init?.headers || {}) },
  });
  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Stripe request failed");
  return data;
}

export async function createCheckoutSession(secret: string, input: { purchaseId: string; buyerUserId: string; buyerEmail: string; successUrl: string; cancelUrl: string; title: string; description: string; amountCents: number; toolSlug: string }) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("client_reference_id", input.purchaseId);
  params.set("customer_email", input.buyerEmail);
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  params.set("line_items[0][price_data][product_data][name]", input.title);
  params.set("line_items[0][price_data][product_data][description]", input.description.slice(0, 500));
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[purchase_id]", input.purchaseId);
  params.set("metadata[buyer_user_id]", input.buyerUserId);
  params.set("metadata[tool_slug]", input.toolSlug);
  params.set('payment_intent_data[metadata][purchase_id]',input.purchaseId);
  params.set('payment_intent_data[metadata][buyer_user_id]',input.buyerUserId);
  params.set('payment_method_types[0]','card');
  const session = await stripeRequest(secret, "/v1/checkout/sessions", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded",'Idempotency-Key':input.purchaseId }, body: params });
  if (!session.id || !session.url) throw new Error("Stripe did not return a hosted Checkout URL");
  return session;
}

export async function retrieveCheckoutSession(secret: string, sessionId: string) {
  if (!/^cs_(test_|live_)[A-Za-z0-9]+$/.test(sessionId)) throw new Error("Invalid Checkout Session ID");
  return stripeRequest(secret, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent.latest_charge`);
}

export async function fulfillCheckoutSession(sessionId: string, expectedUserId?: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe is not configured");
  const session = await retrieveCheckoutSession(secret, sessionId);
  const purchaseId = session.metadata?.purchase_id || session.client_reference_id;
  const buyerUserId = session.metadata?.buyer_user_id;
  if (!purchaseId || !buyerUserId) throw new Error("Checkout metadata is incomplete");
  if (expectedUserId && expectedUserId !== buyerUserId) throw new Error("This purchase belongs to another account");
  if (session.payment_status !== "paid") return { fulfilled: false, status: session.payment_status || "unpaid", session };
  const db = getDb();
  const [purchase] = await db.select().from(purchases).where(and(eq(purchases.id, purchaseId), eq(purchases.buyerUserId, buyerUserId))).limit(1);
  if (!purchase || !paymentMatches(session,purchase,!isStripeTestMode(secret))) throw new Error("Checkout does not match the saved purchase");
  const charge=typeof session.payment_intent==='object'&&session.payment_intent&&typeof session.payment_intent.latest_charge==='object'?session.payment_intent.latest_charge:null;
  if(!charge)throw new Error('Payment details are not available yet.');
  if(charge.refunded||charge.disputed){
    await db.update(purchases).set({status:charge.refunded?'refunded':'disputed'}).where(eq(purchases.id,purchase.id));
    return {fulfilled:false,status:charge.refunded?'refunded':'disputed',session};
  }
  if(revokedPayment(purchase.status))return {fulfilled:false,status:purchase.status,session};
  const now = new Date();
  let title = "My Bachelorette Blueprint";
  let summary = "Payment verified. Your executable Bachelorette planning workspace is ready.";
  let accessUrl = "/rally/bachelorette";
  if (purchase.toolSlug.startsWith("creator-app:")) {
    const creatorAppId = purchase.toolSlug.slice("creator-app:".length);
    const [creatorApp] = await db.select().from(creatorApps).where(eq(creatorApps.id, creatorAppId)).limit(1);
    if (!creatorApp?.sourceUrl || creatorApp.stage !== "published") throw new Error("The purchased Rally is not currently available");
    title = creatorApp.name;
    summary = creatorApp.outcome;
    accessUrl = creatorApp.sourceUrl;
  } else if (purchase.toolSlug.startsWith("catalog:")) {
    const concept = findConcept(purchase.toolSlug.slice("catalog:".length));
    if (!concept) throw new Error("The purchased Rally is not currently available");
    title = concept.title;
    summary = concept.promise;
    accessUrl = `/rally/market/${concept.slug}`;
  }
  const [granted]=await db.update(purchases).set({status:'paid_and_unlocked',fulfilledAt:purchase.fulfilledAt||now}).where(and(eq(purchases.id,purchase.id),notInArray(purchases.status,['refunded','disputed','access_revoked']))).returning();
  if(!granted)return {fulfilled:false,status:'access_revoked',session};
  await db.insert(savedRallies).values({
    id: `purchase-${purchase.id}`,
    userId: buyerUserId,
    toolSlug: purchase.toolSlug,
    title,
    inputs: JSON.stringify({ source: session.livemode ? "stripe_live_checkout" : "stripe_test_checkout", purchaseId: purchase.id, accessUrl }),
    summary,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();
  return { fulfilled: true, status: "paid", session, purchase, accessUrl, title,receiptUrl:charge.receipt_url };
}

export async function reconcileCharge(chargeId:string){
 if(!/^ch_[A-Za-z0-9]+$/.test(chargeId))throw new Error('Invalid charge');
 const secret=process.env.STRIPE_SECRET_KEY;if(!secret)throw new Error('Stripe unavailable');
 const charge=await stripeRequest<StripeCharge>(secret,'/v1/charges/'+encodeURIComponent(chargeId));
 const id=charge.metadata?.purchase_id;if(!id)return;
 const db=getDb();const [order]=await db.select().from(purchases).where(eq(purchases.id,id)).limit(1);
 if(!order||charge.metadata?.buyer_user_id!==order.buyerUserId||charge.amount!==order.amountCents||charge.currency!=='usd'||charge.livemode===isStripeTestMode(secret))throw new Error('Charge mismatch');
 if(charge.refunded||charge.disputed){
  await db.update(purchases).set({status:charge.refunded?'refunded':'disputed'}).where(eq(purchases.id,id));
  await db.delete(savedRallies).where(and(eq(savedRallies.id,'purchase-'+id),eq(savedRallies.userId,order.buyerUserId)));
 }
}

export async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !signatures.length || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  const expected = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some((candidate) => constantTimeEqual(expected, candidate));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
