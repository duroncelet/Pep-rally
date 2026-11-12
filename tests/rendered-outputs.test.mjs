import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { PDFDocument } from 'pdf-lib';
import { findConcept, rallyConcepts } from '../app/catalog.ts';
import { originals } from '../app/originals.ts';
import { createWorkingResult } from '../app/rally-results.ts';
import { marketOutcomeDocument, PACKET_SLUGS } from '../app/market-outcome-pdf.ts';
import { renderOutcomePdf, validatePdfDocument } from '../app/outcome-pdf.ts';
import { validateOutcomeDocument } from '../app/outcome-document.ts';
import { OUTCOME_RALLY_SLUGS, publicOutcomeFromRow } from '../app/saved-outcomes.ts';
import { SAMPLE_OUTCOMES } from '../app/sample-outcomes.ts';

// Part 1B, step D3: one rendered-output test per Rally. The PDF checks read
// the text the renderer actually drew (the content streams are Flate-coded
// and the text is hex-encoded, so this test inflates and decodes them),
// and the shared-link checks read through the real migration SQL with a
// signed-out lookup. A6/B1–B5/C1 already test each artifact in isolation;
// this file closes the loop per Rally: on-screen outcome -> rendered PDF
// bytes, and saved outcome -> public link.
//
// Sample answers are ordinary buyer inputs; nothing here is a real listing,
// venue, or price. Bachelorette/Garden use the B5 samples as the on-screen
// shape: their workspace builders live inline in the pages and cannot be
// imported under node --test, and the samples mirror those shapes.
const samples = {
  'iep-meeting-organizer': {
    'Existing goals and documents': 'Reading fluency goal, 90 wpm by June; current IEP dated last spring.',
    'Recent observations': 'Reads aloud confidently at home; rushes timed passages.',
    'Questions and priorities': 'What supports are working in class? How is progress measured?',
  },
  'roommate-move-out-splitter': {
    'Roommates and shared items': 'Maya, Jordan; couch, TV, vacuum',
    'Bills, deposits, and chores': 'Electric $120, internet $60, deposit $1800',
    'Condition photos and deadlines': 'Move-out June 30; photos of kitchen and bathroom',
  },
  'etsy-profit-pricing-desk': {
    'Materials and labor': 'Clay $2.10, glaze $0.80, kiln time $1.50, 45 min labor',
    'Packaging and shipping': 'Box $1.20, shipping $6.50',
    'Marketplace fees and target margin': 'Etsy fees 6.5% plus payment processing, target 40% margin',
  },
  'clinical-rotation-pocket-prep': {
    'Unit type': 'Medical-surgical unit, 12-hour day shift',
    'Learning goals': 'IV insertion, patient education, charting',
    'Instructor checklist': 'Bring stethoscope, drug guide; skills checklist signed',
  },
  'farmers-market-morning-board': {
    'Harvest-ready crops': 'Tomatoes, zucchini, basil, eggs',
    'Preorders and inventory': '2 dozen eggs for the Lee family; 5 lb tomatoes for Rosa',
    'Market location and forecast': 'Saturday market, 8am-1pm, sunny, high 78',
  },
  'home-project-bid-compare': {
    'Two or more estimates': 'Acme Builders $18400; Bright Homes $21000; Cornerstone $16900',
    'Must-haves and budget': 'Licensed, done by October, under $22000',
    'Questions for each contractor': 'What is excluded?; What is the payment schedule?',
  },
  'travel-proposal-studio': {
    'Destination and dates': 'Lisbon, June 12-19, two travelers',
    'Budget and traveler preferences': '$4,000 total, walkable neighborhoods, one food experience',
    'Advisor hotel and activity shortlist': 'Chiado apartment, Alfama walking tour, day trip to Sintra',
  },
  'festival-planner': {
    'Festival, artists, and days': 'Desert Bloom Festival; Friday: The Wanderers, June Park; Saturday: Glass Tide',
    'Outfit ideas by day': 'Friday: linen shirt, boots; Saturday: vintage tee, denim shorts',
    'Group members and shared costs': 'Maya, Jordan, Sam; house $900, tickets $450 each',
  },
};

const PACKET_MARKET = ['iep-meeting-organizer', 'roommate-move-out-splitter', 'etsy-profit-pricing-desk', 'clinical-rotation-pocket-prep', 'farmers-market-morning-board', 'home-project-bid-compare', 'festival-planner'];
const SITE_MARKET = ['travel-proposal-studio', 'home-project-bid-compare', 'festival-planner'];
const ORIGINALS = ['bachelorette-blueprint', 'garden-planner'];
const DELISTED = ['nclex-study-sprint', 'care-circle-coordinator', 'flashcard-shop-studio'];

function marketDoc(slug) {
  const concept = findConcept(slug);
  assert.ok(concept, `catalog is missing ${slug}`);
  return marketOutcomeDocument(concept, createWorkingResult(concept, samples[slug]));
}

function sampleDoc(slug) {
  return SAMPLE_OUTCOMES[`sample-${slug}`].document;
}

// The text pdf-lib actually drew: inflate every Flate stream (length-based,
// so binary data cannot truncate a match), then decode the hex and literal
// strings the Tj operators carry. Metadata streams are inflated too, but
// their XML tags are not hex strings, so only drawn text is collected.
function extractPdfText(bytes) {
  const buf = Buffer.from(bytes);
  const latin = buf.toString('latin1');
  const streams = [];
  let idx = 0;
  while (true) {
    const s = latin.indexOf('stream\n', idx);
    if (s === -1) break;
    const dictStart = latin.lastIndexOf('<<', s);
    const lenMatch = /\/Length (\d+)/.exec(latin.slice(dictStart, s));
    const dataStart = s + 'stream\n'.length;
    if (lenMatch) {
      try { streams.push(inflateSync(buf.subarray(dataStart, dataStart + Number(lenMatch[1]))).toString('latin1')); } catch { /* not a flate stream */ }
    }
    idx = dataStart;
  }
  const text = streams.join('\n');
  const pieces = [];
  for (const m of text.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
    const hex = m[1].replace(/\s/g, '');
    if (hex.length % 2 === 0 && hex.length > 0) pieces.push(Buffer.from(hex, 'hex').toString('latin1'));
  }
  for (const m of text.matchAll(/\((?:[^()\\]|\\.)*\)/g)) {
    pieces.push(m[0].slice(1, -1).replace(/\\([()\\])/g, '$1'));
  }
  return pieces.join('\n');
}

// Mirrors printable() in app/outcome-pdf.ts (not exported): the renderer
// folds smart punctuation and symbols to ASCII before drawing, so needles
// must be compared in their printed form.
function printable(value) {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―]/g, '-').replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"').replace(/…/g, '...')
    .replace(/·/g, ' | ').replace(/×/g, 'x').replace(/°/g, ' degrees')
    .replace(/☐/g, '[ ]').replace(/☑/g, '[x]').replace(/✓/g, 'done')
    .replace(/[^\x20-\x7E\n]/g, '?');
}

// The renderer's line wrapper splits on whitespace and rejoins with single
// spaces, so double spaces in a source string (sign-off lines, table joins)
// become single spaces in the drawn text. Needles go through the same fold.
function drawn(value) {
  return printable(value).replace(/\s+/g, ' ').trim();
}

async function assertPdfMatchesOutcome(slug, doc) {
  assert.equal(validateOutcomeDocument(doc), true, `${slug} doc fails outcome validation`);
  assert.equal(validatePdfDocument(doc), true, `${slug} doc fails PDF validation`);
  const bytes = await renderOutcomePdf(doc, new Date('2026-11-11T12:00:00Z'));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
  const text = extractPdfText(bytes);
  // Every section heading is drawn whole; every paragraph, row, and grid
  // cell is drawn from its start, so the first 30 printed characters of
  // each one must appear in the drawn text. (The subtitle is not checked:
  // long subtitles wrap across lines.)
  for (const section of doc.sections) {
    assert.ok(text.includes(drawn(section.heading)), `${slug} PDF is missing heading: ${section.heading}`);
    for (const paragraph of section.paragraphs || []) {
      const needle = drawn(paragraph).slice(0, 30);
      assert.ok(text.includes(needle), `${slug} PDF is missing paragraph start: ${needle}`);
    }
    if (section.columns?.length) {
      const needle = drawn(section.columns.join('  |  ')).slice(0, 30);
      assert.ok(text.includes(needle), `${slug} PDF is missing table header: ${needle}`);
    }
    for (const row of section.rows || []) {
      const needle = drawn(row.join('  |  ')).slice(0, 30);
      assert.ok(text.includes(needle), `${slug} PDF is missing row start: ${needle}`);
    }
    for (const cell of section.grid?.cells || []) {
      assert.ok(text.includes(drawn(cell || 'Open')), `${slug} PDF is missing grid cell: ${cell}`);
    }
  }
}

function assertSharedLinkRenders(slug, doc) {
  assert.equal(validateOutcomeDocument(doc), true, `${slug} doc fails outcome validation`);
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
  const insert = db.prepare('INSERT INTO saved_outcomes (id, owner_user_id, rally_slug, title, document, slug, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = new Date().toISOString();
  insert.run('public-row', 'user-1', slug, doc.title, JSON.stringify(doc), 'abcdefghjklm', 1, now, now);
  insert.run('private-row', 'user-1', slug, doc.title, JSON.stringify(doc), 'abcdefghjkln', 0, now, now);
  const bySlug = db.prepare('SELECT document, is_public AS isPublic FROM saved_outcomes WHERE slug = ?');
  // The signed-out read: a public row renders the saved document verbatim.
  assert.deepEqual(publicOutcomeFromRow(bySlug.get('abcdefghjklm')), doc);
  // The same document, never opted in, renders nothing.
  assert.equal(publicOutcomeFromRow(bySlug.get('abcdefghjkln')), null);
}

test('every packet Rally renders a PDF whose drawn text matches its on-screen outcome', async () => {
  assert.deepEqual([...PACKET_SLUGS].sort(), [...PACKET_MARKET].sort(), 'PACKET_SLUGS drifted from the D3 packet list');
  for (const slug of PACKET_MARKET) await assertPdfMatchesOutcome(slug, marketDoc(slug));
  for (const slug of ORIGINALS) await assertPdfMatchesOutcome(slug, sampleDoc(slug));
});

test('every mini-site Rally renders at its shared link when public, never when private', () => {
  for (const slug of SITE_MARKET) assertSharedLinkRenders(slug, marketDoc(slug));
  for (const slug of ORIGINALS) assertSharedLinkRenders(slug, sampleDoc(slug));
});

test('the rendered-output matrix covers every live Rally and none of the delisted ones', () => {
  const live = new Set([...rallyConcepts.map((c) => c.slug), ...originals.map((o) => o.slug)].filter((slug) => !DELISTED.includes(slug)));
  const covered = new Set([...PACKET_MARKET, ...SITE_MARKET, ...ORIGINALS]);
  assert.deepEqual([...covered].sort(), [...live].sort(), 'a live Rally has no rendered-output test, or the matrix lists one that does not exist');
  for (const slug of DELISTED) assert.equal(covered.has(slug), false, `${slug} is delisted and must not appear in the matrix`);
  for (const slug of live) assert.ok(OUTCOME_RALLY_SLUGS.has(slug), `${slug} is not a saveable outcome Rally`);
});
