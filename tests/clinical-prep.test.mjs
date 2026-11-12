import test from "node:test";
import assert from "node:assert/strict";

import { parseDateInput, formatDate, computeClinicalPrep, clinicalSections, clinicalHeadline, PACK_LIST } from "../app/clinical-prep.ts";

const input = (overrides = {}) => ({
  unitType: "",
  rotationStart: "",
  rotationEnd: "",
  clinicalWeekdays: [],
  graduationDate: "",
  learningGoals: [],
  instructorRequirements: "",
  skills: [],
  sterileProcedureDone: false,
  medCardsDone: false,
  patientSlots: [],
  packedItems: [],
  ...overrides,
});

// Fixed "today": Monday, Nov 16, 2026. Rotation Mon Nov 16 – Fri Dec 11, 2026,
// clinical days Mon/Wed/Fri (weekdays 1, 3, 5).
const TODAY = new Date(2026, 10, 16);
const ROTATION = { rotationStart: "2026-11-16", rotationEnd: "2026-12-11", clinicalWeekdays: [1, 3, 5] };

test("date parsing accepts real dates and rejects impossible ones", () => {
  assert.ok(parseDateInput("2026-11-16") instanceof Date);
  assert.equal(parseDateInput("2026-02-30"), null);
  assert.equal(parseDateInput(""), null);
  assert.equal(formatDate(parseDateInput("2026-11-18")), "Wednesday, November 18, 2026");
});

test("clinical days are counted from the rotation range and weekdays", () => {
  const computed = computeClinicalPrep(input(ROTATION), TODAY);
  // 4 weeks × 3 days = 12 clinical days (Nov 16–Dec 11 covers 4 Mon/Wed/Fri sets).
  assert.equal(computed.totalClinicalDays, 12);
  assert.equal(computed.totalWeeks, 4);
  assert.equal(computed.daysDone, 0);
  assert.equal(computed.daysRemaining, 12);
  assert.equal(formatDate(computed.nextShift), "Monday, November 16, 2026");
  assert.equal(computed.currentWeek, 1);
});

test("days done and next shift move as the rotation progresses", () => {
  const wednesday = new Date(2026, 10, 18);
  const computed = computeClinicalPrep(input(ROTATION), wednesday);
  assert.equal(computed.daysDone, 1);
  assert.equal(computed.daysRemaining, 11);
  assert.equal(formatDate(computed.nextShift), "Wednesday, November 18, 2026");
  const weekend = new Date(2026, 10, 21);
  assert.equal(formatDate(computeClinicalPrep(input(ROTATION), weekend).nextShift), "Monday, November 23, 2026");
});

test("med cards fall due Day 2 at 0630 — the second clinical day", () => {
  const computed = computeClinicalPrep(input(ROTATION), TODAY);
  const medCards = computed.dueItems.find((item) => item.label.startsWith("Med cards"));
  assert.equal(formatDate(medCards.date), "Wednesday, November 18, 2026");
  assert.match(medCards.note, /Due Day 2 of the rotation, 0630/);
});

test("the 90% skills deadline is 4 weeks before graduation", () => {
  const computed = computeClinicalPrep(input({ ...ROTATION, graduationDate: "2027-05-15" }), TODAY);
  const skills = computed.dueItems.find((item) => item.label.startsWith("Skills checklist"));
  assert.equal(formatDate(skills.date), "Saturday, April 17, 2027");
  assert.match(skills.note, /Due 4 weeks before graduation/);
});

test("skills progress counts only the student's own required list", () => {
  const computed = computeClinicalPrep(input({
    skills: [
      { skill: "IV insertion", required: true, done: true },
      { skill: "Foley catheter", required: true, done: false },
      { skill: "Wound vac", required: false, done: false },
    ],
  }), TODAY);
  assert.equal(computed.requiredSkillsTotal, 2);
  assert.equal(computed.requiredSkillsDone, 1);
  assert.equal(computed.requiredSkillsPct, 50);
  assert.deepEqual(computed.missingRequiredSkills, ["Foley catheter"]);
  assert.equal(computeClinicalPrep(input(), TODAY).requiredSkillsPct, null);
});

test("the pack list is the document-backed mandatory set, with gaps flagged", () => {
  assert.deepEqual(PACK_LIST, ["ID badge", "Black pen", "Stethoscope", "Penlight", "Scissors", "Second-hand watch", "Drug book"]);
  const computed = computeClinicalPrep(input({ packedItems: ["ID badge", "Black pen"] }), TODAY);
  assert.deepEqual(computed.packMissing, ["Stethoscope", "Penlight", "Scissors", "Second-hand watch", "Drug book"]);
});

test("sections carry the plan, due dates, checklist, prep, and SBAR sheet", () => {
  const sections = clinicalSections(input({
    ...ROTATION,
    unitType: "Med-Surg",
    graduationDate: "2027-05-15",
    skills: [{ skill: "Foley catheter", required: true, done: false }],
    patientSlots: [{ label: "Patient A", focusMeds: true, focusLabs: false, focusCarePlan: true, note: "New admit" }],
    packedItems: ["ID badge"],
    learningGoals: ["Med pass"],
  }), TODAY);
  assert.deepEqual(sections.map((section) => section.title), ["Rotation plan", "What's due", "Skills checklist", "Tonight's prep", "SBAR sheet", "Questions to ask"]);
  const text = JSON.stringify(sections);
  assert.match(text, /Med-Surg rotation: 12 clinical days over 4 weeks/);
  assert.match(text, /Patient A — review meds, care plan\. Note: New admit/);
  assert.match(text, /still missing: Black pen, Stethoscope, Penlight, Scissors, Second-hand watch, Drug book/);
  assert.match(text, /What would safe, supervised practice of “Med pass” look like today\?/);
});

test("blank inputs produce no sections — nothing is invented", () => {
  assert.deepEqual(clinicalSections(input(), TODAY), []);
  const { summary } = clinicalHeadline(input(), TODAY);
  assert.match(summary, /Add your rotation dates/);
});

test("headline names the next shift and the next deadline", () => {
  const { headline, summary } = clinicalHeadline(input({ ...ROTATION, unitType: "OB" }), TODAY);
  assert.equal(headline, "Your rotation, planned.");
  assert.match(summary, /OB — next shift November 16, 2026, 12 clinical days to go/);
  assert.match(summary, /next deadline: Med cards \(handwritten\) by November 18, 2026/);
});
