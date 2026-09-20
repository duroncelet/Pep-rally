export const dynamic = "force-dynamic";

type GeoResult = { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string };

export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location")?.trim();
  if (!location || location.length < 2) return Response.json({ error: "Add a city or postal code." }, { status: 400 });

  const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
  if (!geoResponse.ok) return Response.json({ error: "Location lookup is unavailable right now." }, { status: 502 });
  const geoData = await geoResponse.json() as { results?: GeoResult[] };
  const place = geoData.results?.[0];
  if (!place) return Response.json({ error: "We could not find that location. Try a city and state or a postal code." }, { status: 404 });

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    timezone: "auto",
    forecast_days: "7",
    current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration",
  });
  const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!forecastResponse.ok) return Response.json({ error: "Forecast is unavailable right now." }, { status: 502 });
  const forecast = await forecastResponse.json();
  return Response.json({
    place: { name: place.name, region: place.admin1, country: place.country, latitude: place.latitude, longitude: place.longitude },
    current: forecast.current,
    currentUnits: forecast.current_units,
    daily: forecast.daily,
    dailyUnits: forecast.daily_units,
    source: "Open-Meteo",
    sourceUrl: "https://open-meteo.com/en/docs",
  });
}
