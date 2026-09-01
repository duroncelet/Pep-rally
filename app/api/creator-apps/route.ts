import { and, desc, eq } from "drizzle-orm";
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
  if (sourceType === "live" && !/^https:\/\//i.test(body.sourceUrl?.trim() || "")) return Response.json({ error: "Add a secure https:// link to the working mini-app" }, { status: 400 });
  if (sourceType === "code" && !body.sourceFileKey) return Response.json({ error: "Upload the app files first" }, { status: 400 });
  const app = { id: crypto.randomUUID(), creatorUserId: user.userId, creatorEmail: user.email, creatorName: user.fullName || "Pep Rally maker", name: body.name.trim(), problem: body.problem.trim(), outcome: body.outcome.trim(), proof: body.proof.trim(), accessModel: body.accessModel === "paid" ? "paid" : "free", priceCents: body.accessModel === "paid" ? Math.max(100, Math.round((body.price ?? 0) * 100)) : 0, stage: sourceType === "guided" ? "draft" : "submitted", sourceType, sourceUrl: sourceType === "live" ? body.sourceUrl?.trim() || null : null, sourceFileKey: sourceType === "code" ? body.sourceFileKey || null : null, builderSpec: sourceType === "guided" ? body.builderSpec?.trim() || null : null, createdAt: now, updatedAt: now };
  await getDb().insert(creatorApps).values(app);
  return Response.json({ app }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/build") }, { status: 401 });
  const body = await request.json() as { id?: string; action?: string };
  if (!body.id || !["publish", "unpublish"].includes(body.action || "")) return Response.json({ error: "Choose a valid listing action" }, { status: 400 });
  const db = getDb();
  const [app] = await db.select().from(creatorApps).where(and(eq(creatorApps.id, body.id), eq(creatorApps.creatorUserId, user.userId))).limit(1);
  if (!app) return Response.json({ error: "Rally not found" }, { status: 404 });
  if (body.action === "publish" && (app.sourceType !== "live" || !app.sourceUrl)) return Response.json({ error: "A working live URL is required before this Rally can enter the marketplace." }, { status: 409 });
  const stage = body.action === "publish" ? "published" : "submitted";
  await db.update(creatorApps).set({ stage, updatedAt: new Date() }).where(eq(creatorApps.id, app.id));
  return Response.json({ ok: true, stage });
}
