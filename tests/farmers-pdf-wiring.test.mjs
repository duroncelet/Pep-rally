import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { findConcept } from "../app/catalog.ts";
import { farmersSections, farmersHeadline } from "../app/farmers-market-board.ts";
import { marketOutcomeDocument } from "../app/market-outcome-pdf.ts";
import { renderOutcomePdf, validatePdfDocument } from "../app/outcome-pdf.ts";

// Finding 2 (Codex cross-PR review): the Part 4 dedicated workspace replaced
// the generic workspace, so the A6 PDF packet button in the generic workspace
// never appeared for this Rally. This test pins the wiring: the computed
// farmers-market sections feed the shared A6 document builder and render a
// real PDF, and the workspace offers the button. Sample data is invented;
// nothing here is a real farm, market, or price.

const input = {
  marketDate: "2026-11-14",
  openTime: "",
  setupMinutes: null,
  loadMinutes: null,
  conditions: ["rain"],
  crops: [
    { crop: "Kale", unit: "bunches", broughtLastWeek: 60, soldLastWeek: 40, extraBuffer: 5, priceCents: 400 },
    { crop: "Beets", unit: "bunches", broughtLastWeek: 30, soldLastWeek: 30, extraBuffer: 0, priceCents: 350 },
  ],
  preorders: [{ label: "Maya — kale", crop: "Kale", qty: 10 }],
  standZones: [{ zone: "Front table", items: "Kale, beets, signs" }],
  packedItems: ["Canopy", "Cash bag"],
  customPackItems: [],
};

test("Farmers Market computed sections render a real PDF packet matching the on-screen outcome", async () => {
  const concept = findConcept("farmers-market-morning-board");
  assert.ok(concept, "catalog is missing farmers-market-morning-board");
  const sections = farmersSections(input);
  const { headline, summary } = farmersHeadline(input);
  assert.ok(sections.length >= 2, "too few computed sections");
  const doc = marketOutcomeDocument(concept, { headline, summary, sections });
  assert.equal(doc.title, headline);
  assert.equal(doc.subtitle, summary);
  // Parity: every computed section heading and item appears in the packet,
  // in order, before any PDF-only structural extra.
  sections.forEach((section, index) => {
    assert.equal(doc.sections[index].heading, section.title);
    for (const item of section.items) assert.ok(doc.sections[index].paragraphs.includes(item), `packet is missing on-screen item: ${item}`);
  });
  // The computed harvest call — last week's sold plus the vendor's own
  // buffer, 40 + 5 for kale — is in the packet, with the preorders.
  assert.ok(doc.sections.some((s) => s.heading === "Harvest quantities"));
  assert.ok(doc.sections.some((s) => s.heading === "Preorders"));
  const text = doc.sections.flatMap((s) => s.paragraphs).join(" ");
  assert.ok(text.includes("Kale"), "packet is missing the crop");
  assert.ok(text.includes("45"), "packet is missing the computed 45-bunch kale call");
  assert.equal(doc.sections.at(-1).heading, "Before using it");
  assert.ok(doc.sections.at(-1).paragraphs.includes(concept.guardrail));
  assert.equal(validatePdfDocument(doc), true, "packet failed validation");
  const bytes = await renderOutcomePdf(doc, new Date("2026-11-11T12:00:00Z"));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
});

test("Farmers Market workspace offers the PDF packet button wired to the A6 renderers", async () => {
  const workspace = await readFile(new URL("../app/rally/market/[slug]/FarmersMarketWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(workspace.includes("Download PDF packet"), "workspace has no PDF packet button");
  assert.ok(workspace.includes("downloadOutcomePdf"), "workspace never calls downloadOutcomePdf");
  assert.ok(workspace.includes("marketOutcomeDocument"), "workspace never calls marketOutcomeDocument");
  assert.ok(workspace.includes("onClick={downloadPacket}"), "PDF packet button is not wired to downloadPacket");
});
