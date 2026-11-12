import { pieces } from "./rally-results.ts";
import { computeBidComparison, formatCents, type BidInput } from "./bid-compare.ts";
import { buildXlsx, type XlsxSheet } from "./xlsx.ts";

// Part 1B, step A6: Home Project Bid Compare is the one Rally where the
// normalized Excel worksheet IS a named deliverable — the exception to
// "Excel is never the selling point." The worksheet mirrors the on-screen
// outcome: one row per bid under the normalized columns, plus the must-haves
// and questions as a checklist. Cells the buyer has not filled stay blank;
// nothing is invented to fill them.
function checklistSheet(mustHaves: string[], questions: string[]): XlsxSheet {
  return {
    name: "Must-haves & questions",
    rows: [
      ["Item", "Type", "Status / answer"],
      ...mustHaves.map((item) => [item, "Must-have", ""]),
      ...questions.map((item) => [item, "Question to ask", ""]),
      ["Verify license and insurance", "Check", ""],
      ["Confirm change-order and payment terms", "Check", ""],
      ["Record the final decision and rationale", "Decision", ""],
    ],
  };
}

export function bidWorksheetSheets(answers: Record<string, string>, inputs: string[]): XlsxSheet[] {
  const bids = pieces(answers[inputs[0]] ?? "");
  const mustHaves = pieces(answers[inputs[1]] ?? "");
  const questions = pieces(answers[inputs[2]] ?? "");
  const comparison: XlsxSheet = {
    name: "Bid comparison",
    rows: [
      ["Bid / contractor", "Labor", "Materials", "Allowances", "Exclusions", "Warranty", "Timing", "Payment schedule", "Total as quoted", "Notes"],
      ...(bids.length
        ? bids.map((bid) => [bid, "", "", "", "", "", "", "", "", ""])
        : [["No bids entered yet — add estimates in the workspace.", "", "", "", "", "", "", "", "", ""]]),
    ],
  };
  return [comparison, checklistSheet(mustHaves, questions)];
}

export function bidWorksheetXlsx(answers: Record<string, string>, inputs: string[]): Uint8Array {
  return buildXlsx(bidWorksheetSheets(answers, inputs));
}

// Finding 2: the Part 4 workspace holds structured bids, not the generic
// textarea answers, so the A6 worksheet above cannot see the computed true
// costs. This builder takes the same BidInput[] the workspace already holds
// and fills the normalized columns from the computed comparison — quoted,
// allowance adjustment, exclusions added back, true cost — so the worksheet
// matches the on-screen table instead of leaving every money column blank.
export function bidCompareWorksheetSheets(bids: BidInput[], mustHaves: string, questions: string): XlsxSheet[] {
  const comparison = computeBidComparison(bids);
  const money = (cents: number | null) => cents === null ? "" : formatCents(cents);
  const signed = (cents: number) => cents === 0 ? "—" : `${cents > 0 ? "+" : ""}${formatCents(cents)}`;
  const rows: string[][] = [
    ["Bid / contractor", "Total as quoted", "Allowance adjustment", "Exclusions added back", "True cost", "Deposit", "Timeline", "Notes"],
    ...(comparison.priced.length
      ? comparison.priced.map((bid) => {
          const notes: string[] = [];
          if (comparison.trueCheapest?.name === bid.name) notes.push("Lowest true cost");
          if (comparison.reveal && comparison.quotedCheapest?.name === bid.name) notes.push("Cheapest quote, not cheapest true cost");
          if (bid.trueIsFloor) notes.push("True cost is a floor — some lines are still unpriced");
          if (bid.lineTotalDiffers) notes.push(`Line items add up to ${formatCents(bid.lineTotalCents ?? 0)}, not the quoted total`);
          if (bid.depositOverCaCap) notes.push("Deposit above the California cap — check your state's rule");
          return [
            bid.name,
            money(bid.quotedCents),
            signed(bid.allowanceAdjustmentCents),
            bid.exclusionCents === 0 ? "—" : `+${formatCents(bid.exclusionCents)}`,
            bid.trueCents === null ? "" : `${bid.trueIsFloor ? "≥ " : ""}${formatCents(bid.trueCents)}`,
            money(bid.depositCents),
            bid.weeks === null ? "" : `About ${bid.weeks} week${bid.weeks === 1 ? "" : "s"}`,
            notes.join("; "),
          ];
        })
      : [["No bids entered yet — add a quoted total in the workspace.", "", "", "", "", "", "", ""]]),
  ];
  if (comparison.reveal && comparison.quotedCheapest && comparison.trueCheapest) {
    rows.push(["", "", "", "", "", "", "", `The reveal: ${comparison.quotedCheapest.name} looks cheapest at ${formatCents(comparison.quotedCheapest.quotedCents ?? 0)}, but ${comparison.trueCheapest.name} is cheapest once the real costs are counted, at ${formatCents(comparison.trueCheapest.trueCents ?? 0)}.`]);
  }
  return [{ name: "Bid comparison", rows }, checklistSheet(pieces(mustHaves), pieces(questions))];
}

export function bidCompareWorksheetXlsx(bids: BidInput[], mustHaves: string, questions: string): Uint8Array {
  return buildXlsx(bidCompareWorksheetSheets(bids, mustHaves, questions));
}
