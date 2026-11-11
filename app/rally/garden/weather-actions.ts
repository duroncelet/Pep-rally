/** Weather-aware garden actions, kept pure so the advice rules are unit-testable.
 * Dry-week advice is keyed off rain probability, not millimetres: a week of
 * likely-but-light rain is not a dry week. */
export type GardenWeather = {
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max?: number[] | null;
    wind_speed_10m_max: number[];
  };
};

const RAINY_RAIN_MM = 20;
const DRY_RAIN_MM = 4;
/** A day at or above this rain chance counts as a likely-rain day; a week with
 * one is never called dry. */
const LIKELY_RAIN_CHANCE = 50;

export function gardenWeatherActions(weather: GardenWeather | null): string[] {
  if (!weather) return [];
  const rain = weather.daily.precipitation_sum.reduce((sum, value) => sum + value, 0);
  const hottest = Math.max(...weather.daily.temperature_2m_max);
  const coldest = Math.min(...weather.daily.temperature_2m_min);
  const windiest = Math.max(...weather.daily.wind_speed_10m_max);
  const rainChances = (weather.daily.precipitation_probability_max ?? []).filter((value) => Number.isFinite(value));
  const rainiestChance = rainChances.length ? Math.max(...rainChances) : 0;
  const actions: string[] = [];
  if (rain > RAINY_RAIN_MM) actions.push("Rainy stretch ahead: pause automatic watering and check drainage after the heaviest day.");
  else if (rain < DRY_RAIN_MM && rainiestChance < LIKELY_RAIN_CHANCE) actions.push("Dry week ahead: check soil moisture daily; containers may need more frequent watering.");
  if (hottest >= 32) actions.push("Heat watch: water early, mulch exposed soil, and give tender transplants afternoon shade.");
  if (coldest <= 4) actions.push("Cold-night watch: delay tender planting or keep row cover ready.");
  if (windiest >= 35) actions.push("Wind watch: secure trellises, pots, and young stems before the windiest day.");
  if (!actions.length) actions.push("Conditions look moderate. Keep the normal soil-check and watering rhythm.");
  return actions;
}
