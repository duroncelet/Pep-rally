import { and, desc, eq, like } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { purchases, savedRallies, gardenPlans, partyPlans } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/library") }, { status: 401 });
  const rows = await getDb().select().from(savedRallies).where(eq(savedRallies.userId, user.userId)).orderBy(desc(savedRallies.updatedAt)).limit(50);
  const [gardens, parties] = await Promise.all([
    getDb().select({ id:gardenPlans.id, updatedAt:gardenPlans.updatedAt }).from(gardenPlans).where(eq(gardenPlans.ownerUserId,user.userId)),
    getDb().select({ id:partyPlans.id, updatedAt:partyPlans.updatedAt }).from(partyPlans).where(eq(partyPlans.ownerUserId,user.userId)),
  ]);
  const planners = [
    ...gardens.map(p=>({...p,id:`garden:${p.id}`,toolSlug:'garden-planner',title:'Your garden',summary:'Your garden map, crop calendar, care tasks and journal.',inputs:{},isPlanner:true})),
    ...parties.map(p=>({...p,id:`party:${p.id}`,toolSlug:'bachelorette-blueprint',title:'Your bachelorette weekend',summary:'Your itinerary, stay shortlist, packing and shared bills.',inputs:{},isPlanner:true})),
  ];
  const active=await getDb().select({toolSlug:purchases.toolSlug}).from(purchases).where(and(eq(purchases.buyerUserId,user.userId),eq(purchases.status,"paid_and_unlocked"),like(purchases.stripeSessionId,process.env.PEP_RALLY_COMMERCE_MODE==="test"?"cs_test_%":"cs_live_%")));
  const paidSlugs=new Set(active.map(p=>p.toolSlug));
  const plannerSlugs = new Set(planners.map(p=>p.toolSlug));
  const rallies = [...planners,...rows.filter(r=>!plannerSlugs.has(r.toolSlug)&&(!r.toolSlug.startsWith("catalog:")||paidSlugs.has(r.toolSlug))).map(row => ({ ...row, inputs: JSON.parse(row.inputs) }))];
  rallies.sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime());
  return Response.json({ user: { name: user.displayName }, rallies });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/") }, { status: 401 });
  const body = await request.json() as { toolSlug?: string; title?: string; inputs?: unknown; summary?: string };
  if (!body.toolSlug || !body.title || !body.summary) return Response.json({ error: "Missing rally details" }, { status: 400 });
  if (body.toolSlug.startsWith("catalog:")) {
    const [purchase] = await getDb().select({ id: purchases.id }).from(purchases).where(and(
      eq(purchases.buyerUserId, user.userId),
      eq(purchases.toolSlug, body.toolSlug),
      eq(purchases.status, "paid_and_unlocked"),
    like(purchases.stripeSessionId,process.env.PEP_RALLY_COMMERCE_MODE==="test"?"cs_test_%":"cs_live_%"),
    )).limit(1);
    if (!purchase) return Response.json({ error: "Purchase this Rally before saving it to your library.", purchaseRequired: true }, { status: 402 });
  }
  const now = new Date();
  const id = crypto.randomUUID();
  await getDb().insert(savedRallies).values({ id, userId: user.userId, toolSlug: body.toolSlug, title: body.title, inputs: JSON.stringify(body.inputs ?? {}), summary: body.summary, createdAt: now, updatedAt: now });
  return Response.json({ id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing rally id" }, { status: 400 });
  await getDb().delete(savedRallies).where(and(eq(savedRallies.id, id), eq(savedRallies.userId, user.userId)));
  return Response.json({ ok: true });
}
