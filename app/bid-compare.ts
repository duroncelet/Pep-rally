// Home Project Bid Compare — true-cost computation.
//
// Part 4 of the Nov 11, 2026 build (all-Rallies consumer audit, section 12).
// The audit's headline finding: the concept workspaces echo the buyer's words
// back and compute nothing. This module is the computation for the strongest
// buy case in the catalog: the normalized true-cost reveal — "Bid A isn't
// $14,000, it's $19,000 once allowances are repriced and exclusions added
// back" — against a five-figure project.
//
// Everything computed here derives from buyer-entered bid line items. No
// prices, contractors, or scope items are invented: a bid with no quoted
// total produces no true cost, and an unpriced line is surfaced as an
// unknown, never filled in.
//
// Money is integer cents throughout. Pure functions only — no React, no I/O
// — so the PDF packet (Part 1B, A6) and the workspace render from the same
// numbers. Import bidCompareSections() there; do not re-derive them.

import type { ResultSection } from "./rally-results";

export type BidLineItem = { label: string; cents: number | null };
export type BidAllowance = { label: string; allowanceCents: number | null; expectedCents: number | null };
export type BidExclusion = { label: string; estimatedCents: number | null };

export type BidInput = {
  name: string;
  quotedCents: number | null;
  items: BidLineItem[];
  allowances: BidAllowance[];
  exclusions: BidExclusion[];
  depositCents: number | null;
  weeks: number | null;
};

export type BidComputed = {
  name: string;
  quotedCents: number | null;
  lineTotalCents: number | null;
  lineTotalDiffers: boolean;
  allowanceAdjustmentCents: number;
  allowancesIncomplete: number;
  exclusionCents: number;
  exclusionsUnpriced: number;
  unpricedItems: number;
  trueCents: number | null;
  /** True cost is a floor, not a total, when any line is unpriced. */
  trueIsFloor: boolean;
  deltaCents: number | null;
  missingItems: { label: string; referenceCents: number[] }[];
  depositCents: number | null;
  depositPct: number | null;
  /** California home-improvement cap: the lesser of $1,000 or 10% of the contract price. */
  caDepositCapCents: number | null;
  depositOverCaCap: boolean;
  weeks: number | null;
};

export type BidComparison = {
  bids: BidComputed[];
  priced: BidComputed[];
  quotedCheapest: BidComputed | null;
  trueCheapest: BidComputed | null;
  /** True when the lowest quote is not the lowest true cost — the reveal. */
  reveal: boolean;
  spreadCents: number | null;
};

export const MAX_BIDS = 4;

/** Parse buyer-typed money ("$14,000", "14000.50", " 8500 ") into integer cents. Null when blank or invalid. */
export function parseMoneyToCents(value: string): number | null {
  const cleaned = value.trim().replace(/^\$/, "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 100_000_000_00) return null;
  return cents;
}

/** Format integer cents as USD, including negative adjustments (formatPrice rejects negatives). */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}${(Math.abs(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}`;
}

function normalizeLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function displayName(bid: BidInput, index: number) {
  return bid.name.trim() || `Bid ${String.fromCharCode(65 + index)}`;
}

export function computeBidComparison(bids: BidInput[]): BidComparison {
  // Master scope: every distinct line-item label named in any bid.
  const scope = new Map<string, { label: string; referenceCents: number[] }>();
  for (const bid of bids) {
    for (const item of bid.items) {
      const key = normalizeLabel(item.label);
      if (!key) continue;
      const entry = scope.get(key) ?? { label: item.label.trim(), referenceCents: [] };
      if (item.cents !== null) entry.referenceCents.push(item.cents);
      scope.set(key, entry);
    }
  }

  const computed: BidComputed[] = bids.map((bid, index) => {
    const name = displayName(bid, index);
    const pricedItems = bid.items.filter((item) => item.label.trim() && item.cents !== null);
    const lineTotalCents = pricedItems.length ? pricedItems.reduce((sum, item) => sum + (item.cents ?? 0), 0) : null;
    const unpricedItems = bid.items.filter((item) => item.label.trim() && item.cents === null).length;
    let allowanceAdjustmentCents = 0;
    let allowancesIncomplete = 0;
    for (const allowance of bid.allowances) {
      if (!allowance.label.trim()) continue;
      if (allowance.allowanceCents === null || allowance.expectedCents === null) { allowancesIncomplete += 1; continue; }
      allowanceAdjustmentCents += allowance.expectedCents - allowance.allowanceCents;
    }
    let exclusionCents = 0;
    let exclusionsUnpriced = 0;
    for (const exclusion of bid.exclusions) {
      if (!exclusion.label.trim()) continue;
      if (exclusion.estimatedCents === null) { exclusionsUnpriced += 1; continue; }
      exclusionCents += exclusion.estimatedCents;
    }
    const trueCents = bid.quotedCents === null ? null : bid.quotedCents + allowanceAdjustmentCents + exclusionCents;
    const trueIsFloor = unpricedItems > 0 || allowancesIncomplete > 0 || exclusionsUnpriced > 0;
    const missingItems = [...scope.entries()]
      .filter(([key]) => !bid.items.some((item) => normalizeLabel(item.label) === key))
      .map(([, entry]) => ({ label: entry.label, referenceCents: entry.referenceCents }));
    const depositPct = bid.depositCents !== null && bid.quotedCents ? bid.depositCents / bid.quotedCents : null;
    const caDepositCapCents = bid.quotedCents === null ? null : Math.min(100_000, Math.round(bid.quotedCents / 10));
    return {
      name,
      quotedCents: bid.quotedCents,
      lineTotalCents,
      lineTotalDiffers: lineTotalCents !== null && bid.quotedCents !== null && lineTotalCents !== bid.quotedCents,
      allowanceAdjustmentCents,
      allowancesIncomplete,
      exclusionCents,
      exclusionsUnpriced,
      unpricedItems,
      trueCents,
      trueIsFloor,
      deltaCents: trueCents === null || bid.quotedCents === null ? null : trueCents - bid.quotedCents,
      missingItems,
      depositCents: bid.depositCents,
      depositPct,
      caDepositCapCents,
      depositOverCaCap: bid.depositCents !== null && caDepositCapCents !== null && bid.depositCents > caDepositCapCents,
      weeks: bid.weeks,
    };
  });

  const priced = computed.filter((bid) => bid.trueCents !== null);
  const byQuoted = [...computed].filter((bid) => bid.quotedCents !== null).sort((a, b) => (a.quotedCents ?? 0) - (b.quotedCents ?? 0));
  const byTrue = [...priced].sort((a, b) => (a.trueCents ?? 0) - (b.trueCents ?? 0));
  const quotedCheapest = byQuoted[0] ?? null;
  const trueCheapest = byTrue[0] ?? null;
  const spreadCents = byTrue.length > 1 ? (byTrue[byTrue.length - 1].trueCents ?? 0) - (byTrue[0].trueCents ?? 0) : null;
  return { bids: computed, priced, quotedCheapest, trueCheapest, reveal: quotedCheapest !== null && trueCheapest !== null && quotedCheapest.name !== trueCheapest.name, spreadCents };
}

function moneyLine(label: string, cents: number | null) {
  return cents === null ? `${label}: not entered yet.` : `${label}: ${formatCents(cents)}.`;
}

/**
 * Computed outcome sections, shared by the workspace and the PDF packet
 * (Part 1B, A6). `mustHaves` and `questions` are the buyer's own words,
 * split on line breaks, commas, or semicolons; nothing is added to them.
 */
export function bidCompareSections(bids: BidInput[], mustHaves: string, questions: string): ResultSection[] {
  const comparison = computeBidComparison(bids);
  const sections: ResultSection[] = [];
  if (comparison.priced.length === 0) return sections;

  const trueCostItems: string[] = [];
  for (const bid of comparison.priced) {
    const parts = [`Quoted ${formatCents(bid.quotedCents ?? 0)}`];
    if (bid.allowanceAdjustmentCents !== 0) parts.push(`allowances repriced ${bid.allowanceAdjustmentCents > 0 ? "+" : ""}${formatCents(bid.allowanceAdjustmentCents)}`);
    if (bid.exclusionCents > 0) parts.push(`exclusions added back +${formatCents(bid.exclusionCents)}`);
    const floor = bid.trueIsFloor ? " (at least — some lines are still unpriced)" : "";
    trueCostItems.push(`${bid.name}: ${parts.join(", ")} = true cost ${formatCents(bid.trueCents ?? 0)}${floor}.`);
    if (bid.lineTotalDiffers) trueCostItems.push(`${bid.name}: the line items entered add up to ${formatCents(bid.lineTotalCents ?? 0)}, not the quoted ${formatCents(bid.quotedCents ?? 0)} — check for a missing or mistyped line.`);
  }
  if (comparison.reveal && comparison.quotedCheapest && comparison.trueCheapest) {
    trueCostItems.push(`The reveal: ${comparison.quotedCheapest.name} looks cheapest at ${formatCents(comparison.quotedCheapest.quotedCents ?? 0)}, but ${comparison.trueCheapest.name} is cheapest once the real costs are counted, at ${formatCents(comparison.trueCheapest.trueCents ?? 0)}.`);
  } else if (comparison.trueCheapest) {
    trueCostItems.push(`Lowest true cost: ${comparison.trueCheapest.name} at ${formatCents(comparison.trueCheapest.trueCents ?? 0)}.`);
  }
  if (comparison.spreadCents !== null && comparison.spreadCents > 0) {
    trueCostItems.push(`Spread between the highest and lowest true cost: ${formatCents(comparison.spreadCents)}.`);
  }
  sections.push({ title: "True-cost comparison", intro: "Quoted price, repriced allowances, and exclusions added back — from the numbers you entered.", items: trueCostItems });

  const missingItems: string[] = [];
  for (const bid of comparison.bids) {
    for (const missing of bid.missingItems) {
      const reference = missing.referenceCents.length
        ? ` Other bids price it at ${missing.referenceCents.map((cents) => formatCents(cents)).join(" / ")} — ask whether it is included or a change order later.`
        : " Ask whether it is included or a change order later.";
      missingItems.push(`${bid.name} has no line for “${missing.label}.”${reference}`);
    }
  }
  if (missingItems.length) sections.push({ title: "What's missing from each bid", intro: "A bid that leaves a scope item out is not cheaper — it is a change order waiting to happen.", items: missingItems });

  const paymentItems: string[] = [];
  for (const bid of comparison.bids) {
    if (bid.depositCents === null && bid.weeks === null) continue;
    const bits: string[] = [];
    if (bid.depositCents !== null) {
      bits.push(`deposit ${formatCents(bid.depositCents)}${bid.depositPct !== null ? ` (${(bid.depositPct * 100).toFixed(0)}% of the quote)` : ""}`);
      if (bid.depositOverCaCap && bid.caDepositCapCents !== null) bits.push(`above the California cap of ${formatCents(bid.caDepositCapCents)} (lesser of $1,000 or 10% — check your own state's rule)`);
    }
    if (bid.weeks !== null) bits.push(`about ${bid.weeks} week${bid.weeks === 1 ? "" : "s"}`);
    paymentItems.push(`${bid.name}: ${bits.join(", ")}.`);
  }
  if (paymentItems.length) sections.push({ title: "Payment schedule and timing", items: paymentItems });

  const split = (value: string) => value.split(/\n|,|;/).map((item) => item.trim()).filter(Boolean);
  const mustHaveItems = split(mustHaves).map((item) => {
    const key = normalizeLabel(item);
    const coveredBy = comparison.bids.filter((bid) => bids[comparison.bids.indexOf(bid)]?.items.some((line) => normalizeLabel(line.label) === key)).map((bid) => bid.name);
    return coveredBy.length ? `Must-have “${item}” — named as a line item by ${coveredBy.join(", ")}.` : `Must-have “${item}” — check every bid for it before deciding.`;
  });
  const questionItems = split(questions).map((item) => `Ask each contractor: ${item}`);
  const recordItems = [
    ...mustHaveItems,
    ...questionItems,
    "Verify license and insurance for the contractor you choose, and confirm change-order terms in writing before signing.",
    "Record your decision and why here — this comparison is the baseline if a change order is disputed later.",
  ];
  sections.push({ title: "Decision record", items: recordItems });
  return sections;
}

export function bidCompareHeadline(bids: BidInput[]): { headline: string; summary: string } {
  const comparison = computeBidComparison(bids);
  if (comparison.reveal && comparison.quotedCheapest && comparison.trueCheapest) {
    return {
      headline: `${comparison.quotedCheapest.name} isn't ${formatCents(comparison.quotedCheapest.quotedCents ?? 0)} — it's ${formatCents(comparison.quotedCheapest.trueCents ?? 0)}`,
      summary: `The lowest quote is not the lowest true cost. ${comparison.trueCheapest.name} comes in cheapest once allowances are repriced and exclusions are added back, at ${formatCents(comparison.trueCheapest.trueCents ?? 0)}.`,
    };
  }
  if (comparison.trueCheapest) {
    return {
      headline: "Your normalized bid comparison",
      summary: `Lowest true cost: ${comparison.trueCheapest.name} at ${formatCents(comparison.trueCheapest.trueCents ?? 0)}${comparison.priced.length > 1 ? ` across ${comparison.priced.length} priced bids` : ""}.`,
    };
  }
  return { headline: "Your normalized bid comparison", summary: "Add a quoted total for at least one bid to see its true cost." };
}

// Re-exported for the workspace's money line; kept tiny to avoid a second import.
export { moneyLine };
