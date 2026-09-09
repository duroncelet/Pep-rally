import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { eq } from "drizzle-orm";
import { creatorApps, purchases } from "../../../db/schema";
import { createCheckoutSession, isStripeTestMode } from "../../stripe";
import { findConcept } from "../../catalog";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/connections") }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ error: "Add Pep Rally’s private Stripe test key first.", needsCredential: true }, { status: 503 });
  if (!isStripeTestMode(secret)) return Response.json({ error: "This proof only accepts a Stripe test-mode key. No real charge will be created." }, { status: 409 });
  const body = await request.json().catch(() => ({})) as { creatorAppId?: string; conceptSlug?: string };
  const db = getDb();
  const [creatorApp] = body.creatorAppId ? await db.select().from(creatorApps).where(eq(creatorApps.id, body.creatorAppId)).limit(1) : [];
  const concept = body.conceptSlug ? findConcept(body.conceptSlug) : undefined;
  if (body.creatorAppId && (!creatorApp || creatorApp.stage !== "published" || creatorApp.accessModel !== "paid" || !creatorApp.sourceUrl)) return Response.json({ error: "This paid Rally is not available." }, { status: 404 });
  if (body.conceptSlug && !concept) return Response.json({ error: "This Rally is not available." }, { status: 404 });
  const origin = new URL(request.url).origin;
  const now = new Date();
  const purchaseId = crypto.randomUUID();
  const amountCents = creatorApp?.priceCents ?? concept?.priceCents ?? 100;
  const title = creatorApp?.name ?? concept?.title ?? "Bachelorette Blueprint · payment proof";
  const toolSlug = creatorApp ? `creator-app:${creatorApp.id}` : concept ? `catalog:${concept.slug}` : "bachelorette-blueprint";
  const platformFeeCents = Math.round(amountCents * .2);
  await db.insert(purchases).values({ id: purchaseId, buyerUserId: user.userId, toolSlug, title, amountCents, platformFeeCents, creatorEarningsCents: amountCents - platformFeeCents, status: "creating_checkout", createdAt: now });
  try {
    const session = await createCheckoutSession(secret, {
      purchaseId,
      buyerUserId: user.userId,
      buyerEmail: user.email,
      title,
      description: creatorApp?.outcome ?? concept?.promise ?? "A Stripe test-mode checkout that unlocks a saved executable workspace. No real money moves.",
      amountCents,
      toolSlug,
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
