import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { purchases, savedRallies } from "../db/schema";

type StripeSession = {
  id: string;
  url?: string | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required";
  amount_total?: number | null;
  client_reference_id?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
};

export function isStripeTestMode(secret: string) {
  return secret.startsWith("sk_test_");
}

async function stripeRequest(secret: string, path: string, init?: RequestInit) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${secret}`, ...(init?.headers || {}) },
  });
  const data = await response.json() as StripeSession & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Stripe request failed");
  return data;
}

export async function createCheckoutSession(secret: string, input: { purchaseId: string; buyerUserId: string; buyerEmail: string; successUrl: string; cancelUrl: string }) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("client_reference_id", input.purchaseId);
  params.set("customer_email", input.buyerEmail);
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", "100");
  params.set("line_items[0][price_data][product_data][name]", "Bachelorette Blueprint · Pep Rally payment proof");
  params.set("line_items[0][price_data][product_data][description]", "A Stripe test-mode checkout that unlocks a saved executable workspace. No real money moves.");
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[purchase_id]", input.purchaseId);
  params.set("metadata[buyer_user_id]", input.buyerUserId);
  params.set("metadata[tool_slug]", "bachelorette-blueprint");
  const session = await stripeRequest(secret, "/v1/checkout/sessions", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params });
  if (!session.id || !session.url) throw new Error("Stripe did not return a hosted Checkout URL");
  return session;
}

export async function retrieveCheckoutSession(secret: string, sessionId: string) {
  if (!/^cs_(test_|live_)[A-Za-z0-9]+$/.test(sessionId)) throw new Error("Invalid Checkout Session ID");
  return stripeRequest(secret, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
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
  if (!purchase || purchase.stripeSessionId !== session.id || purchase.amountCents !== session.amount_total) throw new Error("Checkout does not match the saved purchase");
  const now = new Date();
  await db.insert(savedRallies).values({
    id: `purchase-${purchase.id}`,
    userId: buyerUserId,
    toolSlug: purchase.toolSlug,
    title: "My Bachelorette Blueprint",
    inputs: JSON.stringify({ source: "stripe_test_checkout", purchaseId: purchase.id }),
    summary: "Payment verified. Your executable Bachelorette planning workspace is ready.",
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();
  await db.update(purchases).set({ status: "paid_and_unlocked", fulfilledAt: purchase.fulfilledAt || now }).where(eq(purchases.id, purchase.id));
  return { fulfilled: true, status: "paid", session, purchase };
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
