import { pieces } from "./rally-results.ts";
import { buildXlsx, type XlsxSheet } from "./xlsx.ts";

// Part 1B, step A6: Home Project Bid Compare is the one Rally where the
// normalized Excel worksheet IS a named deliverable — the exception to
// "Excel is never the selling point." The worksheet mirrors the on-screen
// outcome: one row per bid under the normalized columns, plus the must-haves
// and questions as a checklist. Cells the buyer has not filled stay blank;
// nothing is invented to fill them.
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
  const checklist: XlsxSheet = {
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
  return [comparison, checklist];
}

export function bidWorksheetXlsx(answers: Record<string, string>, inputs: string[]): Uint8Array {
  return buildXlsx(bidWorksheetSheets(answers, inputs));
}
