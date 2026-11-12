import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { findConcept } from "../app/catalog.ts";
import { roommateSections, roommateHeadline } from "../app/roommate-move-out.ts";
import { marketOutcomeDocument } from "../app/market-outcome-pdf.ts";
import { renderOutcomePdf, validatePdfDocument } from "../app/outcome-pdf.ts";

// Finding 2 (Codex cross-PR review): the Part 4 dedicated workspace replaced
// the generic workspace, so the A6 PDF packet button in the generic workspace
// never appeared for this Rally. This test pins the wiring: the computed
// roommate sections feed the shared A6 document builder and render a real
// PDF, and the workspace offers the button. Sample data is invented; nothing
// here is a real roommate, lease, or deposit.

const input = {
  roommates: [{ name: "Ana" }, { name: "Bo" }],
  leaseStructure: "joint",
  departingName: "",
  depositCents: 240_000,
  deductions: [{ label: "Carpet cleaning", cents: 12_000, chargedTo: "shared" }],
  monthlyRentCents: null,
  moveOutDate: "2026-06-30",
  stateDeadlineDays: 21,
  sharedItems: [{ item: "Couch", disposition: "sell-split", owner: "", proceedsCents: 20_000 }],
  rooms: [{ room: "Kitchen", note: "Stove cleaned, one chipped tile", photoTaken: true }],
  tasks: [{ task: "Return keys", assignee: "Ana", done: false }],
  acknowledged: [],
};

test("Roommate computed sections render a real PDF packet matching the on-screen outcome", async () => {
  const concept = findConcept("roommate-move-out-splitter");
  assert.ok(concept, "catalog is missing roommate-move-out-splitter");
  const sections = roommateSections(input);
  const { headline, summary } = roommateHeadline(input);
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
  // The computed deposit math — not the generic echo — is in the packet.
  assert.ok(doc.sections.some((s) => s.heading === "Deposit math"));
  const text = doc.sections.flatMap((s) => s.paragraphs).join(" ");
  assert.ok(/\$\d[\d,]*\.\d{2}/.test(text), "packet carries no computed dollar figure");
  // The PDF-only sign-off lines ride along for the roommates to sign.
  const signoff = doc.sections.find((s) => s.heading === "Sign-off");
  assert.ok(signoff);
  assert.ok(signoff.paragraphs.some((p) => p.includes("Signature:")));
  assert.equal(doc.sections.at(-1).heading, "Before using it");
  assert.ok(doc.sections.at(-1).paragraphs.includes(concept.guardrail));
  assert.equal(validatePdfDocument(doc), true, "packet failed validation");
  const bytes = await renderOutcomePdf(doc, new Date("2026-11-11T12:00:00Z"));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
});

test("Roommate workspace offers the PDF packet button wired to the A6 renderers", async () => {
  const workspace = await readFile(new URL("../app/rally/market/[slug]/RoommateMoveOutWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(workspace.includes("Download PDF packet"), "workspace has no PDF packet button");
  assert.ok(workspace.includes("downloadOutcomePdf"), "workspace never calls downloadOutcomePdf");
  assert.ok(workspace.includes("marketOutcomeDocument"), "workspace never calls marketOutcomeDocument");
  assert.ok(workspace.includes("onClick={downloadPacket}"), "PDF packet button is not wired to downloadPacket");
});
