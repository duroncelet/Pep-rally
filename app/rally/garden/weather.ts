type DailyWeather = {
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  wind_speed_10m_max: number[];
};

export function gardenWeatherActions(daily: DailyWeather): string[] {
  const rain = daily.precipitation_sum.reduce((sum, value) => sum + value, 0);
  const likelyRain = daily.precipitation_probability_max.some(value => value >= 50);
  const actions: string[] = [];
  if (rain > 20) actions.push("Rainy stretch ahead: check soil moisture before watering and inspect drainage after the heaviest day.");
  else if (likelyRain) actions.push("Rain is possible this week: check the daily forecast and soil moisture before deciding to water.");
  else if (rain < 4) actions.push("Little rain is forecast: check soil moisture daily; containers may need more frequent checks.");
  if (Math.max(...daily.temperature_2m_max) >= 32) actions.push("Heat watch: water early, mulch exposed soil, and give tender transplants afternoon shade.");
  if (Math.min(...daily.temperature_2m_min) <= 4) actions.push("Cold-night watch: delay tender planting or keep row cover ready.");
  if (Math.max(...daily.wind_speed_10m_max) >= 35) actions.push("Wind watch: secure trellises, pots, and young stems before the windiest day.");
  if (!actions.length) actions.push("Conditions look moderate. Keep the normal soil-check and watering rhythm.");
  return actions;
}

// Invalidating when inputs change prevents old responses from replacing a newer location.
export function weatherRequestGate() {
  let version = 0;
  return { invalidate: () => { version++; }, begin: () => { const request = ++version; return () => request === version; } };
}
