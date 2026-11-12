import test from 'node:test';
import assert from 'node:assert/strict';
import { rallyConcepts } from '../app/catalog.ts';
import { originals } from '../app/originals.ts';

// Part 1B, step D2: every listing says what the buyer leaves with — and never
// promises an artifact this build does not ship. PDF-first Rallies get no
// shareable mini-site in this plan, and Travel Proposal gets no PDF packet,
// so their listings must not claim them.
const DELISTED = new Set(['nclex-study-sprint', 'care-circle-coordinator', 'flashcard-shop-studio']);
const SITE_CLAIM = /your own .* (site|page)|proposal link|decision page|trip HQ|garden page|festival page/i;

// What each live Rally actually ships in this build: p = designed PDF packet,
// s = shareable mini-site, x = Excel worksheet.
const ARTIFACTS = {
  'bachelorette-blueprint': 'ps',
  'garden-planner': 'ps',
  'travel-proposal-studio': 's',
  'home-project-bid-compare': 'psx',
  'festival-planner': 'ps',
  'iep-meeting-organizer': 'p',
  'roommate-move-out-splitter': 'p',
  'etsy-profit-pricing-desk': 'p',
  'clinical-rotation-pocket-prep': 'p',
  'farmers-market-morning-board': 'p',
};

test('every live catalog listing names the artifacts it ships — and only those', () => {
  const live = rallyConcepts.filter((c) => !DELISTED.has(c.slug));
  assert.equal(live.length, 8, 'a Rally was added or removed; update the D2 artifact table');
  for (const concept of live) {
    const artifacts = ARTIFACTS[concept.slug];
    assert.ok(artifacts, `${concept.slug} has no artifact row in the D2 table`);
    const text = concept.outcome.join(' | ');
    if (artifacts.includes('p')) assert.match(text, /PDF packet|PDF record/, `${concept.slug} listing never names its PDF packet`);
    else assert.doesNotMatch(text, /PDF packet|PDF record/, `${concept.slug} listing promises a PDF it does not ship`);
    if (artifacts.includes('s')) assert.ok(SITE_CLAIM.test(text), `${concept.slug} listing never names its shareable page`);
    else assert.doesNotMatch(text, SITE_CLAIM, `${concept.slug} listing promises a shareable page it does not ship`);
    if (artifacts.includes('x')) assert.match(text, /Excel worksheet/, `${concept.slug} listing never names its Excel worksheet`);
    // The artifact line is the last outcome item, so outcome[0] (the
    // discover-page hero line) is untouched by D2.
    assert.ok(concept.outcome.length >= 4, `${concept.slug} lost outcome items`);
  }
});

test('both free originals say: your own site + a PDF packet to keep', () => {
  for (const product of originals) {
    const outputs = product.outputs.join(' | ');
    assert.match(outputs, /Your own .* (site|page) \+ a PDF packet to keep/, `${product.slug} listing never names both artifacts`);
    assert.match(product.included.join(' | '), /PDF packet/, `${product.slug} included list never names the packet`);
  }
});
