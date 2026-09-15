import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { findConcept } from "../../catalog";
import { getDb } from "../../../db";
import { purchases } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!findConcept(slug)) return Response.json({ error: "Rally not found" }, { status: 404 });

  const user = await getChatGPTUser();
  if (!user) return Response.json({ signedIn: false, unlocked: false });

  const [purchase] = await getDb().select({ id: purchases.id }).from(purchases).where(and(
    eq(purchases.buyerUserId, user.userId),
    eq(purchases.toolSlug, `catalog:${slug}`),
    eq(purchases.status, "paid_and_unlocked"),
  )).limit(1);

  return Response.json({ signedIn: true, unlocked: Boolean(purchase) });
}
