import { destinationFor, validTripDates } from "../../rally/bachelorette/destinations";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const destination = destinationFor(query.get("city") || "");
  const start = query.get("start") || "", end = query.get("end") || "";
  if (!destination || !validTripDates(start, end)) return Response.json({ error: "Choose a featured city and valid arrival/departure dates, up to 31 days apart." }, { status: 400 });
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return Response.json({ error: "In-app concert listings are not connected yet. Use the Ticketmaster search below, then save your choice here.", needsCredential: true }, { status: 503 });
  try {
    // Local dates avoid shifting a late-night event onto the wrong trip day.
    const params = new URLSearchParams({ apikey: key, city: destination.name, stateCode: destination.state, countryCode: "US", classificationName: "music", localStartDateTime: `${start}T00:00:00,${end}T23:59:59`, size: "20", sort: "date,asc" });
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("provider");
    const data = await response.json() as { _embedded?: { events?: Array<{ id: string; name: string; url: string; dates?: { start?: { localDate?: string; localTime?: string }; status?: { code?: string } }; _embedded?: { venues?: Array<{ name?: string }> } }> } };
    const events = (data._embedded?.events || []).filter(e => { try { const u = new URL(e.url); return u.protocol === "https:" && (u.hostname === "ticketmaster.com" || u.hostname.endsWith(".ticketmaster.com")); } catch { return false; } }).map(e => ({ id: e.id, name: e.name, url: e.url, date: e.dates?.start?.localDate, time: e.dates?.start?.localTime, status: e.dates?.status?.code || "Check provider", venue: e._embedded?.venues?.[0]?.name || "See provider" }));
    return Response.json({ events, checked: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch { return Response.json({ error: "Ticketmaster could not return listings right now. Use the provider search below." }, { status: 502 }); }
}
