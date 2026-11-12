import test from "node:test";
import assert from "node:assert/strict";

import { parseMoneyToCents, parseDecimal, formatCents, feesForSale, netForPrice, computeEtsyPricing, etsySections, etsyHeadline, ETSY_POLICY_FEES } from "../app/etsy-pricing.ts";

const input = (overrides = {}) => ({
  productName: "",
  materials: [],
  laborHours: null,
  laborRateCents: null,
  packagingCents: null,
  otherCosts: [],
  shippingCostCents: null,
  shippingChargedCents: null,
  currentPriceCents: null,
  targetMarginPct: null,
  monthlyFixedCents: null,
  fees: { ...ETSY_POLICY_FEES },
  ...overrides,
});

// The audit's shape: a $24 listing. Materials $5, labor 0.5h at $16 ($8),
// packaging $1 — unit cost $14. Free shipping costing $3.
const example = input({
  productName: "Stoneware mug",
  materials: [{ label: "Clay + glaze", cents: 500 }],
  laborHours: 0.5,
  laborRateCents: 1600,
  packagingCents: 100,
  shippingCostCents: 300,
  currentPriceCents: 2400,
  targetMarginPct: 30,
  monthlyFixedCents: 10000,
});

test("money and decimal parsing accept buyer-typed values and reject the rest", () => {
  assert.equal(parseMoneyToCents("$24"), 2400);
  assert.equal(parseMoneyToCents("24.99"), 2499);
  assert.equal(parseMoneyToCents(""), null);
  assert.equal(parseMoneyToCents("twenty"), null);
  assert.equal(parseDecimal("30"), 30);
  assert.equal(parseDecimal("6.5%"), 6.5);
  assert.equal(parseDecimal(""), null);
  assert.equal(formatCents(-427), "-$4.27");
});

test("fees follow the Etsy policy schedule: $0.20 + 3% + $0.25, 6.5% on price + shipping charged", () => {
  // $24 price, no shipping charged: $0.45 fixed + 9.5% of $24 ($2.28) = $2.73.
  assert.equal(feesForSale(2400, 0, ETSY_POLICY_FEES), 273);
  // $24 price + $5 shipping charged: $0.45 + 9.5% of $29 ($2.76) = $3.21.
  assert.equal(feesForSale(2400, 500, ETSY_POLICY_FEES), 321);
  // Offsite Ads at 15% adds 15% of the total charged.
  assert.equal(feesForSale(2400, 0, { ...ETSY_POLICY_FEES, adsPct: 15 }), 273 + 360);
});

test("the reveal: a $24 listing nets about $4 after costs and fees", () => {
  const computed = computeEtsyPricing(example);
  assert.equal(computed.unitCostCents, 1400);
  assert.equal(computed.currentNetCents, 427);
  assert.equal(netForPrice(2400, example), 427);
});

test("floor, target, and premium prices are solved from the costs, rounded up to the cent", () => {
  const computed = computeEtsyPricing(example);
  // Floor: ($14 + $3 + $0.45) / (1 − 0.095) = $19.29 — nets $0.01, never under-covers.
  assert.equal(computed.floorPriceCents, 1929);
  assert.equal(netForPrice(1929, example), 1);
  // Target at 30% margin: $17.45 / 0.605 = $28.85, netting $8.66 (30.0% of price).
  assert.equal(computed.targetPriceCents, 2885);
  assert.equal(computed.targetNetCents, 866);
  // Premium holds the 30% margin even with Offsite Ads at 15%: $17.45 / 0.455 = $38.36.
  assert.equal(computed.premiumPriceCents, 3836);
  const premiumNet = netForPrice(3836, { ...example, fees: { ...ETSY_POLICY_FEES, adsPct: 15 } });
  assert.ok(premiumNet / 3836 >= 0.30);
});

test("zero labor is flagged, never silently accepted", () => {
  const noLabor = computeEtsyPricing(input({ materials: [{ label: "Clay", cents: 500 }] }));
  assert.equal(noLabor.laborIsZero, true);
  assert.equal(computeEtsyPricing(example).laborIsZero, false);
  assert.match(JSON.stringify(etsySections(input({ materials: [{ label: "Clay", cents: 500 }] }))), /the #1 pricing failure/);
});

test("an impossible margin returns no target price instead of a nonsense number", () => {
  const computed = computeEtsyPricing({ ...example, targetMarginPct: 95 });
  assert.equal(computed.targetPriceCents, null);
  assert.equal(computed.premiumPriceCents, null);
});

test("break-even quantity divides fixed costs by contribution per sale", () => {
  // $100 fixed / $8.66 contribution at the target price = 12 sales a month.
  assert.equal(computeEtsyPricing(example).breakEvenQty, 12);
  // A price that contributes nothing has no break-even.
  const losing = computeEtsyPricing({ ...example, targetMarginPct: null, currentPriceCents: 1500, monthlyFixedCents: 10000 });
  assert.equal(losing.breakEvenQty, null);
  assert.equal(losing.breakEvenImpossible, true);
});

test("charged shipping is added to the take-home and to the fee base", () => {
  const computed = computeEtsyPricing({ ...example, shippingCostCents: 400, shippingChargedCents: 500 });
  // $24 + $5 charged − $4 cost − $14 unit − $3.21 fees = $7.79.
  assert.equal(computed.currentNetCents, 779);
});

test("headline states the reveal in the seller's own numbers", () => {
  const { headline, summary } = etsyHeadline(example);
  assert.equal(headline, "You're making $4.27, not $24.00.");
  assert.match(summary, /Stoneware mug: your \$24\.00 listing nets \$4\.27 per sale/);
  assert.match(summary, /\$28\.85 nets \$8\.66/);
});

test("blank inputs produce the cost section only — no invented prices", () => {
  const sections = etsySections(input());
  assert.deepEqual(sections.map((section) => section.title), ["True unit cost"]);
  assert.match(JSON.stringify(sections), /True unit cost: \$0\.00/);
  assert.equal(computeEtsyPricing(input()).floorPriceCents, null);
});
