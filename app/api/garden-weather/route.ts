export const dynamic = "force-dynamic";

type GeoResult = { id:number; name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string };

export async function GET(request: Request) {
 try {
  const location = new URL(request.url).searchParams.get("location")?.trim();
  if (!location || location.length < 2 || location.length>160) return Response.json({ error: "Add a city or postal code (2–160 characters)." }, { status: 400 });

  const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location.split(',')[0].trim())}&count=10&language=en&format=json`,{signal:AbortSignal.timeout(8000)});
  if (!geoResponse.ok) return Response.json({ error: "Location lookup is unavailable right now." }, { status: 502 });
  const geoData = await geoResponse.json() as { results?: GeoResult[] };
  const candidates=geoData.results || [];
  const selected=new URL(request.url).searchParams.get('place');
  if(!selected && candidates.length>1) return Response.json({choices:candidates.map(p=>({id:p.id,name:p.name,region:p.admin1,country:p.country}))},{headers:{'Cache-Control':'public, max-age=300'}});
  const place = selected ? candidates.find(p=>String(p.id)===selected) : candidates[0];
  if (!place) return Response.json({ error: "We could not find that location. Try a city and state or a postal code." }, { status: 404 });

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    timezone: "auto",
    forecast_days: "7",
    current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration",
  });
  const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{signal:AbortSignal.timeout(8000)});
  if (!forecastResponse.ok) return Response.json({ error: "Forecast is unavailable right now." }, { status: 502 });
  const forecast = await forecastResponse.json();
  if (!forecast.current || !['temperature_2m','apparent_temperature','precipitation','wind_speed_10m'].every(key => typeof forecast.current[key] === 'number' && Number.isFinite(forecast.current[key])) || !forecast.current_units || typeof forecast.current_units.wind_speed_10m !== 'string' || !forecast.current_units.wind_speed_10m.trim()) return Response.json({error:'The forecast is incomplete. Please retry later.'},{status:502});
  if(!forecast.current || !forecast.daily || !Array.isArray(forecast.daily.time) || !forecast.daily.time.length || !['temperature_2m_max','temperature_2m_min','precipitation_sum','precipitation_probability_max','wind_speed_10m_max'].every(key=>Array.isArray(forecast.daily[key]) && forecast.daily[key].length===forecast.daily.time.length && forecast.daily[key].every((v:unknown)=>typeof v==='number' && Number.isFinite(v)))) return Response.json({error:'The forecast is incomplete. Please retry later.'},{status:502});
  return Response.json({
    fetchedAt:new Date().toISOString(),
    place: { name: place.name, region: place.admin1, country: place.country, latitude: place.latitude, longitude: place.longitude },
    current: forecast.current,
    currentUnits: forecast.current_units,
    daily: forecast.daily,
    dailyUnits: forecast.daily_units,
    source: "Open-Meteo",
    sourceUrl: "https://open-meteo.com/en/docs",
  },{headers:{'Cache-Control':'public, max-age=900'}});
 } catch { return Response.json({error:'Weather is temporarily unavailable. Your garden and journal still work; please retry.'},{status:503}); }
}
