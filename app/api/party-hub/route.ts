import { eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { partyPlans } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error:"Sign in required", signIn:chatGPTSignInPath("/rally/bachelorette") }, {status:401});
  const [plan] = await getDb().select().from(partyPlans).where(eq(partyPlans.ownerUserId, user.userId)).limit(1);
  return Response.json({ ownerId:user.userId, updatedAt:plan?.updatedAt, plan: plan ? JSON.parse(plan.data) : null });
}

export async function PUT(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return Response.json({error:'Open Pep Rally to save your weekend.'},{status:403});
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error:"Sign in required", signIn:chatGPTSignInPath("/rally/bachelorette") }, {status:401});
  const raw = await request.text();
  if(raw.length>250000) return Response.json({error:'Download a copy: this plan is too large to save.'},{status:413});
  let data; try {data=JSON.parse(raw);} catch {return Response.json({error:'Invalid plan.'},{status:400});}
  if(!data || ![2,3,4,5,6].includes(data.version) || !Array.isArray(data.guests) || !Array.isArray(data.events) || !Array.isArray(data.tasks) || !Array.isArray(data.expenses) || !Array.isArray(data.packing)) return Response.json({error:'Check your weekend details.'},{status:422});
  const db = getDb(); const now = new Date();
  const [existing] = await db.select({id:partyPlans.id}).from(partyPlans).where(eq(partyPlans.ownerUserId,user.userId)).limit(1);
  if (existing) await db.update(partyPlans).set({data:JSON.stringify(data),updatedAt:now}).where(eq(partyPlans.id,existing.id));
  else await db.insert(partyPlans).values({id:crypto.randomUUID(),ownerUserId:user.userId,data:JSON.stringify(data),updatedAt:now});
  return Response.json({ok:true});
}
