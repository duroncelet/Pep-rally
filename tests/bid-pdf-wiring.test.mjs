import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { findConcept } from "../app/catalog.ts";
import { bidCompareSections, bidCompareHeadline } from "../app/bid-compare.ts";
import { bidCompareWorksheetSheets, bidCompareWorksheetXlsx } from "../app/bid-worksheet.ts";
import { marketOutcomeDocument } from "../app/market-outcome-pdf.ts";
import { renderOutcomePdf, validatePdfDocument } from "../app/outcome-pdf.ts";

// Finding 2 (Codex cross-PR review): the Part 4 dedicated workspace replaced
// the generic workspace, so the A6 PDF packet button — and the bid worksheet
// .xlsx button — in the generic workspace never appeared for this Rally.
// This test pins the wiring: the computed bid sections feed the shared A6
// document builder and render a real PDF, the structured bids feed a real
// .xlsx with the computed true costs, and the workspace offers both buttons.
// Sample data is invented; nothing here is a real contractor or price.

// The reveal: Acme looks cheapest at $14,000, but the tile allowance is
// $1,000 in the bid against $3,000 expected and permits are excluded at
// $500 — true cost $16,500. Bright at $15,000 flat is the real low cost.
const bids = [
  {
    name: "Acme Builders",
    quotedCents: 1_400_000,
    items: [{ label: "Labor", cents: 800_000 }, { label: "Materials", cents: 600_000 }],
    allowances: [{ label: "Tile", allowanceCents: 100_000, expectedCents: 300_000 }],
    exclusions: [{ label: "Permits", estimatedCents: 50_000 }],
    depositCents: 140_000,
    weeks: 6,
  },
  {
    name: "Bright Homes",
    quotedCents: 1_500_000,
    items: [{ label: "Labor", cents: 900_000 }, { label: "Materials", cents: 600_000 }],
    allowances: [],
    exclusions: [],
    depositCents: null,
    weeks: 8,
  },
];
const mustHaves = "Licensed, done by October";
const questions = "What is excluded?";

test("Bid Compare computed sections render a real PDF packet matching the on-screen outcome", async () => {
  const concept = findConcept("home-project-bid-compare");
  assert.ok(concept, "catalog is missing home-project-bid-compare");
  const sections = bidCompareSections(bids, mustHaves, questions);
  const { headline, summary } = bidCompareHeadline(bids);
  assert.ok(sections.length >= 2, "too few computed sections");
  assert.ok(headline.includes("isn't"), `expected the reveal headline, got: ${headline}`);
  const doc = marketOutcomeDocument(concept, { headline, summary, sections });
  assert.equal(doc.title, headline);
  assert.equal(doc.subtitle, summary);
  // Parity: every computed section heading and item appears in the packet,
  // in order, before any PDF-only structural extra.
  sections.forEach((section, index) => {
    assert.equal(doc.sections[index].heading, section.title);
    for (const item of section.items) assert.ok(doc.sections[index].paragraphs.includes(item), `packet is missing on-screen item: ${item}`);
  });
  // The computed true costs — the reveal itself — are in the packet.
  assert.ok(doc.sections.some((s) => s.heading === "True-cost comparison"));
  const text = doc.sections.flatMap((s) => s.paragraphs).join(" ");
  assert.ok(text.includes("$16,500.00"), "packet is missing Acme's $16,500.00 true cost");
  assert.ok(text.includes("$15,000.00"), "packet is missing Bright's $15,000.00 true cost");
  assert.equal(doc.sections.at(-1).heading, "Before using it");
  assert.ok(doc.sections.at(-1).paragraphs.includes(concept.guardrail));
  assert.equal(validatePdfDocument(doc), true, "packet failed validation");
  const bytes = await renderOutcomePdf(doc, new Date("2026-11-11T12:00:00Z"));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
});

test("Bid Compare worksheet is a real .xlsx with the computed true costs per bid", () => {
  const sheets = bidCompareWorksheetSheets(bids, mustHaves, questions);
  assert.deepEqual(sheets.map((s) => s.name), ["Bid comparison", "Must-haves & questions"]);
  assert.deepEqual(sheets[0].rows[0], ["Bid / contractor", "Total as quoted", "Allowance adjustment", "Exclusions added back", "True cost", "Deposit", "Timeline", "Notes"]);
  const acme = sheets[0].rows[1];
  assert.equal(acme[0], "Acme Builders");
  assert.equal(acme[1], "$14,000.00");
  assert.equal(acme[2], "+$2,000.00");
  assert.equal(acme[3], "+$500.00");
  assert.equal(acme[4], "$16,500.00");
  assert.equal(acme[5], "$1,400.00");
  assert.equal(acme[6], "About 6 weeks");
  assert.ok(acme[7].includes("Cheapest quote, not cheapest true cost"));
  const bright = sheets[0].rows[2];
  assert.equal(bright[0], "Bright Homes");
  assert.equal(bright[4], "$15,000.00");
  assert.ok(bright[7].includes("Lowest true cost"));
  assert.ok(sheets[0].rows.at(-1)[7].startsWith("The reveal:"));
  assert.ok(sheets[1].rows.some((row) => row[0] === "Licensed" && row[1] === "Must-have"));
  assert.ok(sheets[1].rows.some((row) => row[0] === "What is excluded?" && row[1] === "Question to ask"));

  const bytes = bidCompareWorksheetXlsx(bids, mustHaves, questions);
  const text = new TextDecoder().decode(bytes);
  assert.equal(text.slice(0, 4), "PK\x03\x04");
  // Stored (uncompressed) entries, so the XML and cell text are searchable.
  assert.ok(text.includes("[Content_Types].xml"));
  assert.ok(text.includes("Acme Builders"));
  assert.ok(text.includes("$16,500.00"));
  assert.ok(text.includes("Must-haves &amp; questions"));
  assert.ok(text.includes("</worksheet>"));
  assert.ok(text.includes("PK\x05\x06")); // end of central directory
  assert.equal(text.split("PK\x03\x04").length - 1, 7); // 5 fixed parts + 2 sheets
});

test("Bid Compare workspace offers the PDF packet and worksheet buttons wired to the A6 renderers", async () => {
  const workspace = await readFile(new URL("../app/rally/market/[slug]/BidCompareWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(workspace.includes("Download PDF packet"), "workspace has no PDF packet button");
  assert.ok(workspace.includes("Download bid worksheet .xlsx"), "workspace has no bid worksheet button");
  assert.ok(workspace.includes("downloadOutcomePdf"), "workspace never calls downloadOutcomePdf");
  assert.ok(workspace.includes("marketOutcomeDocument"), "workspace never calls marketOutcomeDocument");
  assert.ok(workspace.includes("bidCompareWorksheetXlsx"), "workspace never calls bidCompareWorksheetXlsx");
  assert.ok(workspace.includes("onClick={downloadPacket}"), "PDF packet button is not wired to downloadPacket");
  assert.ok(workspace.includes("onClick={downloadWorksheet}"), "worksheet button is not wired to downloadWorksheet");
});
