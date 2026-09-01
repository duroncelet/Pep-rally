import { and, avg, count, desc, eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { creatorApps, rallyReviews, savedRallies } from "../../../db/schema";

export const dynamic = "force-dynamic";

const validSlugs = new Set(["bachelorette-blueprint", "garden-planner"]);

export async function GET() {
  const db = getDb();
  const runRows = await db
    .select({ toolSlug: savedRallies.toolSlug, runs: count() })
    .from(savedRallies)
    .groupBy(savedRallies.toolSlug);
  const ratingRows = await db
    .select({ toolSlug: rallyReviews.toolSlug, reviewCount: count(), averageRating: avg(rallyReviews.rating) })
    .from(rallyReviews)
    .groupBy(rallyReviews.toolSlug);
  const reviews = await db.select({
    id: rallyReviews.id,
    toolSlug: rallyReviews.toolSlug,
    reviewerName: rallyReviews.reviewerName,
    rating: rallyReviews.rating,
    body: rallyReviews.body,
    updatedAt: rallyReviews.updatedAt,
  }).from(rallyReviews).orderBy(desc(rallyReviews.updatedAt)).limit(24);
  const communityRows = await db.select({
    id: creatorApps.id,
    name: creatorApps.name,
    creatorName: creatorApps.creatorName,
    outcome: creatorApps.outcome,
    proof: creatorApps.proof,
    accessModel: creatorApps.accessModel,
    priceCents: creatorApps.priceCents,
    sourceUrl: creatorApps.sourceUrl,
    parentSlug: creatorApps.parentSlug,
    parentTitle: creatorApps.parentTitle,
    updatedAt: creatorApps.updatedAt,
  }).from(creatorApps).where(eq(creatorApps.stage, "published")).orderBy(desc(creatorApps.updatedAt)).limit(24);

  const stats = Object.fromEntries([...validSlugs].map((toolSlug) => {
    const runs = runRows.find((row) => row.toolSlug === toolSlug)?.runs ?? 0;
    const ratings = ratingRows.find((row) => row.toolSlug === toolSlug);
    return [toolSlug, {
      runs,
      reviewCount: ratings?.reviewCount ?? 0,
      averageRating: ratings?.averageRating ? Number(ratings.averageRating) : null,
      reviews: reviews.filter((review) => review.toolSlug === toolSlug).slice(0, 6),
    }];
  }));

  const listings = communityRows.map((item) => ({ ...item, sourceUrl: item.accessModel === "free" ? item.sourceUrl : null }));
  return Response.json({ stats, listings });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/#reviews") }, { status: 401 });
  const body = await request.json() as { toolSlug?: string; rating?: number; review?: string };
  const toolSlug = body.toolSlug ?? "";
  const review = body.review?.trim() ?? "";
  const rating = Math.round(Number(body.rating));
  if (!validSlugs.has(toolSlug) || rating < 1 || rating > 5 || review.length < 12 || review.length > 500) {
    return Response.json({ error: "Add a 1–5 star rating and a review between 12 and 500 characters." }, { status: 400 });
  }
  const used = await getDb().select({ id: savedRallies.id }).from(savedRallies)
    .where(and(eq(savedRallies.userId, user.userId), eq(savedRallies.toolSlug, toolSlug))).limit(1);
  if (!used.length) return Response.json({ error: "Use or save this Rally before reviewing it." }, { status: 403 });

  const now = new Date();
  await getDb().insert(rallyReviews).values({
    id: crypto.randomUUID(), toolSlug, reviewerUserId: user.userId,
    reviewerName: user.displayName || "Verified user", rating, body: review,
    createdAt: now, updatedAt: now,
  }).onConflictDoUpdate({
    target: [rallyReviews.toolSlug, rallyReviews.reviewerUserId],
    set: { reviewerName: user.displayName || "Verified user", rating, body: review, updatedAt: now },
  });
  return Response.json({ ok: true });
}
