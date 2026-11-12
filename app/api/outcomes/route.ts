import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { savedOutcomes } from "../../../db/schema";
import { newOutcomeSlug, validateSaveOutcomeBody } from "../../saved-outcomes";

export const dynamic = "force-dynamic";

// GET /api/outcomes?rallySlug=<slug> — the owner's latest saved outcome for
// one Rally (metadata only, no document), so a workspace can resume sharing
// across reloads: show the current link, or offer to create one.
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/library") }, { status: 401 });
  const rallySlug = new URL(request.url).searchParams.get("rallySlug") ?? "";
  if (!rallySlug) return Response.json({ error: "Choose a Rally." }, { status: 400 });
  const [row] = await getDb().select().from(savedOutcomes).where(and(eq(savedOutcomes.ownerUserId, user.userId), eq(savedOutcomes.rallySlug, rallySlug))).orderBy(desc(savedOutcomes.updatedAt)).limit(1);
  if (!row) return Response.json({ outcome: null });
  return Response.json({ outcome: { id: row.id, slug: row.slug, title: row.title, isPublic: row.isPublic === 1, updatedAt: row.updatedAt.toISOString() } });
}

// POST /api/outcomes — save an outcome. Without an id it creates a new row
// with a fresh unguessable slug; with an id it updates the owner's row and
// keeps the slug, so a shared link stays stable as the plan changes.
// Private by default: isPublic must be set true explicitly to share.
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/") }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 60000) return Response.json({ error: "This outcome is too large to save." }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "The outcome could not be read." }, { status: 400 }); }
  const checked = validateSaveOutcomeBody(body);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 422 });
  const { id, rallySlug, title, document, isPublic } = checked.value;
  const db = getDb();
  const now = new Date();

  if (id) {
    const [existing] = await db.select({ id: savedOutcomes.id, slug: savedOutcomes.slug }).from(savedOutcomes).where(and(eq(savedOutcomes.id, id), eq(savedOutcomes.ownerUserId, user.userId))).limit(1);
    if (!existing) return Response.json({ error: "That saved outcome could not be found." }, { status: 404 });
    await db.update(savedOutcomes).set({ title, document: JSON.stringify(document), isPublic: isPublic ? 1 : 0, updatedAt: now }).where(eq(savedOutcomes.id, id));
    return Response.json({ ok: true, id, slug: existing.slug, url: `/s/${existing.slug}`, isPublic });
  }

  // A slug collision is near-impossible (~60 bits), but retry rather than fail.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = newOutcomeSlug();
    const newId = crypto.randomUUID();
    try {
      await db.insert(savedOutcomes).values({ id: newId, ownerUserId: user.userId, rallySlug, title, document: JSON.stringify(document), slug, isPublic: isPublic ? 1 : 0, createdAt: now, updatedAt: now });
      return Response.json({ ok: true, id: newId, slug, url: `/s/${slug}`, isPublic }, { status: 201 });
    } catch (error) {
      // Drizzle wraps the driver error: the UNIQUE text lives on error.cause,
      // not on the DrizzleQueryError message ("Failed query: ...").
      const text = error instanceof Error ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}` : "";
      if (attempt === 2 || !(error instanceof Error) || !/UNIQUE/i.test(text)) throw error;
    }
  }
  return Response.json({ error: "The outcome could not be saved. Try again." }, { status: 500 });
}

// DELETE /api/outcomes?id=<id> — revoke a shared link (Part 1B, D1). The row
// is deleted, so the link stops working immediately and can never be
// re-enabled: a future share mints a fresh slug. The workspace itself is
// untouched — only the share record goes.
export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/library") }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return Response.json({ error: "Choose a shared outcome to revoke." }, { status: 400 });
  const db = getDb();
  const [existing] = await db.select({ id: savedOutcomes.id }).from(savedOutcomes).where(and(eq(savedOutcomes.id, id), eq(savedOutcomes.ownerUserId, user.userId))).limit(1);
  if (!existing) return Response.json({ error: "That shared outcome could not be found." }, { status: 404 });
  await db.delete(savedOutcomes).where(eq(savedOutcomes.id, id));
  return Response.json({ ok: true });
}
