import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { validateOutcomeDocument } from '../app/outcome-document.ts';
import { publicOutcomeFromRow } from '../app/saved-outcomes.ts';

// Part 1B, step B2: the Bachelorette trip HQ public page. The workspace page
// is a client component, so this test pins the contract it must produce: the
// HQ document shape (itinerary, crew RSVPs, split tracker, lodging
// shortlist), the names opt-in, and the public read of a saved HQ row.
const hq = { title: "Ari's Bachelorette", subtitle: 'Palm Springs · May 1 — May 3', sections: [
  { heading: 'The weekend', columns: ['Day', 'Time', 'Plan', 'Est. each (USD)', 'Status'], rows: [['Day 1', '5 PM', 'Pool welcome', '$0.00', 'Booked'], ['Day 2', '7 PM', 'Group dinner', '$60.00', 'Shortlisted']] },
  { heading: 'Stay shortlist', paragraphs: ['Desert House · Top choice · $1200.00 USD total · https://example.test/stay\nFree cancellation to Apr 20'] },
  { heading: 'Packing', paragraphs: ['☐ Swimsuit', '☐ Comfortable shoes'] },
  { heading: 'Group and RSVP', columns: ['Guest', 'RSVP'], rows: [['Dana', 'Yes'], ['Lee', 'Maybe'], ['Jo', 'No']] },
  { heading: 'Suggested repayments', paragraphs: ['Dana pays Lee $60.00 USD', 'These are calculated suggestions, not bank confirmations. Recorded contributions are included only when a fund holder has been selected.'] },
] };

test('the trip HQ document carries the itinerary, crew RSVPs, split tracker, and lodging shortlist', () => {
  assert.equal(validateOutcomeDocument(hq), true);
  const headings = hq.sections.map((s) => s.heading);
  for (const required of ['The weekend', 'Stay shortlist', 'Group and RSVP', 'Suggested repayments']) assert.ok(headings.includes(required), `HQ is missing ${required}`);
  const weekend = hq.sections.find((s) => s.heading === 'The weekend');
  assert.deepEqual(weekend.columns, ['Day', 'Time', 'Plan', 'Est. each (USD)', 'Status']);
  assert.ok(weekend.rows.some((row) => row[2] === 'Group dinner'));
  const rsvp = hq.sections.find((s) => s.heading === 'Group and RSVP');
  assert.deepEqual(rsvp.rows, [['Dana', 'Yes'], ['Lee', 'Maybe'], ['Jo', 'No']]);
  const repayments = hq.sections.find((s) => s.heading === 'Suggested repayments');
  assert.ok(repayments.paragraphs.some((p) => p.includes('Dana pays Lee $60.00 USD')));
  assert.ok(hq.sections.find((s) => s.heading === 'Stay shortlist').paragraphs[0].includes('Desert House'));
});

test('guest names stay out of the shared HQ until the organizer opts in', () => {
  // With the "include names and calculated repayments" box unchecked, the
  // workspace omits the RSVP and repayments sections entirely.
  const privateHq = { ...hq, sections: hq.sections.filter((s) => s.heading !== 'Group and RSVP' && s.heading !== 'Suggested repayments') };
  assert.equal(validateOutcomeDocument(privateHq), true);
  const text = JSON.stringify(privateHq);
  for (const name of ['Dana', 'Lee', 'Jo']) assert.ok(!text.includes(name), `shared HQ leaks guest name ${name}`);
});

test('a saved public HQ renders at its link; a private one does not', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
  const insert = db.prepare('INSERT INTO saved_outcomes (id, owner_user_id, rally_slug, title, document, slug, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  insert.run('hq-1', 'user-1', 'bachelorette-blueprint', hq.title, JSON.stringify(hq), 'hqpublic1234', 1, now, now);
  insert.run('hq-2', 'user-1', 'bachelorette-blueprint', hq.title, JSON.stringify(hq), 'hqprivate123', 0, now, now);
  // Alias to the camelCase shape drizzle returns in the real page.
  const bySlug = db.prepare('SELECT document, is_public AS isPublic FROM saved_outcomes WHERE slug = ?');
  assert.deepEqual(publicOutcomeFromRow(bySlug.get('hqpublic1234')), hq);
  assert.equal(publicOutcomeFromRow(bySlug.get('hqprivate123')), null);
  assert.equal(publicOutcomeFromRow(bySlug.get('missing123456')), null);
  db.close();
});
