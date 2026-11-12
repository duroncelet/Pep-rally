import { placeLabel } from "../../rally/bachelorette/planner";

export const dynamic = "force-dynamic";

// Geo autocomplete for the Bachelorette destination field: city, county, ZIP,
// or neighborhood, resolved to a real place (name + coordinates) via the
// Open-Meteo geocoding API — the same provider the weather routes already use,
// no API key required. Everything downstream keys off the resolved place.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 160) {
    return Response.json({ error: "Type at least 2 characters to search for a place." }, { status: 400 });
  }
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return Response.json({ error: "Place lookup is unavailable right now. You can still type a destination." }, { status: 502 });
    const data = (await response.json()) as {
      results?: Array<{ id: number; name: string; admin1?: string; admin2?: string; country?: string; latitude: number; longitude: number }>;
    };
    const places = (data.results || []).map((place) => ({
      id: place.id,
      name: place.name,
      region: place.admin1,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      label: placeLabel(place),
    }));
    return Response.json({ places }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return Response.json({ error: "Place lookup is unavailable right now. You can still type a destination." }, { status: 502 });
  }
}
