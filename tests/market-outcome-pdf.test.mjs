import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { findConcept } from '../app/catalog.ts';
import { createWorkingResult } from '../app/rally-results.ts';
import { marketOutcomeDocument, PDF_FIRST_SLUGS } from '../app/market-outcome-pdf.ts';
import { bidWorksheetSheets, bidWorksheetXlsx } from '../app/bid-worksheet.ts';
import { renderOutcomePdf, validatePdfDocument } from '../app/outcome-pdf.ts';

// Part 1B, step A6: designed PDF packets for the six PDF-first Rallies, plus
// the Bid Compare Excel worksheet. Sample answers are ordinary buyer inputs;
// nothing here is a real listing, venue, or price.
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
};

test('A6 covers exactly the six PDF-first Rallies and none of the delisted ones', () => {
  assert.deepEqual([...PDF_FIRST_SLUGS].sort(), Object.keys(samples).sort());
  for (const removed of ['nclex-study-sprint', 'care-circle-coordinator', 'flashcard-shop-studio']) {
    assert.equal(PDF_FIRST_SLUGS.includes(removed), false);
  }
});

test('each PDF-first Rally renders a real PDF whose content matches its on-screen outcome', async () => {
  for (const slug of PDF_FIRST_SLUGS) {
    const concept = findConcept(slug);
    assert.ok(concept, `catalog is missing ${slug}`);
    const result = createWorkingResult(concept, samples[slug]);
    assert.ok(result.sections.length >= 2, `${slug} has too few on-screen sections`);
    const doc = marketOutcomeDocument(concept, result);
    assert.equal(doc.title, result.headline);
    assert.equal(doc.subtitle, result.summary);
    // Parity: every on-screen section heading and item appears in the packet,
    // in order, before any PDF-only structural extra.
    result.sections.forEach((section, index) => {
      assert.equal(doc.sections[index].heading, section.title);
      for (const item of section.items) assert.ok(doc.sections[index].paragraphs.includes(item), `${slug} packet is missing on-screen item: ${item}`);
    });
    assert.ok(doc.sections.at(-1).heading === 'Before using it');
    assert.ok(doc.sections.at(-1).paragraphs.includes(concept.guardrail));
    assert.equal(validatePdfDocument(doc), true, `${slug} packet failed validation`);
    const bytes = await renderOutcomePdf(doc, new Date('2026-11-11T12:00:00Z'));
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
    const loaded = await PDFDocument.load(bytes);
    assert.ok(loaded.getPageCount() >= 1);
    assert.equal(loaded.getTitle(), doc.title);
  }
});

test('IEP packet carries the follow-up letter draft; Roommate packet carries sign-off lines', () => {
  const iep = marketOutcomeDocument(findConcept('iep-meeting-organizer'), createWorkingResult(findConcept('iep-meeting-organizer'), samples['iep-meeting-organizer']));
  assert.ok(iep.sections.some((s) => s.heading === 'Follow-up letter draft'));
  assert.ok(iep.sections.some((s) => s.heading === 'Meeting agenda'));
  const roommate = marketOutcomeDocument(findConcept('roommate-move-out-splitter'), createWorkingResult(findConcept('roommate-move-out-splitter'), samples['roommate-move-out-splitter']));
  const signoff = roommate.sections.find((s) => s.heading === 'Sign-off');
  assert.ok(signoff);
  assert.ok(signoff.paragraphs.some((p) => p.includes('Signature:')));
});

test('Bid Compare worksheet is a real .xlsx with the normalized columns and the buyer bids', () => {
  const concept = findConcept('home-project-bid-compare');
  const sheets = bidWorksheetSheets(samples['home-project-bid-compare'], concept.inputs);
  assert.deepEqual(sheets.map((s) => s.name), ['Bid comparison', 'Must-haves & questions']);
  assert.deepEqual(sheets[0].rows[0], ['Bid / contractor', 'Labor', 'Materials', 'Allowances', 'Exclusions', 'Warranty', 'Timing', 'Payment schedule', 'Total as quoted', 'Notes']);
  assert.equal(sheets[0].rows[1][0], 'Acme Builders $18400');
  assert.equal(sheets[0].rows[2][0], 'Bright Homes $21000');
  assert.equal(sheets[0].rows[3][0], 'Cornerstone $16900');
  assert.ok(sheets[1].rows.some((row) => row[0] === 'Licensed' && row[1] === 'Must-have'));
  assert.ok(sheets[1].rows.some((row) => row[0] === 'What is excluded?' && row[1] === 'Question to ask'));

  const bytes = bidWorksheetXlsx(samples['home-project-bid-compare'], concept.inputs);
  const text = new TextDecoder().decode(bytes);
  assert.equal(text.slice(0, 4), 'PK\x03\x04');
  // Stored (uncompressed) entries, so the XML and cell text are searchable.
  assert.ok(text.includes('[Content_Types].xml'));
  assert.ok(text.includes('Acme Builders $18400'));
  assert.ok(text.includes('Must-haves &amp; questions'));
  assert.ok(text.includes('</worksheet>'));
  assert.ok(text.includes('PK\x05\x06')); // end of central directory
  assert.equal(text.split('PK\x03\x04').length - 1, 7); // 5 fixed parts + 2 sheets
});
