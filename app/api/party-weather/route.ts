export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city")?.trim() || "";
  if (city.length < 2 || city.length > 100) return Response.json({ error: "Enter a city and state or country." }, { status: 400 });
  const headers = { "User-Agent": "PepRally (https://peprally.fun)", Accept: "application/geo+json" };
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`, { signal: AbortSignal.timeout(10000) });
    const geoData = await geo.json() as { results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }> };
    const place = geoData.results?.[0];
    if (!place) return Response.json({ error: `We could not find “${city}”. Try adding a state or country.` }, { status: 404 });
    const point = await fetch(`https://api.weather.gov/points/${place.latitude},${place.longitude}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!point.ok) return Response.json({ error: "National Weather Service forecasts are only available for U.S. locations. Use the official forecast for this destination." }, { status: 422 });
    const location = await point.json() as { properties?: { forecast?: string } };
    const url = location.properties?.forecast;
    if (!url || new URL(url).hostname !== "api.weather.gov") throw new Error("forecast URL");
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("forecast");
    const data = await response.json() as { properties: { updateTime: string; periods: Array<{ name: string; startTime: string; temperature: number; temperatureUnit: string; shortForecast: string; windSpeed: string; probabilityOfPrecipitation?: { value: number | null } }> } };
    return Response.json({ place: { name: place.name, region: place.admin1, country: place.country }, updated: data.properties.updateTime, periods: data.properties.periods.map(p => ({ name: p.name, date: p.startTime.slice(0, 10), temperature: p.temperature, unit: p.temperatureUnit, forecast: p.shortForecast, wind: p.windSpeed, rain: p.probabilityOfPrecipitation?.value ?? null })), source: "National Weather Service" }, { headers: { "Cache-Control": "public, max-age=900" } });
  } catch {
    return Response.json({ error: "The weather service is unavailable right now. Check the official forecast below and try again later." }, { status: 502 });
  }
}
