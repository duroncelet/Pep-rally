import { eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { partyPlans } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error:"Sign in required", signIn:chatGPTSignInPath("/") }, {status:401});
  const [plan] = await getDb().select().from(partyPlans).where(eq(partyPlans.ownerUserId, user.userId)).limit(1);
  return Response.json({ plan: plan ? JSON.parse(plan.data) : null });
}

export async function PUT(request:Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error:"Sign in required", signIn:chatGPTSignInPath("/") }, {status:401});
  const data = await request.json(); const db = getDb(); const now = new Date();
  const [existing] = await db.select({id:partyPlans.id}).from(partyPlans).where(eq(partyPlans.ownerUserId,user.userId)).limit(1);
  if (existing) await db.update(partyPlans).set({data:JSON.stringify(data),updatedAt:now}).where(eq(partyPlans.id,existing.id));
  else await db.insert(partyPlans).values({id:crypto.randomUUID(),ownerUserId:user.userId,data:JSON.stringify(data),updatedAt:now});
  return Response.json({ok:true});
}
