import { destinationFor } from "../../rally/bachelorette/destinations";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const destination = destinationFor(new URL(request.url).searchParams.get("city") || "");
  if (!destination) return Response.json({ error: "Forecasts are available for the five featured destinations." }, { status: 400 });
  const headers = { "User-Agent": "PepRally (https://peprally.fun)", Accept: "application/geo+json" };
  try {
    const point = await fetch(`https://api.weather.gov/points/${destination.lat},${destination.lon}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!point.ok) throw new Error("point");
    const location = await point.json() as { properties?: { forecast?: string } };
    const url = location.properties?.forecast;
    if (!url || new URL(url).hostname !== "api.weather.gov") throw new Error("forecast URL");
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("forecast");
    const data = await response.json() as { properties: { updateTime: string; periods: Array<{ name: string; startTime: string; temperature: number; temperatureUnit: string; shortForecast: string; windSpeed: string; probabilityOfPrecipitation?: { value: number | null } }> } };
    return Response.json({ updated: data.properties.updateTime, periods: data.properties.periods.map(p => ({ name: p.name, date: p.startTime.slice(0, 10), temperature: p.temperature, unit: p.temperatureUnit, forecast: p.shortForecast, wind: p.windSpeed, rain: p.probabilityOfPrecipitation?.value ?? null })), source: "National Weather Service" }, { headers: { "Cache-Control": "public, max-age=900" } });
  } catch {
    return Response.json({ error: "The weather service is unavailable right now. Check the official forecast below and try again later." }, { status: 502 });
  }
}
