import { requireChatGPTUser } from "../../chatgpt-auth";
import { fulfillCheckoutSession } from "../../stripe";

export const dynamic = "force-dynamic";

export default async function PurchaseSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const user = await requireChatGPTUser("/purchase/success");
  const sessionId = (await searchParams).session_id;
  let result: Awaited<ReturnType<typeof fulfillCheckoutSession>> | null = null;
  let error = "";
  if (!sessionId) error = "The Checkout Session ID is missing.";
  else {
    try { result = await fulfillCheckoutSession(sessionId, user.userId); }
    catch (caught) { error = caught instanceof Error ? caught.message : "Pep Rally could not verify this purchase."; }
  }
  return <main className="purchase-result"><section><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a>{result?.fulfilled ? <><small>PAYMENT VERIFIED · ACCESS UNLOCKED</small><h1>Your Rally is ready.</h1><p>Stripe confirmed the test payment, Pep Rally saved the purchase, and {result.title || "your executable workspace"} is now in your library.</p><div><a className="primary" href={result.accessUrl || "/"}>Open the Rally →</a><a href="/">View my Rallies</a></div><em>This was a Stripe test-mode purchase. No real money moved.</em></> : <><small>PAYMENT NOT YET VERIFIED</small><h1>Access is still waiting.</h1><p>{error || "Stripe has not marked this Checkout Session paid yet. Refresh after the payment finishes."}</p><div><a className="primary" href="/">Return to Pep Rally</a></div></>}</section></main>;
}
