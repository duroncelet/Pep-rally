import { validTripDates } from "../../rally/bachelorette/destinations";
export const dynamic = "force-dynamic";

type TicketmasterEvent = { id: string; name: string; url: string; dates?: { start?: { localDate?: string; localTime?: string }; status?: { code?: string } }; _embedded?: { venues?: Array<{ name?: string }> } };

// Time-aware sourcing for the trip dates: concerts, shows, sports, and comedy
// happening that weekend, from the Ticketmaster Discovery API. Accepts either
// a resolved place (lat/lon, preferred — a city name can match the wrong
// city) or a city string. Every returned event carries its real Ticketmaster
// link; nothing is invented, and an empty weekend says so plainly.
const CLASSIFICATIONS = ["music", "sports", "arts & theatre"];

function validLatLon(lat: string | null, lon: string | null): { lat: number; lon: number } | null {
  if (lat === null || lon === null) return null;
  const latitude = Number(lat), longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { lat: latitude, lon: longitude };
}

function toEvent(e: TicketmasterEvent) {
  try {
    const u = new URL(e.url);
    if (u.protocol !== "https:" || !(u.hostname === "ticketmaster.com" || u.hostname.endsWith(".ticketmaster.com"))) return null;
  } catch { return null; }
  return { id: e.id, name: e.name, url: e.url, date: e.dates?.start?.localDate, time: e.dates?.start?.localTime, status: e.dates?.status?.code || "Check provider", venue: e._embedded?.venues?.[0]?.name || "See provider" };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const city = query.get("city")?.trim() || "";
  const start = query.get("start") || "", end = query.get("end") || "";
  const point = validLatLon(query.get("lat"), query.get("lon"));
  if ((!point && city.length < 2) || !validTripDates(start, end)) return Response.json({ error: "Enter any city and valid arrival/departure dates, up to 31 days apart." }, { status: 400 });
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return Response.json({ error: "In-app concert listings are not connected yet. Use the Ticketmaster search below, then save your choice here.", needsCredential: true }, { status: 503 });
  try {
    // Local dates avoid shifting a late-night event onto the wrong trip day.
    const range = `${start}T00:00:00,${end}T23:59:59`;
    const results = await Promise.all(CLASSIFICATIONS.map(async (classificationName) => {
      const params = new URLSearchParams({ apikey: key, classificationName, localStartDateTime: range, size: "20", sort: "date,asc" });
      if (point) { params.set("geoPoint", `${point.lat},${point.lon}`); params.set("radius", "50"); params.set("unit", "miles"); }
      else { params.set("city", city); params.set("countryCode", "US"); }
      const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("provider");
      const data = await response.json() as { _embedded?: { events?: TicketmasterEvent[] } };
      return data._embedded?.events || [];
    }));
    const seen = new Set<string>();
    const events = results.flat().map(toEvent).filter((e): e is NonNullable<typeof e> => Boolean(e) && !seen.has(e.id) && (seen.add(e.id), true))
      .sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`)).slice(0, 20);
    return Response.json({ events, checked: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch { return Response.json({ error: "Ticketmaster could not return listings right now. Use the provider search below." }, { status: 502 }); }
}
