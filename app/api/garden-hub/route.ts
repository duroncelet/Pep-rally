import { eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { gardenPlans } from "../../../db/schema";
import { validPlot, type Plot } from '../../rally/garden/plots';

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/rally/garden") }, { status: 401 });
  const [plan] = await getDb().select().from(gardenPlans).where(eq(gardenPlans.ownerUserId, user.userId)).limit(1);
  return Response.json({ ownerId:user.userId, updatedAt:plan?.updatedAt, plan: plan ? JSON.parse(plan.data) : null });
}

export async function PUT(request: Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return Response.json({error:'Open Pep Rally to save your garden.'},{status:403});
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/rally/garden") }, { status: 401 });
  const raw=await request.text();
  if(raw.length>250000) return Response.json({error:'This garden is too large to save. Download a copy.'},{status:413});
  let data; try {data=JSON.parse(raw);} catch {return Response.json({error:'Invalid garden data.'},{status:400});}
  if(!data || ![1,2,3].includes(data.version) || typeof data.location!=='string' || !Array.isArray(data.crops) || !Array.isArray(data.tasks) || !Array.isArray(data.journal)) return Response.json({error:'Check your garden details.'},{status:422});
  if(data.version===3 && (!Array.isArray(data.plots) || data.plots.length>30 || data.plots.some((p:Plot)=>!p || !Array.isArray(p.zones) || typeof p.name!=='string' || !validPlot(p)))) return Response.json({error:'Check your plot names and dimensions.'},{status:422});
  const db = getDb();
  const now = new Date();
  const [existing] = await db.select({ id: gardenPlans.id }).from(gardenPlans).where(eq(gardenPlans.ownerUserId, user.userId)).limit(1);
  if (existing) await db.update(gardenPlans).set({ data: JSON.stringify(data), updatedAt: now }).where(eq(gardenPlans.id, existing.id));
  else await db.insert(gardenPlans).values({ id: crypto.randomUUID(), ownerUserId: user.userId, data: JSON.stringify(data), updatedAt: now });
  return Response.json({ ok: true });
}
