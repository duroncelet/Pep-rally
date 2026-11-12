import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { findConcept } from '../app/catalog.ts';
import { createWorkingResult } from '../app/rally-results.ts';
import { marketOutcomeDocument, SHAREABLE_MARKET_SLUGS } from '../app/market-outcome-pdf.ts';
import { validateOutcomeDocument } from '../app/outcome-document.ts';
import { publicOutcomeFromRow } from '../app/saved-outcomes.ts';

// Part 1B, step B4: Travel Proposal + Bid Compare shared pages.
const travelAnswers = {
  'Destination and dates': 'Lisbon, June 12-19, two travelers',
  'Budget and traveler preferences': '$4,000 total, walkable neighborhoods, one food experience',
  'Advisor hotel and activity shortlist': 'Chiado apartment, Alfama walking tour, day trip to Sintra',
};
const bidAnswers = {
  'Two or more estimates': 'Acme Builders $18400; Bright Homes $21000',
  'Must-haves and budget': 'Licensed, done by October, under $22000',
  'Questions for each contractor': 'What is excluded?; What is the payment schedule?',
};

test('Travel Proposal, Bid Compare, and Festival Planner offer a shareable link from the market workspace', () => {
  // Festival Planner joined the set-based wiring when #31 merged: its standalone
  // share block was absorbed into SHAREABLE_MARKET_SLUGS (see the #31 merge).
  assert.deepEqual([...SHAREABLE_MARKET_SLUGS].sort(), ['festival-planner', 'home-project-bid-compare', 'travel-proposal-studio']);
  // The PDF-first Rallies lead with the packet, not a shareable link.
  for (const slug of ['iep-meeting-organizer', 'roommate-move-out-splitter', 'etsy-profit-pricing-desk', 'clinical-rotation-pocket-prep', 'farmers-market-morning-board']) {
    assert.equal(SHAREABLE_MARKET_SLUGS.has(slug), false);
  }
});

test('the shared Travel proposal carries the three directions and the adviser shortlist', () => {
  const concept = findConcept('travel-proposal-studio');
  const doc = marketOutcomeDocument(concept, createWorkingResult(concept, travelAnswers));
  assert.equal(validateOutcomeDocument(doc), true);
  assert.deepEqual(doc.sections.map((s) => s.heading), ['Direction 1 · Best value', 'Direction 2 · Balanced', 'Direction 3 · Signature', 'Before using it']);
  assert.ok(doc.sections[0].paragraphs.some((p) => p.includes('$4,000 total')));
  assert.ok(doc.sections[1].paragraphs.some((p) => p.includes('Chiado apartment')));
  assert.ok(doc.sections[2].paragraphs.some((p) => p.includes('Recheck all live prices')));
  assert.ok(doc.sections[3].paragraphs.includes(concept.guardrail));
});

test('the shared Bid Compare page carries the normalized comparison and the decision record', () => {
  const concept = findConcept('home-project-bid-compare');
  const doc = marketOutcomeDocument(concept, createWorkingResult(concept, bidAnswers));
  assert.equal(validateOutcomeDocument(doc), true);
  assert.deepEqual(doc.sections.map((s) => s.heading), ['Scope comparison', 'Must-haves and budget', 'Questions before hiring', 'Before using it']);
  assert.ok(doc.sections[0].paragraphs.some((p) => p.includes('Acme Builders $18400')));
  assert.ok(doc.sections[0].paragraphs.some((p) => p.includes('Bright Homes $21000')));
  assert.ok(doc.sections[2].paragraphs.some((p) => p.includes('Record the homeowner’s final decision and rationale')));
});

test('an adviser-branded title still validates and renders', () => {
  const concept = findConcept('travel-proposal-studio');
  const branded = { ...marketOutcomeDocument(concept, createWorkingResult(concept, travelAnswers)), title: 'Wanderwell Travel — Lisbon options for June' };
  assert.equal(validateOutcomeDocument(branded), true);
  assert.deepEqual(publicOutcomeFromRow({ document: JSON.stringify(branded), isPublic: 1 }), branded);
});

test('both shared pages render at their links when public, never when private', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
  const insert = db.prepare('INSERT INTO saved_outcomes (id, owner_user_id, rally_slug, title, document, slug, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  const travelDoc = marketOutcomeDocument(findConcept('travel-proposal-studio'), createWorkingResult(findConcept('travel-proposal-studio'), travelAnswers));
  const bidDoc = marketOutcomeDocument(findConcept('home-project-bid-compare'), createWorkingResult(findConcept('home-project-bid-compare'), bidAnswers));
  insert.run('travel-1', 'user-1', 'travel-proposal-studio', travelDoc.title, JSON.stringify(travelDoc), 'travelpub123', 1, now, now);
  insert.run('bid-1', 'user-1', 'home-project-bid-compare', bidDoc.title, JSON.stringify(bidDoc), 'bidpublic123', 1, now, now);
  insert.run('bid-2', 'user-1', 'home-project-bid-compare', bidDoc.title, JSON.stringify(bidDoc), 'bidprivate12', 0, now, now);
  const bySlug = db.prepare('SELECT document, is_public AS isPublic FROM saved_outcomes WHERE slug = ?');
  assert.deepEqual(publicOutcomeFromRow(bySlug.get('travelpub123')), travelDoc);
  assert.deepEqual(publicOutcomeFromRow(bySlug.get('bidpublic123')), bidDoc);
  assert.equal(publicOutcomeFromRow(bySlug.get('bidprivate12')), null);
  db.close();
});
