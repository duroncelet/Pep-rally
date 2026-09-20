import { eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { gardenPlans } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/rally/garden") }, { status: 401 });
  const [plan] = await getDb().select().from(gardenPlans).where(eq(gardenPlans.ownerUserId, user.userId)).limit(1);
  return Response.json({ plan: plan ? JSON.parse(plan.data) : null });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/rally/garden") }, { status: 401 });
  const data = await request.json();
  const db = getDb();
  const now = new Date();
  const [existing] = await db.select({ id: gardenPlans.id }).from(gardenPlans).where(eq(gardenPlans.ownerUserId, user.userId)).limit(1);
  if (existing) await db.update(gardenPlans).set({ data: JSON.stringify(data), updatedAt: now }).where(eq(gardenPlans.id, existing.id));
  else await db.insert(gardenPlans).values({ id: crypto.randomUUID(), ownerUserId: user.userId, data: JSON.stringify(data), updatedAt: now });
  return Response.json({ ok: true });
}
