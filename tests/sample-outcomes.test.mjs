import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SAMPLE_OUTCOMES, findSampleOutcome, sampleOutcomeHref } from '../app/sample-outcomes.ts';
import { validateOutcomeDocument } from '../app/outcome-document.ts';
import { isValidOutcomeSlug, rallyListingHref } from '../app/saved-outcomes.ts';

// Part 1B, step B5: sample outcomes — Bachelorette + Garden first.
test('both samples exist, validate, and carry the full finished shape', () => {
  const slugs = Object.keys(SAMPLE_OUTCOMES);
  assert.deepEqual(slugs.sort(), ['sample-bachelorette-blueprint', 'sample-garden-planner']);
  for (const slug of slugs) {
    const sample = SAMPLE_OUTCOMES[slug];
    assert.equal(validateOutcomeDocument(sample.document), true, `${slug} does not validate`);
    assert.ok(sample.document.sections.length >= 4, `${slug} is too thin to be a finished example`);
  }
  const bach = SAMPLE_OUTCOMES['sample-bachelorette-blueprint'].document;
  assert.deepEqual(bach.sections.map((s) => s.heading), ['The weekend', 'Stay shortlist', 'Packing', 'Group and RSVP', 'Suggested repayments']);
  const garden = SAMPLE_OUTCOMES['sample-garden-planner'].document;
  assert.deepEqual(garden.sections.map((s) => s.heading), ['This week', 'Bed 1', 'Bed 2', 'My planting calendar', 'Care board', 'Forecast note']);
  // The garden sample never includes the private journal.
  assert.ok(!garden.sections.some((s) => s.heading.toLowerCase().includes('journal')));
});

test('sample slugs resolve, never collide with generated slugs, and link from their listings', () => {
  assert.equal(findSampleOutcome('sample-bachelorette-blueprint').rallySlug, 'bachelorette-blueprint');
  assert.equal(findSampleOutcome('sample-garden-planner').rallySlug, 'garden-planner');
  assert.equal(findSampleOutcome('sample-nope'), null);
  for (const slug of Object.keys(SAMPLE_OUTCOMES)) {
    assert.equal(isValidOutcomeSlug(slug), false, `${slug} could collide with a generated slug`);
  }
  assert.equal(sampleOutcomeHref('bachelorette-blueprint'), '/s/sample-bachelorette-blueprint');
  assert.equal(sampleOutcomeHref('garden-planner'), '/s/sample-garden-planner');
  assert.equal(sampleOutcomeHref('iep-meeting-organizer'), null);
  // Every sample's Rally has a listing for the "Make your own" link.
  for (const sample of Object.values(SAMPLE_OUTCOMES)) {
    assert.notEqual(rallyListingHref(sample.rallySlug), '/');
  }
});

// Regression (Nov 12, 2026): generateMetadata read .title off the
// { doc, rallySlug, isSample } wrapper, so shared pages titled themselves
// "undefined · Pep Rally". The page component can't run under node --test
// (it imports the cloudflare:workers D1 binding), so this guards the
// metadata line itself. (The page body destructures the inner document
// first, so its own doc.title is correct and untouched.)
test('shared-page metadata titles the page from the outcome document, not the wrapper', () => {
  const page = readFileSync(new URL('../app/s/[slug]/page.tsx', import.meta.url), 'utf8');
  const metadata = page.match(/export async function generateMetadata[\s\S]*?\n}/)[0];
  assert.match(metadata, /doc\.doc\.title/);
  assert.doesNotMatch(metadata, /\$\{doc\.title\}/);
});
