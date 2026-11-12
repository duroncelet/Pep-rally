import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { findConcept } from "../app/catalog.ts";
import { etsySections, etsyHeadline, ETSY_POLICY_FEES } from "../app/etsy-pricing.ts";
import { marketOutcomeDocument } from "../app/market-outcome-pdf.ts";
import { renderOutcomePdf, validatePdfDocument } from "../app/outcome-pdf.ts";

// Finding 2 (Codex cross-PR review): the Part 4 dedicated workspace replaced
// the generic workspace, so the A6 PDF packet button in the generic workspace
// never appeared for this Rally. This test pins the wiring: the computed
// Etsy sections feed the shared A6 document builder and render a real PDF,
// and the workspace offers the button. Sample data is invented; nothing here
// is a real listing, shop, or price.

// The audit's shape: a $24 listing. Materials $5, labor 0.5h at $16 ($8),
// packaging $1 — unit cost $14. Free shipping costing $3.
const input = {
  productName: "Stoneware mug",
  materials: [{ label: "Clay + glaze", cents: 500 }],
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

test("Etsy computed sections render a real PDF packet matching the on-screen outcome", async () => {
  const concept = findConcept("etsy-profit-pricing-desk");
  assert.ok(concept, "catalog is missing etsy-profit-pricing-desk");
  const sections = etsySections(input);
  const { headline, summary } = etsyHeadline(input);
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
  // The computed unit cost — $14.00 from the seller's own numbers — is in
  // the packet, along with the price scenarios.
  assert.ok(doc.sections.some((s) => s.heading === "True unit cost"));
  assert.ok(doc.sections.some((s) => s.heading === "Three price scenarios"));
  const text = doc.sections.flatMap((s) => s.paragraphs).join(" ");
  assert.ok(text.includes("$14.00"), "packet is missing the computed $14.00 unit cost");
  assert.ok(text.includes("Stoneware mug"), "packet is missing the product name");
  assert.equal(doc.sections.at(-1).heading, "Before using it");
  assert.ok(doc.sections.at(-1).paragraphs.includes(concept.guardrail));
  assert.equal(validatePdfDocument(doc), true, "packet failed validation");
  const bytes = await renderOutcomePdf(doc, new Date("2026-11-11T12:00:00Z"));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
});

test("Etsy workspace offers the PDF packet button wired to the A6 renderers", async () => {
  const workspace = await readFile(new URL("../app/rally/market/[slug]/EtsyPricingWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(workspace.includes("Download PDF packet"), "workspace has no PDF packet button");
  assert.ok(workspace.includes("downloadOutcomePdf"), "workspace never calls downloadOutcomePdf");
  assert.ok(workspace.includes("marketOutcomeDocument"), "workspace never calls marketOutcomeDocument");
  assert.ok(workspace.includes("onClick={downloadPacket}"), "PDF packet button is not wired to downloadPacket");
});
