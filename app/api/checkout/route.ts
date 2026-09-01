import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { eq } from "drizzle-orm";
import { purchases } from "../../../db/schema";
import { createCheckoutSession, isStripeTestMode } from "../../stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/connections") }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ error: "Add Pep Rally’s private Stripe test key first.", needsCredential: true }, { status: 503 });
  if (!isStripeTestMode(secret)) return Response.json({ error: "This proof only accepts a Stripe test-mode key. No real charge will be created." }, { status: 409 });
  const origin = new URL(request.url).origin;
  const now = new Date();
  const purchaseId = crypto.randomUUID();
  const db = getDb();
  await db.insert(purchases).values({ id: purchaseId, buyerUserId: user.userId, toolSlug: "bachelorette-blueprint", title: "Bachelorette Blueprint · payment proof", amountCents: 100, platformFeeCents: 20, creatorEarningsCents: 80, status: "creating_checkout", createdAt: now });
  try {
    const session = await createCheckoutSession(secret, {
      purchaseId,
      buyerUserId: user.userId,
      buyerEmail: user.email,
      successUrl: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/connections?checkout=cancelled`,
    });
    await db.update(purchases).set({ stripeSessionId: session.id, status: "checkout_open" }).where(eq(purchases.id, purchaseId));
    return Response.json({ purchaseId, url: session.url, mode: "test" }, { status: 201 });
  } catch (error) {
    await db.update(purchases).set({ status: "checkout_failed" }).where(eq(purchases.id, purchaseId));
    return Response.json({ error: error instanceof Error ? error.message : "Stripe could not create Checkout." }, { status: 502 });
  }
}
