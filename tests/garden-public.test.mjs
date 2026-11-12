import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { validateOutcomeDocument } from '../app/outcome-document.ts';
import { publicOutcomeFromRow } from '../app/saved-outcomes.ts';

// Part 1B, step B3: the Garden public page — the living season dashboard.
// Pins the contract the workspace must produce: layout, planting calendar,
// week-by-week care tasks, and the forecast note; the private journal stays
// out.
const dashboard = { title: 'My garden', subtitle: 'Portland · 6-8 hours · 2 plots', sections: [
  { heading: 'This week', paragraphs: ['Rain likely Thursday — hold off watering.', 'Water the seedlings — This week'] },
  { heading: 'Bed 1', paragraphs: ['Raised bed · 8 × 4 ft. Crop groups, not plant counts. Check variety spacing before planting.'], grid: { columns: 2, cells: ['Tomatoes', 'Lettuce', 'Open', 'Open'] } },
  { heading: 'Bed 2', paragraphs: ['In-ground · 6 × 4 ft. Crop groups, not plant counts. Check variety spacing before planting.'], grid: { columns: 2, cells: ['Beans', 'Herbs', 'Open', 'Open'] } },
  { heading: 'My planting calendar', paragraphs: ['Zone: 8b. Last frost: 2027-04-10. First frost: 2027-11-01.', 'Source: gardener-recorded. These are gardener-recorded dates, not guarantees or an automatic local lookup.', 'Tomatoes: outdoor target 2027-05-10; planted not recorded; packet harvest range 60–80 days.'] },
  { heading: 'Care board', paragraphs: ['To do: Water the seedlings - This week', 'Done: Mulch Bed 1 - Last week'] },
  { heading: 'Forecast note', paragraphs: ['Forecast for Portland, loaded during this session. Source: Open-Meteo.', 'Forecasts change; refresh in the live garden before making a weather-dependent decision.'] },
] };

test('the garden dashboard carries layout, planting calendar, care tasks, and forecast', () => {
  assert.equal(validateOutcomeDocument(dashboard), true);
  const headings = dashboard.sections.map((s) => s.heading);
  for (const required of ['This week', 'Bed 1', 'My planting calendar', 'Care board', 'Forecast note']) assert.ok(headings.includes(required), `dashboard is missing ${required}`);
  const bed = dashboard.sections.find((s) => s.heading === 'Bed 1');
  assert.equal(bed.grid.columns, 2);
  assert.ok(bed.grid.cells.includes('Tomatoes'));
  const care = dashboard.sections.find((s) => s.heading === 'Care board');
  assert.ok(care.paragraphs.some((p) => p.startsWith('To do:')));
  assert.ok(care.paragraphs.some((p) => p.startsWith('Done:')));
  const forecast = dashboard.sections.find((s) => s.heading === 'Forecast note');
  assert.ok(forecast.paragraphs[0].includes('Forecast for Portland'));
  // The private journal is never part of the shared page.
  assert.ok(!headings.some((h) => h.toLowerCase().includes('journal')));
});

test('a saved public garden dashboard renders at its link; a private one does not', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
  const insert = db.prepare('INSERT INTO saved_outcomes (id, owner_user_id, rally_slug, title, document, slug, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  insert.run('garden-1', 'user-1', 'garden-planner', dashboard.title, JSON.stringify(dashboard), 'gardenpub123', 1, now, now);
  insert.run('garden-2', 'user-1', 'garden-planner', dashboard.title, JSON.stringify(dashboard), 'gardenprv123', 0, now, now);
  const bySlug = db.prepare('SELECT document, is_public AS isPublic FROM saved_outcomes WHERE slug = ?');
  assert.deepEqual(publicOutcomeFromRow(bySlug.get('gardenpub123')), dashboard);
  assert.equal(publicOutcomeFromRow(bySlug.get('gardenprv123')), null);
  db.close();
});
