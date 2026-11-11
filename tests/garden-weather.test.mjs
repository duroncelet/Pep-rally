import test from 'node:test';
import assert from 'node:assert/strict';
import { gardenWeatherActions } from '../app/rally/garden/weather-actions.ts';

// The location-change auto-reload lives in a React effect in
// app/rally/garden/page.tsx (debounced fetch after the location changes,
// gated on a built plan). It needs a rendered component plus a mocked fetch,
// so it is not unit-testable here; it is verified by the production build and
// by the behaviour described in the PR, not by a faked test below.

const DRY = 'Dry week ahead: check soil moisture daily; containers may need more frequent watering.';
const RAINY = 'Rainy stretch ahead: pause automatic watering and check drainage after the heaviest day.';
const MODERATE = 'Conditions look moderate. Keep the normal soil-check and watering rhythm.';

function week({ rain = [0, 0, 0, 0, 0, 0, 0], chances = [0, 0, 0, 0, 0, 0, 0], high = 22, low = 12, wind = 10 }) {
  return { daily: { temperature_2m_max: Array(7).fill(high), temperature_2m_min: Array(7).fill(low), precipitation_sum: rain, precipitation_probability_max: chances, wind_speed_10m_max: Array(7).fill(wind) } };
}

test('a high-chance rainy week is never called dry, even when total rain is under 4mm', () => {
  const actions = gardenWeatherActions(week({ rain: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], chances: [80, 70, 90, 60, 75, 85, 65] }));
  assert.ok(!actions.includes(DRY));
  assert.ok(actions.includes(MODERATE));
});

test('a single likely-rain day keeps a low-rain week from being called dry', () => {
  const actions = gardenWeatherActions(week({ rain: [0, 0, 0, 0, 0, 0, 0], chances: [10, 10, 10, 50, 10, 10, 10] }));
  assert.ok(!actions.includes(DRY));
});

test('a genuinely dry week with low rain chances still gets dry-week advice', () => {
  const actions = gardenWeatherActions(week({ rain: [0.2, 0, 0.5, 0, 0, 0.3, 0], chances: [10, 20, 0, 15, 5, 30, 10] }));
  assert.ok(actions.includes(DRY));
});

test('the likely-rain threshold is 50%: 49% can still be dry, 50% cannot', () => {
  assert.ok(gardenWeatherActions(week({ chances: [49, 0, 0, 0, 0, 0, 0] })).includes(DRY));
  assert.ok(!gardenWeatherActions(week({ chances: [50, 0, 0, 0, 0, 0, 0] })).includes(DRY));
});

test('a wet week still gets rainy advice and missing probability data falls back to millimetres', () => {
  assert.ok(gardenWeatherActions(week({ rain: [5, 5, 5, 5, 5, 0, 0] })).includes(RAINY));
  const noChances = week({ rain: [0, 0, 0, 0, 0, 0, 0] });
  delete noChances.daily.precipitation_probability_max;
  assert.ok(gardenWeatherActions(noChances).includes(DRY));
});

test('heat, cold, and wind watches still fire when dry advice is suppressed by rain chance', () => {
  const actions = gardenWeatherActions(week({ rain: [0, 0, 0, 0, 0, 0, 0], chances: [80, 80, 80, 80, 80, 80, 80], high: 34, low: 2, wind: 40 }));
  assert.ok(!actions.includes(DRY));
  assert.ok(actions.some((action) => action.startsWith('Heat watch:')));
  assert.ok(actions.some((action) => action.startsWith('Cold-night watch:')));
  assert.ok(actions.some((action) => action.startsWith('Wind watch:')));
});

test('no weather means no actions', () => {
  assert.deepEqual(gardenWeatherActions(null), []);
});
