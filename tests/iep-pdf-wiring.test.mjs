import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { findConcept } from "../app/catalog.ts";
import { iepSections, iepHeadline } from "../app/iep-organizer.ts";
import { marketOutcomeDocument } from "../app/market-outcome-pdf.ts";
import { renderOutcomePdf, validatePdfDocument } from "../app/outcome-pdf.ts";

// Finding 2 (Codex cross-PR review): the Part 4 dedicated workspace replaced
// the generic workspace, so the A6 PDF packet button in the generic workspace
// never appeared for this Rally. This test pins the wiring: the computed
// IEP sections feed the shared A6 document builder and render a real PDF,
// and the workspace offers the button. Sample data is invented; nothing here
// is a real student, school, or meeting.

// Fixed "today" so the date math is deterministic: Monday, Nov 16, 2026.
const TODAY = new Date(2026, 10, 16);

const input = {
  studentName: "Sam",
  meetingDate: "2026-11-20",
  goals: [{ goal: "Reading fluency, 90 wpm by June", progress: "Reads aloud confidently at home" }],
  evidence: [{ date: "2026-11-10", observation: "Rushes timed passages", source: "Homework" }],
  questions: ["What supports are working in class?"],
  priorities: "Keep the reading specialist time",
  decisions: [{ decision: "Add 30 minutes of reading support weekly", owner: "Ms. Alvarez", due: "2026-11-27" }],
};

test("IEP computed sections render a real PDF packet matching the on-screen outcome", async () => {
  const concept = findConcept("iep-meeting-organizer");
  assert.ok(concept, "catalog is missing iep-meeting-organizer");
  const sections = iepSections(input, TODAY);
  const { headline, summary } = iepHeadline(input, TODAY);
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
  // The computed follow-up letter — the real one, with the recorded decision
  // and the 48-hour deadline — is in the packet, not just the blank draft.
  const letter = doc.sections.find((section) => section.heading === "Follow-up letter");
  assert.ok(letter, "packet is missing the Follow-up letter section");
  assert.ok(letter.paragraphs.some((p) => p.includes("Add 30 minutes of reading support weekly")));
  assert.ok(letter.paragraphs.some((p) => p.includes("November 22, 2026")));
  assert.equal(doc.sections.at(-1).heading, "Before using it");
  assert.ok(doc.sections.at(-1).paragraphs.includes(concept.guardrail));
  assert.equal(validatePdfDocument(doc), true, "packet failed validation");
  const bytes = await renderOutcomePdf(doc, new Date("2026-11-11T12:00:00Z"));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const loaded = await PDFDocument.load(bytes);
  assert.ok(loaded.getPageCount() >= 1);
  assert.equal(loaded.getTitle(), doc.title);
});

test("IEP workspace offers the PDF packet button wired to the A6 renderers", async () => {
  const workspace = await readFile(new URL("../app/rally/market/[slug]/IepOrganizerWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(workspace.includes("Download PDF packet"), "workspace has no PDF packet button");
  assert.ok(workspace.includes("downloadOutcomePdf"), "workspace never calls downloadOutcomePdf");
  assert.ok(workspace.includes("marketOutcomeDocument"), "workspace never calls marketOutcomeDocument");
  assert.ok(workspace.includes("onClick={downloadPacket}"), "PDF packet button is not wired to downloadPacket");
});
