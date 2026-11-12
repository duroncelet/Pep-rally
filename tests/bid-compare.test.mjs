import test from "node:test";
import assert from "node:assert/strict";

import { parseMoneyToCents, formatCents, computeBidComparison, bidCompareSections, bidCompareHeadline } from "../app/bid-compare.ts";

const bid = (overrides = {}) => ({
  name: "",
  quotedCents: null,
  items: [],
  allowances: [],
  exclusions: [],
  depositCents: null,
  weeks: null,
  ...overrides,
});

test("money parsing accepts buyer-typed amounts and rejects anything else", () => {
  assert.equal(parseMoneyToCents("$14,000"), 1_400_000);
  assert.equal(parseMoneyToCents("14000.50"), 1_400_050);
  assert.equal(parseMoneyToCents(" 8500 "), 850_000);
  assert.equal(parseMoneyToCents(""), null);
  assert.equal(parseMoneyToCents("about 14k"), null);
  assert.equal(parseMoneyToCents("-500"), null);
  assert.equal(parseMoneyToCents("14.999"), null);
});

test("money formatting handles negative adjustments", () => {
  assert.equal(formatCents(1_900_000), "$19,000.00");
  assert.equal(formatCents(-250_00), "-$250.00");
  assert.equal(formatCents(0), "$0.00");
});

test("true cost reprices allowances and adds exclusions back", () => {
  const comparison = computeBidComparison([
    bid({
      name: "Bid A",
      quotedCents: 1_400_000,
      items: [{ label: "Tile", cents: 500_000 }],
      allowances: [{ label: "Tile allowance", allowanceCents: 99_00, expectedCents: 899_00 }],
      exclusions: [{ label: "Permit", estimatedCents: 400_000 }],
    }),
  ]);
  const [computed] = comparison.bids;
  // $14,000 + ($899 − $99 tile allowance shortfall) + $4,000 permit = $18,800.
  assert.equal(computed.trueCents, 1_880_000);
  assert.equal(computed.allowanceAdjustmentCents, 80_000);
  assert.equal(computed.exclusionCents, 400_000);
  assert.equal(computed.deltaCents, 480_000);
  assert.equal(computed.trueIsFloor, false);
});

test("the reveal fires when the lowest quote is not the lowest true cost", () => {
  const comparison = computeBidComparison([
    bid({ name: "Bid A", quotedCents: 1_400_000, exclusions: [{ label: "Demo", estimatedCents: 500_000 }] }),
    bid({ name: "Bid B", quotedCents: 1_600_000 }),
  ]);
  assert.equal(comparison.quotedCheapest?.name, "Bid A");
  assert.equal(comparison.trueCheapest?.name, "Bid B");
  assert.equal(comparison.reveal, true);
  assert.equal(comparison.spreadCents, 300_000);
  const headline = bidCompareHeadline([
    bid({ name: "Bid A", quotedCents: 1_400_000, exclusions: [{ label: "Demo", estimatedCents: 500_000 }] }),
    bid({ name: "Bid B", quotedCents: 1_600_000 }),
  ]);
  assert.match(headline.headline, /Bid A isn't \$14,000\.00 — it's \$19,000\.00/);
});

test("missing scope items are flagged with reference prices from other bids", () => {
  const comparison = computeBidComparison([
    bid({ name: "Bid A", quotedCents: 1_400_000, items: [{ label: "Framing", cents: 400_000 }] }),
    bid({ name: "Bid B", quotedCents: 1_600_000, items: [{ label: "Framing", cents: 420_000 }, { label: "Tile", cents: 240_000 }] }),
  ]);
  assert.deepEqual(comparison.bids[0].missingItems, [{ label: "Tile", referenceCents: [240_000] }]);
  assert.deepEqual(comparison.bids[1].missingItems, []);
});

test("unpriced lines make the true cost a floor, never a guess", () => {
  const comparison = computeBidComparison([
    bid({
      name: "Bid A",
      quotedCents: 1_400_000,
      items: [{ label: "Tile", cents: null }],
      allowances: [{ label: "Fixtures", allowanceCents: 100_000, expectedCents: null }],
      exclusions: [{ label: "Haul-away", estimatedCents: null }],
    }),
  ]);
  const [computed] = comparison.bids;
  assert.equal(computed.trueCents, 1_400_000);
  assert.equal(computed.trueIsFloor, true);
  assert.equal(computed.unpricedItems, 1);
  assert.equal(computed.allowancesIncomplete, 1);
  assert.equal(computed.exclusionsUnpriced, 1);
});

test("line-item sum differing from the quote is flagged", () => {
  const comparison = computeBidComparison([
    bid({ name: "Bid A", quotedCents: 1_400_000, items: [{ label: "Labor", cents: 900_000 }, { label: "Materials", cents: 400_000 }] }),
  ]);
  assert.equal(comparison.bids[0].lineTotalCents, 1_300_000);
  assert.equal(comparison.bids[0].lineTotalDiffers, true);
});

test("deposit check applies the California lesser-of-$1,000-or-10% cap", () => {
  const comparison = computeBidComparison([
    bid({ name: "Bid A", quotedCents: 1_400_000, depositCents: 200_000 }),
    bid({ name: "Bid B", quotedCents: 1_400_000, depositCents: 100_000 }),
    bid({ name: "Bid C", quotedCents: 800_000, depositCents: 90_000 }),
  ]);
  // $14,000 quote: cap is min($1,000, $1,400) = $1,000. $2,000 is over; $1,000 is not.
  assert.equal(comparison.bids[0].caDepositCapCents, 100_000);
  assert.equal(comparison.bids[0].depositOverCaCap, true);
  assert.equal(comparison.bids[1].depositOverCaCap, false);
  // $8,000 quote: cap is min($1,000, $800) = $800. $900 is over.
  assert.equal(comparison.bids[2].caDepositCapCents, 80_000);
  assert.equal(comparison.bids[2].depositOverCaCap, true);
});

test("no quoted total means no computed output — nothing is invented", () => {
  const comparison = computeBidComparison([bid({ name: "Bid A" })]);
  assert.equal(comparison.priced.length, 0);
  assert.equal(comparison.trueCheapest, null);
  assert.deepEqual(bidCompareSections([bid({ name: "Bid A" })], "", ""), []);
});

test("sections carry the reveal, missing items, and the buyer's own must-haves", () => {
  const sections = bidCompareSections(
    [
      bid({ name: "Bid A", quotedCents: 1_400_000, items: [{ label: "Framing", cents: 400_000 }], exclusions: [{ label: "Demo", estimatedCents: 500_000 }] }),
      bid({ name: "Bid B", quotedCents: 1_600_000, items: [{ label: "Framing", cents: 420_000 }, { label: "Tile", cents: 240_000 }] }),
    ],
    "Tile, Permit",
    "Are permits included?",
  );
  const titles = sections.map((section) => section.title);
  assert.ok(titles.includes("True-cost comparison"));
  assert.ok(titles.includes("What's missing from each bid"));
  assert.ok(titles.includes("Decision record"));
  const text = JSON.stringify(sections);
  assert.match(text, /The reveal/);
  assert.match(text, /Bid A has no line for “Tile\.”/);
  assert.match(text, /Must-have “Tile” — named as a line item by Bid B/);
  assert.match(text, /Ask each contractor: Are permits included\?/);
});
