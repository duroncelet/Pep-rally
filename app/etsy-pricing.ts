// Etsy Profit & Pricing Desk — pricing math from the seller's own costs.
//
// Part 4 of the Nov 11, 2026 build (all-Rallies consumer audit, section 5).
// The promise was "turn materials, labor, packaging, fees, and shipping
// into a price you can explain" — but there was no arithmetic anywhere: no
// numeric inputs, no fee table, no calculation, and the promised break-even
// quantity was entirely absent. This module does the math: true unit cost
// (materials + labor + packaging + other), Etsy's fees, the take-home at the
// seller's current price vs the recommended price, three price scenarios
// solved from the costs, and the break-even quantity.
//
// The buy trigger, in the audit's words: the "you're making $X, not $Y"
// reveal — the moment the Rally shows a seller that her $24 listing nets
// her $4 after fees and labor, and that $29 nets her $11.
//
// Fee schedule, verified against Etsy policy (POLICY in the audit): $0.20
// listing, 6.5% transaction (on item + shipping + gift wrap), 3% + $0.25
// payment processing, Offsite Ads 15% / 12%. The schedule is shown in the
// workspace and editable — the catalog guardrail says fee assumptions stay
// visible and editable — and the workspace tells the seller to recheck the
// live policy before publishing, because fees change. Tax is not modeled;
// the workspace says so.
//
// Labor at $0 is the #1 failure mode in the firsthand accounts ("most of us
// price [our time] at exactly zero"), so zero labor is flagged loudly, never
// silently accepted. The $15–50/hr rate bands and the $1.50/order packaging
// figure are guide-only in the audit: no rate or packaging cost is prefilled
// or suggested here. The market sanity check (audit gap 7, lower priority)
// and re-pricing reminders (needs persistence, Part 1B B1's lane) are not
// built; both are flagged in the PR.
//
// Pure functions only — no React, no I/O — so the PDF packet (Part 1B, A6)
// can render the same priced line from etsySections(). Money is integer
// cents throughout; percentage fees are computed on exact values and prices
// are rounded UP to the cent so a solved price never under-covers.

import type { ResultSection } from "./rally-results";

export type EtsyCostRow = { label: string; cents: number | null };
export type EtsyFees = { listingCents: number; paymentFixedCents: number; transactionPct: number; paymentPct: number; adsPct: number };

export type EtsyPricingInput = {
  productName: string;
  materials: EtsyCostRow[];
  laborHours: number | null;
  laborRateCents: number | null;
  packagingCents: number | null;
  otherCosts: EtsyCostRow[];
  shippingCostCents: number | null;
  shippingChargedCents: number | null;
  currentPriceCents: number | null;
  targetMarginPct: number | null;
  monthlyFixedCents: number | null;
  fees: EtsyFees;
};

/** Etsy fee schedule as verified against Etsy policy for this build. */
export const ETSY_POLICY_FEES: EtsyFees = { listingCents: 20, paymentFixedCents: 25, transactionPct: 6.5, paymentPct: 3, adsPct: 0 };

export type EtsyPricingComputed = {
  materialsCents: number;
  laborCents: number | null;
  laborIsZero: boolean;
  packagingCents: number;
  otherCents: number;
  unitCostCents: number;
  shippingCostCents: number;
  shippingChargedCents: number;
  pctRate: number;
  fixedFeesCents: number;
  currentNetCents: number | null;
  floorPriceCents: number | null;
  targetPriceCents: number | null;
  targetNetCents: number | null;
  premiumPriceCents: number | null;
  breakEvenQty: number | null;
  breakEvenImpossible: boolean;
};

export function parseMoneyToCents(value: string): number | null {
  const cleaned = value.trim().replace(/^\$/, "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 100_000_000_00) return null;
  return cents;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}${(Math.abs(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}`;
}

export function parseDecimal(value: string): number | null {
  const cleaned = value.trim().replace(/%$/, "").trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function sumRows(rows: EtsyCostRow[]): number {
  return rows.reduce((sum, row) => sum + (row.label.trim() && row.cents !== null ? row.cents : 0), 0);
}

function ceilCents(exactCents: number): number {
  return Math.ceil(exactCents - 1e-9);
}

/**
 * Fees on a sale at `priceCents` with `shippingChargedCents` charged to the
 * buyer. Percentage fees apply to price + shipping charged (the 6.5%
 * transaction fee covers item + shipping + gift wrap; payment processing
 * covers the total charged).
 */
export function feesForSale(priceCents: number, shippingChargedCents: number, fees: EtsyFees): number {
  const pct = (fees.transactionPct + fees.paymentPct + fees.adsPct) / 100;
  return fees.listingCents + fees.paymentFixedCents + Math.round(pct * (priceCents + shippingChargedCents));
}

/** Take-home per sale at a given price: what the seller keeps after costs, shipping, and fees. */
export function netForPrice(priceCents: number, input: EtsyPricingInput): number {
  const computed = computeEtsyPricing({ ...input, currentPriceCents: priceCents });
  return computed.currentNetCents ?? 0;
}

export function computeEtsyPricing(input: EtsyPricingInput): EtsyPricingComputed {
  const materialsCents = sumRows(input.materials);
  const laborCents = input.laborHours !== null && input.laborRateCents !== null
    ? Math.round(input.laborHours * input.laborRateCents)
    : null;
  const laborIsZero = laborCents === null || laborCents === 0;
  const packagingCents = input.packagingCents ?? 0;
  const otherCents = sumRows(input.otherCosts);
  const unitCostCents = materialsCents + (laborCents ?? 0) + packagingCents + otherCents;
  const shippingCostCents = input.shippingCostCents ?? 0;
  const shippingChargedCents = input.shippingChargedCents ?? 0;
  const pctRate = (input.fees.transactionPct + input.fees.paymentPct + input.fees.adsPct) / 100;
  const fixedFeesCents = input.fees.listingCents + input.fees.paymentFixedCents;

  // Solve: price × (1 − pct − margin) = unitCost + shipCost + fixed + pct × shipCharged − shipCharged.
  // Floor uses margin 0; target uses the buyer's margin; premium re-solves
  // with Offsite Ads at 15% so the margin holds even when an ad takes its cut.
  const solve = (margin: number, pct: number): number | null => {
    const denominator = 1 - pct - margin;
    if (denominator <= 0) return null;
    const baseWithPct = unitCostCents + shippingCostCents + fixedFeesCents + pct * shippingChargedCents - shippingChargedCents;
    const price = baseWithPct / denominator;
    if (!Number.isFinite(price) || price < 0) return null;
    return ceilCents(price);
  };
  const floorPriceCents = unitCostCents > 0 || shippingCostCents > 0 ? solve(0, pctRate) : null;
  const targetPriceCents = input.targetMarginPct !== null && input.targetMarginPct >= 0 && input.targetMarginPct < 100
    ? solve(input.targetMarginPct / 100, pctRate)
    : null;
  const premiumPct = (input.fees.transactionPct + input.fees.paymentPct + 15) / 100;
  const premiumPriceCents = input.targetMarginPct !== null && input.targetMarginPct >= 0 && input.targetMarginPct < 100
    ? solve(input.targetMarginPct / 100, premiumPct)
    : null;

  const currentNetCents = input.currentPriceCents === null
    ? null
    : input.currentPriceCents + shippingChargedCents - shippingCostCents - unitCostCents - feesForSale(input.currentPriceCents, shippingChargedCents, input.fees);
  const targetNetCents = targetPriceCents === null
    ? null
    : targetPriceCents + shippingChargedCents - shippingCostCents - unitCostCents - feesForSale(targetPriceCents, shippingChargedCents, input.fees);

  // Break-even quantity: monthly fixed costs ÷ contribution per sale at the
  // target price (falling back to the current price). No break-even exists
  // when a sale contributes nothing.
  const contribution = targetNetCents !== null ? targetNetCents : currentNetCents;
  let breakEvenQty: number | null = null;
  let breakEvenImpossible = false;
  if (input.monthlyFixedCents !== null && input.monthlyFixedCents > 0) {
    if (contribution === null || contribution <= 0) breakEvenImpossible = true;
    else breakEvenQty = Math.ceil(input.monthlyFixedCents / contribution);
  }
  return {
    materialsCents, laborCents, laborIsZero, packagingCents, otherCents, unitCostCents,
    shippingCostCents, shippingChargedCents, pctRate, fixedFeesCents,
    currentNetCents, floorPriceCents, targetPriceCents, targetNetCents,
    premiumPriceCents, breakEvenQty, breakEvenImpossible,
  };
}

/** Computed outcome sections, shared by the workspace and the PDF packet (Part 1B, A6). */
export function etsySections(input: EtsyPricingInput): ResultSection[] {
  const computed = computeEtsyPricing(input);
  const sections: ResultSection[] = [];
  const name = input.productName.trim() || "This product";

  const costItems: string[] = [];
  if (computed.materialsCents > 0) costItems.push(`Materials: ${formatCents(computed.materialsCents)} per unit.`);
  if (computed.laborCents !== null && computed.laborCents > 0) costItems.push(`Labor: ${formatCents(computed.laborCents)} per unit (${input.laborHours} hours at ${formatCents(input.laborRateCents ?? 0)}/hour).`);
  if (computed.laborIsZero) costItems.push("Labor: $0.00 — the #1 pricing failure. Most sellers price their time at exactly zero; price it or the price lies.");
  if (computed.packagingCents > 0) costItems.push(`Packaging: ${formatCents(computed.packagingCents)} per unit.`);
  if (computed.otherCents > 0) costItems.push(`Other per-unit costs: ${formatCents(computed.otherCents)}.`);
  if (computed.shippingCostCents > 0) costItems.push(computed.shippingChargedCents > 0 ? `Shipping: costs ${formatCents(computed.shippingCostCents)}, charging the buyer ${formatCents(computed.shippingChargedCents)}.` : `Shipping: costs ${formatCents(computed.shippingCostCents)} and is not charged to the buyer — it comes out of your margin.`);
  costItems.push(`True unit cost: ${formatCents(computed.unitCostCents)} before fees.`);
  costItems.push(`Fees per sale: ${formatCents(computed.fixedFeesCents)} fixed ($${(input.fees.listingCents / 100).toFixed(2)} listing + $${(input.fees.paymentFixedCents / 100).toFixed(2)} payment) plus ${(computed.pctRate * 100).toFixed(1)}% of the price and shipping charged.`);
  if (costItems.length) sections.push({ title: "True unit cost", items: costItems });

  if (computed.currentNetCents !== null && input.currentPriceCents !== null) {
    const revealItems = [`At your current price of ${formatCents(input.currentPriceCents)}, you keep ${formatCents(computed.currentNetCents)} per sale after costs and fees.`];
    if (computed.targetPriceCents !== null && computed.targetNetCents !== null) {
      revealItems.push(`At the recommended ${formatCents(computed.targetPriceCents)}, you keep ${formatCents(computed.targetNetCents)} per sale.`);
    }
    sections.push({ title: "Your price, revealed", intro: `${name} — what you actually take home.`, items: revealItems });
  }

  const scenarioItems: string[] = [];
  if (computed.floorPriceCents !== null) scenarioItems.push(`Floor price ${formatCents(computed.floorPriceCents)} · covers every unit cost and fee, with no profit and no cushion.`);
  if (computed.targetPriceCents !== null) scenarioItems.push(`Target price ${formatCents(computed.targetPriceCents)} · covers costs plus your ${input.targetMarginPct}% margin.`);
  if (computed.premiumPriceCents !== null) scenarioItems.push(`Premium price ${formatCents(computed.premiumPriceCents)} · holds your ${input.targetMarginPct}% margin even if Offsite Ads takes 15%.`);
  if (input.targetMarginPct === null && computed.floorPriceCents !== null) scenarioItems.push("Add your target margin to set the target and premium prices.");
  if (scenarioItems.length) sections.push({ title: "Three price scenarios", items: scenarioItems });

  if (input.monthlyFixedCents !== null && input.monthlyFixedCents > 0) {
    if (computed.breakEvenQty !== null) sections.push({ title: "Break-even quantity", items: [`With ${formatCents(input.monthlyFixedCents)} in monthly fixed costs, you break even at ${computed.breakEvenQty} sale${computed.breakEvenQty === 1 ? "" : "s"} a month at the ${computed.targetPriceCents !== null ? "target" : "current"} price.`] });
    else if (computed.breakEvenImpossible) sections.push({ title: "Break-even quantity", items: ["No break-even exists at this price — each sale contributes nothing toward fixed costs after fees. Raise the price or cut a cost."] });
  }
  return sections;
}

export function etsyHeadline(input: EtsyPricingInput): { headline: string; summary: string } {
  const computed = computeEtsyPricing(input);
  const name = input.productName.trim();
  if (computed.currentNetCents !== null && input.currentPriceCents !== null && computed.targetNetCents !== null && computed.targetPriceCents !== null) {
    return {
      headline: `You're making ${formatCents(computed.currentNetCents)}, not ${formatCents(input.currentPriceCents)}.`,
      summary: `${name ? `${name}: ` : ""}your ${formatCents(input.currentPriceCents)} listing nets ${formatCents(computed.currentNetCents)} per sale after costs and fees; ${formatCents(computed.targetPriceCents)} nets ${formatCents(computed.targetNetCents)}.`,
    };
  }
  if (computed.unitCostCents > 0) {
    return { headline: "Your pricing desk", summary: `${name ? `${name}: ` : ""}true unit cost ${formatCents(computed.unitCostCents)} before fees. Add your current price to see what you actually keep.` };
  }
  return { headline: "Your pricing desk", summary: "Add materials and labor to see the true unit cost — then the price that covers it." };
}
