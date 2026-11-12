import { fulfillCheckoutSession, verifyStripeSignature,reconcileCharge } from "../../../stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!webhookSecret || !signature) return Response.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  const payload = await request.text();
  if (!await verifyStripeSignature(payload, signature, webhookSecret)) return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  let event;try{event=JSON.parse(payload) as {type?:string;data?:{object?:{id?:string;charge?:string}}};}catch{return Response.json({error:'Invalid event'},{status:400});}
  try {
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type || "") && event.data?.object?.id) {
    await fulfillCheckoutSession(event.data.object.id);
  }
  if(event.type==='charge.refunded'&&event.data?.object?.id)await reconcileCharge(event.data.object.id);
  if(event.type==='charge.dispute.created'&&event.data?.object?.charge)await reconcileCharge(event.data.object.charge);
  }catch{return Response.json({error:'Payment update could not be applied. Retry required.'},{status:503});}
  return Response.json({ received: true });
}
