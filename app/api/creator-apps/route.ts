import { desc, eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { creatorApps } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/") }, { status: 401 });
  const apps = await getDb().select().from(creatorApps).where(eq(creatorApps.creatorUserId, user.userId)).orderBy(desc(creatorApps.updatedAt));
  return Response.json({ apps });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/") }, { status: 401 });
  const body = await request.json() as { name?:string; problem?:string; outcome?:string; proof?:string; accessModel?:string; price?:number; sourceType?:string; sourceUrl?:string; sourceFileKey?:string; builderSpec?:string };
  if (!body.name?.trim() || !body.problem?.trim() || !body.outcome?.trim() || !body.proof?.trim()) return Response.json({ error: "Complete the app brief" }, { status: 400 });
  const now = new Date();
  const sourceType = ["live", "code", "guided"].includes(body.sourceType ?? "") ? body.sourceType! : "guided";
  const app = { id: crypto.randomUUID(), creatorUserId: user.userId, creatorEmail: user.email, name: body.name.trim(), problem: body.problem.trim(), outcome: body.outcome.trim(), proof: body.proof.trim(), accessModel: body.accessModel === "paid" ? "paid" : "free", priceCents: body.accessModel === "paid" ? Math.max(0, Math.round((body.price ?? 0) * 100)) : 0, stage: "draft", sourceType, sourceUrl: sourceType === "live" ? body.sourceUrl?.trim() || null : null, sourceFileKey: sourceType === "code" ? body.sourceFileKey || null : null, builderSpec: sourceType === "guided" ? body.builderSpec?.trim() || null : null, createdAt: now, updatedAt: now };
  await getDb().insert(creatorApps).values(app);
  return Response.json({ app }, { status: 201 });
}
