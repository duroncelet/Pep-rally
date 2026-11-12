import { getDb } from "../../../db";
import { waitlistSignups } from "../../../db/schema";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public POST: the repo's first signed-out write endpoint, correct for a
// waitlist. Same abuse guards as /api/support: same-origin check plus a
// body-size cap. No CAPTCHA in v1.
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Join the waitlist from Pep Rally." }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2000)
    return Response.json({ error: "That request was too large." }, { status: 413 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Check your email address." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email))
    return Response.json({ error: "Enter a valid email address." }, { status: 422 });
  const source = typeof body.source === "string" && body.source.trim()
    ? body.source.trim().slice(0, 50)
    : "homepage";
  let db;
  try {
    db = getDb();
  } catch {
    return Response.json({ error: "The waitlist is unavailable. Please retry later." }, { status: 503 });
  }
  try {
    await db.insert(waitlistSignups).values({
      id: crypto.randomUUID(),
      email,
      source,
      createdAt: new Date(),
    });
  } catch (error) {
    // A duplicate signup is not an error for the visitor: the UI renders
    // the 409 in the success style ("You're already on the list.").
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed"))
      return Response.json({ ok: true, already: true, message: "You're already on the list." }, { status: 409 });
    return Response.json({ error: "Something went wrong — try again in a minute." }, { status: 500 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
