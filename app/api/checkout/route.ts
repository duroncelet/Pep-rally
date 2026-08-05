import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { purchases, savedRallies } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/") }, { status: 401 });
  const body = await request.json() as { toolSlug?: string; title?: string; inputs?: unknown; summary?: string };
  if (body.toolSlug !== "bachelorette-blueprint" || !body.title || !body.summary) return Response.json({ error: "Product unavailable" }, { status: 400 });
  const now = new Date();
  const purchaseId = crypto.randomUUID();
  const rallyId = crypto.randomUUID();
  const db = getDb();
  await db.insert(purchases).values({ id: purchaseId, buyerUserId: user.userId, toolSlug: body.toolSlug, title: body.title, amountCents: 1800, platformFeeCents: 360, creatorEarningsCents: 1440, status: "test_succeeded", createdAt: now });
  await db.insert(savedRallies).values({ id: rallyId, userId: user.userId, toolSlug: body.toolSlug, title: body.title, inputs: JSON.stringify(body.inputs ?? {}), summary: body.summary, createdAt: now, updatedAt: now });
  return Response.json({ purchaseId, rallyId, mode: "test", receipt: { paid: 18, creatorEarnings: 14.4, platformFee: 3.6 } }, { status: 201 });
}
