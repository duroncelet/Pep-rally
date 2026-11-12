import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { findConcept } from "../app/catalog.ts";
import { clinicalSections, clinicalHeadline } from "../app/clinical-prep.ts";
import { marketOutcomeDocument } from "../app/market-outcome-pdf.ts";
import { renderOutcomePdf, validatePdfDocument } from "../app/outcome-pdf.ts";

// Finding 2 (Codex cross-PR review): the Part 4 dedicated workspace replaced
// the generic workspace, so the A6 PDF packet button in the generic workspace
// never appeared for this Rally. This test pins the wiring: the computed
// clinical sections feed the shared A6 document builder and render a real
// PDF, and the workspace offers the button. Sample data is invented; nothing
// here is a real student, rotation, or patient.

// Fixed "today": Monday, Nov 16, 2026. Rotation Mon Nov 16 – Fri Dec 11, 2026,
// clinical days Mon/Wed/Fri (weekdays 1, 3, 5).
const TODAY = new Date(2026, 10, 16);
const input = {
  unitType: "Medical-surgical",
  rotationStart: "2026-11-16",
  rotationEnd: "2026-12-11",
  clinicalWeekdays: [1, 3, 5],
  graduationDate: "",
  learningGoals: ["Safe medication administration", "SBAR handoff"],
  instructorRequirements: "Skills log signed each shift",
  skills: [
    { skill: "Medication administration", required: true, done: false },
    { skill: "Foley insertion", required: false, done: false },
  ],
  sterileProcedureDone: false,
  medCardsDone: false,
  patientSlots: [{ label: "Patient A", focusMeds: true, focusLabs: false, focusCarePlan: true, note: "" }],
  packedItems: ["ID badge", "Stethoscope"],
};

test("Clinical computed sections render a real PDF packet matching the on-screen outcome", async () => {
  const concept = findConcept("clinical-rotation-pocket-prep");
  assert.ok(concept, "catalog is missing clinical-rotation-pocket-prep");
  const sections = clinicalSections(input, TODAY);
  const { headline, summary } = clinicalHeadline(input, TODAY);
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
  // The computed rotation plan — the unit, the 12 clinical days, and the
  // next shift — is in the packet, along with the skills checklist.
  assert.ok(doc.sections.some((s) => s.heading === "Rotation plan"));
  assert.ok(doc.sections.some((s) => s.heading === "Skills checklist"));
  const text = doc.sections.flatMap((s) => s.paragraphs).join(" ");
  assert.ok(text.includes("Medical-surgical"), "packet is missing the unit type");
  assert.ok(text.includes("12 clinical days"), "packet is missing the computed clinical-day count");
  assert.ok(text.includes("November 16, 2026"), "packet is missing the next-shift date");
  assert.equal(doc.sections.at(-1).heading, "Before using it");
  assert.ok(doc.sections.at(-1).paragraphs.includes(concept.guardrail));
  assert.equal(validatePdfDocument(doc), true, "packet failed validation");
  const bytes = await renderOutcomePdf(doc, new Date("2026-11-11T12:00:00Z"));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
});

test("Clinical workspace offers the PDF packet button wired to the A6 renderers", async () => {
  const workspace = await readFile(new URL("../app/rally/market/[slug]/ClinicalPrepWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(workspace.includes("Download PDF packet"), "workspace has no PDF packet button");
  assert.ok(workspace.includes("downloadOutcomePdf"), "workspace never calls downloadOutcomePdf");
  assert.ok(workspace.includes("marketOutcomeDocument"), "workspace never calls marketOutcomeDocument");
  assert.ok(workspace.includes("onClick={downloadPacket}"), "PDF packet button is not wired to downloadPacket");
});
