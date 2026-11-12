import { requireChatGPTUser } from "../../chatgpt-auth";
import { fulfillCheckoutSession } from "../../stripe";

export const dynamic = "force-dynamic";

export default async function PurchaseSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const sessionId = (await searchParams).session_id;
  const user = await requireChatGPTUser("/purchase/success"+(sessionId?'?session_id='+encodeURIComponent(sessionId):''));
  let result: Awaited<ReturnType<typeof fulfillCheckoutSession>> | null = null;
  let error = "";
  if (!sessionId) error = "The Checkout Session ID is missing.";
  else {
    try { result = await fulfillCheckoutSession(sessionId, user.userId); }
    catch { error = "Pep Rally could not verify this purchase. Please retry or contact support with your receipt."; }
  }
  return <main className="purchase-result"><section><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a>{result?.fulfilled ? <><small>PAYMENT VERIFIED · ACCESS UNLOCKED</small><h1>Your Rally is ready.</h1><p>Stripe confirmed the payment, Pep Rally saved the purchase, and {result.title || "your executable workspace"} is now in your library.</p><div><a className="primary" href={result.accessUrl || "/"}>Open the Rally →</a><a href="/library">View my Rallies</a></div>{!result.session.livemode && <em>This was a Stripe test-mode purchase. No real money moved.</em>}{result.receiptUrl && <a href={result.receiptUrl} target="_blank" rel="noreferrer">View Stripe receipt</a>}<a href="/support">Request help or a refund review</a></> : <><small>PAYMENT NOT YET VERIFIED</small><h1>Access is still waiting.</h1><p>{error || (result?.status==="refunded" ? "This purchase was refunded. Paid access is no longer active." : result?.status==="disputed" || result?.status==="access_revoked" ? "Access is paused. Contact support with your receipt." : "Stripe has not marked this Checkout Session paid yet. Refresh after the payment finishes.")}</p><div><a className="primary" href="/">Return to Pep Rally</a></div></>}</section></main>;
}
