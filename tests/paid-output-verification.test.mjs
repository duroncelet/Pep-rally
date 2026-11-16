import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { and, eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { PDFDocument } from 'pdf-lib';
import { findConcept } from '../app/catalog.ts';
import { createWorkingResult } from '../app/rally-results.ts';
import { marketOutcomeDocument, PACKET_SLUGS, SHAREABLE_MARKET_SLUGS } from '../app/market-outcome-pdf.ts';
import { validatePdfDocument } from '../app/outcome-pdf.ts';
import { POST as outcomePdfPost } from '../app/api/outcome-pdf/route.ts';
import { iepSections, iepHeadline } from '../app/iep-organizer.ts';
import { bidCompareSections, bidCompareHeadline } from '../app/bid-compare.ts';
import { clinicalSections, clinicalHeadline } from '../app/clinical-prep.ts';
import { etsySections, etsyHeadline, ETSY_POLICY_FEES } from '../app/etsy-pricing.ts';
import { farmersSections, farmersHeadline } from '../app/farmers-market-board.ts';
import { roommateSections, roommateHeadline } from '../app/roommate-move-out.ts';
import { savedOutcomes, purchases } from '../db/schema.ts';
import { newOutcomeSlug, publicOutcomeFromRow } from '../app/saved-outcomes.ts';

// Paid-output verification (Kelly approved Nov 15, 2026). Closes the two
// gaps in Codex's Nov 12 live verification: (a) one real PDF download per
// PAID Rally — previews disable downloads, so Codex could only verify the
// two free Rallies; (b) a privately created (non-sample) share link opened
// signed out — only the two public sample links were checked.
//
// Test path — a test-only entitlement seeded in local D1, no production
// route, no Stripe, no Clerk. The D1 routes themselves cannot run under
// node --test (they import cloudflare:workers and Clerk), and `vinext
// start` fails locally (the built worker imports cloudflare: URLs the
// Node ESM loader rejects), so this file verifies the live paths the way
// the repo already does: the PDF route handler is called directly with
// the real workspace documents, and the share/entitlement SQL is run
// against in-memory SQLite built from the real migration files, through
// the exact drizzle queries the live routes run. Nothing here touches
// production data, and no test hook is added to the live app.
//
// Honest boundaries (see the PR description): the Clerk session behind
// /api/rally-access and POST /api/outcomes is not exercised locally (no
// Clerk keys in this environment), and the final HTTP render of a
// DB-backed /s/ page needs a deployed worker. What IS proven here: the
// PDF bytes for every paid packet, the share read rule for every
// shareable paid Rally, and the entitlement lookup given a signed-in user.

// Distinctive markers only: every input carries a made-up name or figure
// that appears in the PDF text solely because the real builder computed
// it. Nothing here is a real person, contractor, patient, or price.
const TODAY = new Date(2026, 10, 16); // Monday, Nov 16, 2026.

const iepInput = {
  studentName: 'Zelda Quill',
  meetingDate: '2026-11-20',
  goals: [{ goal: 'Reading fluency, 90 wpm by June', progress: 'Reads aloud confidently at home' }],
  evidence: [{ date: '2026-11-10', observation: 'Rushes timed passages', source: 'Homework' }],
  questions: ['What supports are working in class?'],
  priorities: 'Keep the reading specialist time',
  decisions: [{ decision: 'Add 30 minutes of reading support weekly', owner: 'Ms. Alvarez', due: '2026-11-27' }],
};

// The reveal, repriced: Zebra quotes $14,100 but the tile allowance is
// $1,000 against $3,000 expected and permits are excluded at $500 — true
// cost $16,600. Quill at $15,100 flat is the real low cost.
const bidInput = {
  bids: [
    { name: 'Zebra Builders', quotedCents: 1_410_000, items: [{ label: 'Labor', cents: 800_000 }, { label: 'Materials', cents: 610_000 }], allowances: [{ label: 'Tile', allowanceCents: 100_000, expectedCents: 300_000 }], exclusions: [{ label: 'Permits', estimatedCents: 50_000 }], depositCents: 141_000, weeks: 6 },
    { name: 'Quill Homes', quotedCents: 1_510_000, items: [{ label: 'Labor', cents: 900_000 }, { label: 'Materials', cents: 610_000 }], allowances: [], exclusions: [], depositCents: null, weeks: 8 },
  ],
  mustHaves: 'Licensed, done by October',
  questions: 'What is excluded?',
};

const clinicalInput = {
  unitType: 'Medical-surgical',
  rotationStart: '2026-11-16',
  rotationEnd: '2026-12-11',
  clinicalWeekdays: [1, 3, 5],
  graduationDate: '',
  learningGoals: ['Safe medication administration', 'SBAR handoff', 'Quill-method charting'],
  instructorRequirements: 'Skills log signed each shift',
  skills: [
    { skill: 'Medication administration', required: true, done: false },
    { skill: 'Foley insertion', required: false, done: false },
  ],
  sterileProcedureDone: false,
  medCardsDone: false,
  patientSlots: [{ label: 'Patient A', focusMeds: true, focusLabs: false, focusCarePlan: true, note: '' }],
  // The pack list is a fixed mandatory checklist (PACK_LIST); the packet
  // shows which of those seven are packed, not free-form entered items.
  packedItems: ['ID badge', 'Stethoscope'],
};

const etsyInput = {
  productName: 'Quillstone mug',
  materials: [{ label: 'Clay + glaze', cents: 500 }],
  laborHours: 0.5,
  laborRateCents: 1600,
  packagingCents: 100,
  otherCosts: [],
  shippingCostCents: 300,
  shippingChargedCents: null,
  currentPriceCents: 2400,
  targetMarginPct: 30,
  monthlyFixedCents: 10000,
  fees: { ...ETSY_POLICY_FEES },
};

const farmersInput = {
  marketDate: '2026-11-14',
  openTime: '',
  setupMinutes: null,
  loadMinutes: null,
  conditions: ['rain'],
  crops: [
    { crop: 'Kale', unit: 'bunches', broughtLastWeek: 60, soldLastWeek: 40, extraBuffer: 5, priceCents: 400 },
    { crop: 'Beets', unit: 'bunches', broughtLastWeek: 30, soldLastWeek: 30, extraBuffer: 0, priceCents: 350 },
    { crop: 'Zebra Chard', unit: 'bunches', broughtLastWeek: 20, soldLastWeek: 18, extraBuffer: 2, priceCents: 500 },
  ],
  preorders: [{ label: 'Maya — kale', crop: 'Kale', qty: 10 }, { label: 'Quinn zebra chard', crop: 'Zebra Chard', qty: 4 }],
  standZones: [{ zone: 'Front table', items: 'Kale, beets, signs' }],
  packedItems: ['Canopy', 'Cash bag'],
  customPackItems: [],
};

const roommateInput = {
  roommates: [{ name: 'Ana Quill' }, { name: 'Bo Zebra' }],
  leaseStructure: 'joint',
  departingName: '',
  depositCents: 240_000,
  deductions: [{ label: 'Carpet cleaning', cents: 12_000, chargedTo: 'shared' }],
  monthlyRentCents: null,
  moveOutDate: '2026-06-30',
  stateDeadlineDays: 21,
  sharedItems: [{ item: 'Couch', disposition: 'sell-split', owner: '', proceedsCents: 20_000 }],
  rooms: [{ room: 'Kitchen', note: 'Stove cleaned, one chipped tile', photoTaken: true }],
  tasks: [{ task: 'Return keys', assignee: 'Ana Quill', done: false }],
  acknowledged: [],
};

const festivalAnswers = {
  'Festival, artists, and days': 'Desert Bloom Festival; Friday: The Wanderers, June Park; Saturday: Glass Tide',
  'Outfit ideas by day': 'Friday: linen shirt, boots; Saturday: vintage tee, denim shorts',
  'Group members and shared costs': 'Maya, Jordan, Sam; house $900, tickets $450 each',
};

const travelAnswers = {
  'Destination and dates': 'Lisbon, May 4 to May 11',
  'Budget and traveler preferences': 'Mid-range, walkable, food-first',
  'Advisor hotel and activity shortlist': 'Hotel Quill, Fado night, day trip to Sintra',
};

// Each entry builds the document exactly the way its workspace does:
// the Rally's real computed result fed to the shared packet builder.
function buildDoc(slug) {
  const concept = findConcept(slug);
  assert.ok(concept, `catalog is missing ${slug}`);
  switch (slug) {
    case 'iep-meeting-organizer': {
      const sections = iepSections(iepInput, TODAY);
      const { headline, summary } = iepHeadline(iepInput, TODAY);
      return marketOutcomeDocument(concept, { headline, summary, sections });
    }
    case 'home-project-bid-compare': {
      const sections = bidCompareSections(bidInput.bids, bidInput.mustHaves, bidInput.questions);
      const { headline, summary } = bidCompareHeadline(bidInput.bids);
      return marketOutcomeDocument(concept, { headline, summary, sections });
    }
    case 'clinical-rotation-pocket-prep': {
      const sections = clinicalSections(clinicalInput, TODAY);
      const { headline, summary } = clinicalHeadline(clinicalInput, TODAY);
      return marketOutcomeDocument(concept, { headline, summary, sections });
    }
    case 'etsy-profit-pricing-desk': {
      const sections = etsySections(etsyInput);
      const { headline, summary } = etsyHeadline(etsyInput);
      return marketOutcomeDocument(concept, { headline, summary, sections });
    }
    case 'farmers-market-morning-board': {
      const sections = farmersSections(farmersInput);
      const { headline, summary } = farmersHeadline(farmersInput);
      return marketOutcomeDocument(concept, { headline, summary, sections });
    }
    case 'roommate-move-out-splitter': {
      const sections = roommateSections(roommateInput);
      const { headline, summary } = roommateHeadline(roommateInput);
      return marketOutcomeDocument(concept, { headline, summary, sections });
    }
    case 'festival-planner':
      return marketOutcomeDocument(concept, createWorkingResult(concept, festivalAnswers));
    case 'travel-proposal-studio':
      return marketOutcomeDocument(concept, createWorkingResult(concept, travelAnswers));
    default:
      throw new Error(`no document builder for ${slug}`);
  }
}

let pdftotextAvailable;
function hasPdftotext() {
  if (pdftotextAvailable === undefined) {
    try { execFileSync('which', ['pdftotext'], { stdio: 'ignore' }); pdftotextAvailable = true; }
    catch { pdftotextAvailable = false; }
  }
  return pdftotextAvailable;
}

// The real download path: downloadOutcomePdf POSTs the workspace document
// to /api/outcome-pdf and saves the returned bytes. This calls the same
// route handler and extracts the text from the same bytes with pdftotext.
async function pdfTextFromRoute(doc) {
  assert.equal(validatePdfDocument(doc), true, `packet failed validation for ${doc.title}`);
  const response = await outcomePdfPost(new Request('https://example.test/api/outcome-pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(doc),
  }));
  assert.equal(response.status, 200, `PDF route failed for ${doc.title}`);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(response.headers.get('content-disposition'), /attachment/);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
  if (!hasPdftotext()) {
    console.warn('pdftotext not installed: PDF text assertions skipped for', doc.title);
    return null;
  }
  const dir = mkdtempSync(join(tmpdir(), 'pep-paid-pdf-'));
  try {
    const file = join(dir, 'packet.pdf');
    writeFileSync(file, bytes);
    return execFileSync('pdftotext', [file, '-'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// pdftotext renders the PDF's em-dash inconsistently by font (a space in
// the serif heading, a hyphen in the footer), so comparisons are
// dash-insensitive: strip dash glyphs and collapse whitespace on both
// sides. The words and figures are all still asserted exactly.
function normalize(text) {
  return text.replace(/[—–-]/g, '').replace(/\s+/g, ' ');
}

// Minimal D1-compatible binding over node:sqlite — the outcome-sharing
// tests' shim, plus raw(): drizzle 0.45 calls stmt.bind(...).raw() for
// typed selects, and raw() returns positional row arrays. node:sqlite
// returns objects keyed in SELECT order, so Object.values aligns.
function localD1(sqlite) {
  return {
    prepare: (sql) => {
      let params = [];
      const stmt = {
        bind: (...args) => { params = args; return stmt; },
        run: () => { sqlite.prepare(sql).run(...params); return Promise.resolve({ success: true }); },
        all: () => Promise.resolve({ success: true, results: sqlite.prepare(sql).all(...params) }),
        raw: () => Promise.resolve(sqlite.prepare(sql).all(...params).map((row) => Object.values(row))),
      };
      return stmt;
    },
  };
}

const pdfCases = [
  { slug: 'iep-meeting-organizer', markers: ['Zelda Quill', 'Add 30 minutes of reading support weekly', 'November 22, 2026'] },
  { slug: 'home-project-bid-compare', markers: ['Zebra Builders', 'Quill Homes', '$16,600.00', '$15,100.00'] },
  { slug: 'clinical-rotation-pocket-prep', markers: ['Quill-method charting', 'SBAR handoff', 'Medication administration'] },
  { slug: 'etsy-profit-pricing-desk', markers: ['Quillstone mug', '$14.00'] },
  // The preorder label itself does not print; the computed preorder line
  // (crop, quantity, dollars) is what the packet carries.
  { slug: 'farmers-market-morning-board', markers: ['Zebra Chard', '4 bunches preordered', '$20.00 in preorders', 'Pick 20 bunches of Zebra Chard'] },
  { slug: 'roommate-move-out-splitter', markers: ['Ana Quill', 'Bo Zebra', '$2,280.00'] },
  { slug: 'festival-planner', markers: ['The Wanderers', 'Glass Tide', '$2,250.00', "Maya's share: $750.00"] },
];

test('the paid packet set is the seven PACKET_SLUGS Rallies — Travel Proposal has no PDF by design', () => {
  assert.deepEqual([...PACKET_SLUGS].sort(), [
    'clinical-rotation-pocket-prep',
    'etsy-profit-pricing-desk',
    'farmers-market-morning-board',
    'festival-planner',
    'home-project-bid-compare',
    'iep-meeting-organizer',
    'roommate-move-out-splitter',
  ]);
  assert.deepEqual(pdfCases.map((entry) => entry.slug).sort(), [...PACKET_SLUGS].sort());
  // Travel Proposal Studio is mini-site-first: its artifact is the shared
  // proposal link, not a packet. The workspace offers no PDF button for it.
  assert.ok(!PACKET_SLUGS.includes('travel-proposal-studio'));
  assert.ok(SHAREABLE_MARKET_SLUGS.has('travel-proposal-studio'));
});

for (const { slug, markers } of pdfCases) {
  test(`paid PDF download: ${slug} returns a real packet with its computed content`, async () => {
    const doc = buildDoc(slug);
    const text = await pdfTextFromRoute(doc);
    if (text === null) return; // pdftotext missing: structure already asserted.
    const flat = normalize(text);
    assert.ok(flat.includes(normalize(doc.title)), `packet text is missing its title: ${doc.title}`);
    for (const marker of markers) assert.ok(flat.includes(normalize(marker)), `packet text for ${slug} is missing: ${marker}`);
  });
}

test('a privately created share link for each shareable paid Rally opens signed out', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
  const db = drizzle(localD1(sqlite), { schema: { savedOutcomes } });
  const now = new Date();
  // The shareable paid Rallies: Travel Proposal, Bid Compare, Festival.
  // The PDF-first Rallies lead with the packet and offer no share link.
  assert.deepEqual([...SHAREABLE_MARKET_SLUGS].sort(), ['festival-planner', 'home-project-bid-compare', 'travel-proposal-studio']);
  const shareMarkers = {
    'travel-proposal-studio': ['Lisbon', 'Hotel Quill', 'Sintra'],
    'home-project-bid-compare': ['Zebra Builders', '$16,600.00'],
    'festival-planner': ['The Wanderers', '$2,250.00'],
  };
  for (const slug of [...SHAREABLE_MARKET_SLUGS]) {
    const doc = buildDoc(slug);
    const slugToken = newOutcomeSlug();
    // Seeded the way POST /api/outcomes would store it: a real document,
    // a fresh unguessable slug, shared explicitly (isPublic 1).
    await db.insert(savedOutcomes).values({
      id: crypto.randomUUID(), ownerUserId: 'test-user-1', rallySlug: slug,
      title: doc.title, document: JSON.stringify(doc), slug: slugToken,
      isPublic: 1, createdAt: now, updatedAt: now,
    });
    // The /s/[slug] page's exact lookup, then its exact public-read rule.
    const [row] = await db.select().from(savedOutcomes).where(eq(savedOutcomes.slug, slugToken)).limit(1);
    const found = publicOutcomeFromRow(row);
    assert.deepEqual(found, doc, `signed-out read lost content for ${slug}`);
    const text = JSON.stringify(found);
    for (const marker of shareMarkers[slug]) assert.ok(text.includes(marker), `shared page for ${slug} is missing: ${marker}`);
  }
  // A private outcome never leaks its existence to a signed-out visitor:
  // the same lookup returns null, exactly like a missing link.
  const privateSlug = newOutcomeSlug();
  await db.insert(savedOutcomes).values({
    id: crypto.randomUUID(), ownerUserId: 'test-user-1', rallySlug: 'festival-planner',
    title: 'Private weekend', document: JSON.stringify(buildDoc('festival-planner')),
    slug: privateSlug, isPublic: 0, createdAt: now, updatedAt: now,
  });
  const [privateRow] = await db.select().from(savedOutcomes).where(eq(savedOutcomes.slug, privateSlug)).limit(1);
  assert.equal(publicOutcomeFromRow(privateRow), null);
  // The public page really is the thin wrapper over this rule.
  const page = readFileSync(new URL('../app/s/[slug]/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /publicOutcomeFromRow\(row\)/);
  assert.match(page, /eq\(savedOutcomes\.slug, slug\)/);
  sqlite.close();
});

test('a test entitlement unlocks the paid Rally in the rally-access lookup', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0001_sticky_rattler.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../drizzle/0006_mute_vampiro.sql', import.meta.url), 'utf8'));
  const db = drizzle(localD1(sqlite), { schema: { purchases } });
  const now = new Date();
  const seed = (id, toolSlug, status, stripeSessionId) => db.insert(purchases).values({
    id, buyerUserId: 'test-user-1', toolSlug, title: 'Test purchase',
    amountCents: 1000, platformFeeCents: 0, creatorEarningsCents: 1000,
    status, stripeSessionId, createdAt: now,
  });
  // The seeded test entitlement: paid + unlocked, test-mode session.
  await seed('paid-test', 'catalog:iep-meeting-organizer', 'paid_and_unlocked', 'cs_test_paid1');
  // Lookalikes that must NOT unlock: unpaid, and a live-mode session.
  await seed('pending-test', 'catalog:etsy-profit-pricing-desk', 'pending', 'cs_test_pending1');
  await seed('paid-live', 'catalog:clinical-rotation-pocket-prep', 'paid_and_unlocked', 'cs_live_paid1');
  // The /api/rally-access query, verbatim: buyer + tool + paid status +
  // the session prefix for the current commerce mode.
  const lookup = async (slug, mode) => db.select({ id: purchases.id }).from(purchases).where(and(
    eq(purchases.buyerUserId, 'test-user-1'),
    eq(purchases.toolSlug, `catalog:${slug}`),
    eq(purchases.status, 'paid_and_unlocked'),
    like(purchases.stripeSessionId, mode === 'test' ? 'cs_test_%' : 'cs_live_%'),
  )).limit(1);
  assert.equal((await lookup('iep-meeting-organizer', 'test')).length, 1);
  assert.equal((await lookup('etsy-profit-pricing-desk', 'test')).length, 0);
  assert.equal((await lookup('clinical-rotation-pocket-prep', 'test')).length, 0);
  assert.equal((await lookup('clinical-rotation-pocket-prep', 'live')).length, 1);
  assert.equal((await lookup('iep-meeting-organizer', 'live')).length, 0);
  // The live route really does gate on this query shape.
  const route = readFileSync(new URL('../app/api/rally-access/route.ts', import.meta.url), 'utf8');
  assert.match(route, /eq\(purchases\.status, "paid_and_unlocked"\)/);
  assert.match(route, /PEP_RALLY_COMMERCE_MODE==="test"\?"cs_test_%":"cs_live_%"/);
  sqlite.close();
});
