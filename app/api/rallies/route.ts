import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { savedRallies } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/") }, { status: 401 });
  const rows = await getDb().select().from(savedRallies).where(eq(savedRallies.userId, user.userId)).orderBy(desc(savedRallies.updatedAt)).limit(50);
  return Response.json({ user: { name: user.displayName, email: user.email }, rallies: rows.map(row => ({ ...row, inputs: JSON.parse(row.inputs) })) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/") }, { status: 401 });
  const body = await request.json() as { toolSlug?: string; title?: string; inputs?: unknown; summary?: string };
  if (!body.toolSlug || !body.title || !body.summary) return Response.json({ error: "Missing rally details" }, { status: 400 });
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
