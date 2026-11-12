import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { PDFDocument } from 'pdf-lib';
import { findConcept } from '../app/catalog.ts';
import { createWorkingResult } from '../app/rally-results.ts';
import { marketOutcomeDocument, PACKET_SLUGS, PDF_FIRST_SLUGS } from '../app/market-outcome-pdf.ts';
import { validateOutcomeDocument } from '../app/outcome-document.ts';
import { OUTCOME_RALLY_SLUGS, publicOutcomeFromRow } from '../app/saved-outcomes.ts';
import { renderOutcomePdf, validatePdfDocument } from '../app/outcome-pdf.ts';

// Part 1B, step C1: Festival Planner (new Rally) — the lineup wishlist.
// Generic name only; no schedule or conflict flags until set times publish.
const answers = {
  'Festival, artists, and days': 'Desert Bloom Festival; Friday: The Wanderers, June Park; Saturday: Glass Tide',
  'Outfit ideas by day': 'Friday: linen shirt, boots; Saturday: vintage tee, denim shorts',
  'Group members and shared costs': 'Maya, Jordan, Sam; house $900, tickets $450 each',
};

test('the Festival Planner listing is generic and promises the wishlist', () => {
  const concept = findConcept('festival-planner');
  assert.ok(concept);
  assert.equal(concept.status, 'working');
  assert.deepEqual(concept.outcome, ['Artist wishlist by day', 'Outfit plan per day', 'Packing list', 'Group cost split', 'Your own festival page + a PDF packet to keep']);
  // No trademark anywhere in the listing.
  const text = JSON.stringify(concept).toLowerCase();
  assert.ok(!text.includes('coachella'), 'listing leans on the Coachella trademark');
  assert.ok(concept.guardrail.includes('No schedule or conflict flags'));
});

test('the wishlist produces artists, outfits, packing, and a cost split — no schedule', () => {
  const concept = findConcept('festival-planner');
  const result = createWorkingResult(concept, answers);
  assert.deepEqual(result.sections.map((s) => s.title), ['Artist wishlist by day', 'Outfit plan per day', 'Group cost split', 'Packing list']);
  assert.ok(result.sections[0].items.some((item) => item.includes('The Wanderers')));
  assert.ok(result.sections[0].items.some((item) => item.includes('Glass Tide')));
  assert.ok(result.sections[1].items.some((item) => item.includes('linen shirt')));
  assert.ok(result.sections[2].items.some((item) => item.includes('house $900')));
  assert.ok(result.sections[3].items.includes('Portable charger'));
  for (const section of result.sections) {
    assert.ok(!/schedule|conflict|set time/i.test(section.title), `wishlist has a schedule section: ${section.title}`);
  }
});

test('the Festival wishlist produces a packet like Bachelorette', async () => {
  assert.ok(PACKET_SLUGS.includes('festival-planner'));
  assert.deepEqual([...PDF_FIRST_SLUGS].sort(), ['clinical-rotation-pocket-prep', 'etsy-profit-pricing-desk', 'farmers-market-morning-board', 'home-project-bid-compare', 'iep-meeting-organizer', 'roommate-move-out-splitter']);
  const concept = findConcept('festival-planner');
  const doc = marketOutcomeDocument(concept, createWorkingResult(concept, answers));
  assert.equal(validateOutcomeDocument(doc), true);
  assert.equal(validatePdfDocument(doc), true);
  const bytes = await renderOutcomePdf(doc, new Date('2026-11-11T12:00:00Z'));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
});

test('the Festival wishlist produces a shareable mini-site like Bachelorette', () => {
  assert.ok(OUTCOME_RALLY_SLUGS.has('festival-planner'));
  const concept = findConcept('festival-planner');
  const doc = marketOutcomeDocument(concept, createWorkingResult(concept, answers));
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
  const insert = db.prepare('INSERT INTO saved_outcomes (id, owner_user_id, rally_slug, title, document, slug, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  insert.run('fest-1', 'user-1', 'festival-planner', doc.title, JSON.stringify(doc), 'festivalpub1', 1, now, now);
  insert.run('fest-2', 'user-1', 'festival-planner', doc.title, JSON.stringify(doc), 'festivalprv1', 0, now, now);
  const bySlug = db.prepare('SELECT document, is_public AS isPublic FROM saved_outcomes WHERE slug = ?');
  assert.deepEqual(publicOutcomeFromRow(bySlug.get('festivalpub1')), doc);
  assert.equal(publicOutcomeFromRow(bySlug.get('festivalprv1')), null);
  db.close();
});
