// Clinical Rotation Pocket Prep — the rotation plan, from the student's inputs.
//
// Part 4 of the Nov 11, 2026 build (all-Rallies consumer audit, section 4).
// The generic workspace echoed the unit name back and told the student to
// prepare a skills log herself. This module computes the rotation plan: the
// clinical days in the rotation, the next shift, what's due and when, the
// skills-checklist progress, and tonight's de-identified prep — including
// the SBAR sheet and the pack list.
//
// Sourcing, from the audit: the night-before load is patient-specific prep
// (chart, meds, labs, care plan) — firsthand — so the prep is organized
// around de-identified patient slots, never a unit-general brief. The
// deliverables and deadlines are DOCUMENT-backed (syllabi): med cards due
// Day 2 at 0630, handwritten; head-to-toe assessment each clinical day;
// 90% of the skills checklist 4 weeks before graduation; at least one
// sterile procedure; mandatory items or be sent home (ID, black pen,
// stethoscope, penlight, scissors, second-hand watch, drug book). The
// skills-tracker desire itself is UNVERIFIED as a student want in the
// audit, so the tracker here covers only the document-backed checklist the
// student enters from their own syllabus — it tracks what their program
// already requires, and invents no skills. The ~63% anxiety figure is
// UNVERIFIED and is not used. No patient names, identifiers, medical
// records, diagnosis, or treatment recommendations anywhere — the
// de-identification guardrail stands, and the workspace labels the slots
// Patient A/B/C only.
//
// Pure functions only — no React, no I/O — so the PDF packet (Part 1B, A6)
// can render the same pocket pack from clinicalSections(). `today` is a
// parameter (defaulting to now) so the date math is testable.

import type { ResultSection } from "./rally-results";

export type ClinicalSkill = { skill: string; required: boolean; done: boolean };
export type ClinicalPatientSlot = { label: string; focusMeds: boolean; focusLabs: boolean; focusCarePlan: boolean; note: string };

export type ClinicalPrepInput = {
  unitType: string;
  rotationStart: string;
  rotationEnd: string;
  clinicalWeekdays: number[];
  graduationDate: string;
  learningGoals: string[];
  instructorRequirements: string;
  skills: ClinicalSkill[];
  sterileProcedureDone: boolean;
  medCardsDone: boolean;
  patientSlots: ClinicalPatientSlot[];
  packedItems: string[];
};

export type ClinicalDue = { label: string; date: Date | null; done: boolean; note: string };

export type ClinicalPrepComputed = {
  clinicalDays: Date[];
  totalClinicalDays: number;
  daysDone: number;
  daysRemaining: number;
  currentWeek: number | null;
  totalWeeks: number | null;
  nextShift: Date | null;
  dueItems: ClinicalDue[];
  requiredSkillsTotal: number;
  requiredSkillsDone: number;
  requiredSkillsPct: number | null;
  missingRequiredSkills: string[];
  packList: { item: string; packed: boolean }[];
  packMissing: string[];
};

/** Mandatory items, document-backed: missing one means being sent home. */
export const PACK_LIST = ["ID badge", "Black pen", "Stethoscope", "Penlight", "Scissors", "Second-hand watch", "Drug book"];

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 365;

export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) return null;
  return date;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
}

function clinicalDaysInRange(start: Date, end: Date, weekdays: number[]): Date[] {
  const days: Date[] = [];
  if (end.getTime() < start.getTime() || weekdays.length === 0) return days;
  for (let cursor = start.getTime(); cursor <= end.getTime() && days.length <= MAX_RANGE_DAYS; cursor += DAY_MS) {
    const day = new Date(cursor);
    if (weekdays.includes(day.getUTCDay())) days.push(day);
  }
  return days;
}

export function computeClinicalPrep(input: ClinicalPrepInput, today: Date = new Date()): ClinicalPrepComputed {
  const start = parseDateInput(input.rotationStart);
  const end = parseDateInput(input.rotationEnd);
  const todayUtc = startOfDayUtc(today);
  const clinicalDays = start && end ? clinicalDaysInRange(start, end, input.clinicalWeekdays) : [];
  const daysDone = clinicalDays.filter((day) => day.getTime() < todayUtc.getTime()).length;
  const daysRemaining = clinicalDays.filter((day) => day.getTime() >= todayUtc.getTime()).length;
  const nextShift = clinicalDays.find((day) => day.getTime() >= todayUtc.getTime()) ?? null;
  const totalWeeks = start && end ? Math.max(1, Math.ceil((end.getTime() - start.getTime() + DAY_MS) / (7 * DAY_MS))) : null;
  const currentWeek = start && todayUtc.getTime() >= start.getTime()
    ? Math.min(totalWeeks ?? 1, Math.floor((todayUtc.getTime() - start.getTime()) / (7 * DAY_MS)) + 1)
    : null;

  const dueItems: ClinicalDue[] = [];
  const secondClinicalDay = clinicalDays[1] ?? null;
  dueItems.push({
    label: "Med cards (handwritten)",
    date: secondClinicalDay,
    done: input.medCardsDone,
    note: secondClinicalDay ? `Due Day 2 of the rotation, 0630 — ${formatDateShort(secondClinicalDay)}.` : "Add rotation dates to get the due date.",
  });
  const graduation = parseDateInput(input.graduationDate);
  dueItems.push({
    label: "Skills checklist at 90%",
    date: graduation ? new Date(graduation.getTime() - 28 * DAY_MS) : null,
    done: false,
    note: graduation ? `Due 4 weeks before graduation — ${formatDateShort(new Date(graduation.getTime() - 28 * DAY_MS))}.` : "Add your graduation date to get the deadline.",
  });
  dueItems.push({
    label: "At least one sterile procedure",
    date: null,
    done: input.sterileProcedureDone,
    note: "Required before the rotation ends.",
  });

  const required = input.skills.filter((row) => row.skill.trim() && row.required);
  const requiredSkillsDone = required.filter((row) => row.done).length;
  const packList = PACK_LIST.map((item) => ({ item, packed: input.packedItems.includes(item) }));
  return {
    clinicalDays,
    totalClinicalDays: clinicalDays.length,
    daysDone,
    daysRemaining,
    currentWeek,
    totalWeeks,
    nextShift,
    dueItems,
    requiredSkillsTotal: required.length,
    requiredSkillsDone,
    requiredSkillsPct: required.length ? Math.round((requiredSkillsDone / required.length) * 100) : null,
    missingRequiredSkills: required.filter((row) => !row.done).map((row) => row.skill.trim()),
    packList,
    packMissing: packList.filter((row) => !row.packed).map((row) => row.item),
  };
}

/** Computed outcome sections, shared by the workspace and the PDF packet (Part 1B, A6). */
export function clinicalSections(input: ClinicalPrepInput, today: Date = new Date()): ResultSection[] {
  const computed = computeClinicalPrep(input, today);
  const sections: ResultSection[] = [];
  const unit = input.unitType.trim();

  if (computed.totalClinicalDays > 0) {
    const planItems = [
      `${unit ? `${unit} rotation: ` : "Rotation: "}${computed.totalClinicalDays} clinical days${computed.totalWeeks ? ` over ${computed.totalWeeks} weeks` : ""}.`,
      `${computed.daysDone} done, ${computed.daysRemaining} to go${computed.currentWeek !== null ? ` — week ${computed.currentWeek}` : ""}.`,
    ];
    if (computed.nextShift) planItems.push(`Next shift: ${formatDate(computed.nextShift)}.`);
    sections.push({ title: "Rotation plan", items: planItems });
  }

  const dueItems = computed.dueItems.map((item) => `${item.done ? "Done" : "Due"} — ${item.label}. ${item.note}`);
  if (computed.totalClinicalDays > 0 || input.graduationDate.trim()) sections.push({ title: "What's due", items: dueItems });

  if (computed.requiredSkillsTotal > 0) {
    sections.push({
      title: "Skills checklist",
      intro: `${computed.requiredSkillsDone} of ${computed.requiredSkillsTotal} required skills done (${computed.requiredSkillsPct}%).`,
      items: computed.missingRequiredSkills.length
        ? computed.missingRequiredSkills.map((skill) => `Still needed: ${skill}.`)
        : ["Every required skill on your list is checked off."],
    });
  }

  const slots = input.patientSlots.filter((slot) => slot.focusMeds || slot.focusLabs || slot.focusCarePlan || slot.note.trim());
  const prepItems: string[] = [];
  if (computed.nextShift) prepItems.push(`Tonight's prep is for ${formatDate(computed.nextShift)}.`);
  for (const slot of slots) {
    const focus = [slot.focusMeds && "meds", slot.focusLabs && "labs", slot.focusCarePlan && "care plan"].filter(Boolean).join(", ");
    prepItems.push(`${slot.label}${focus ? ` — review ${focus}` : ""}${slot.note.trim() ? `. Note: ${slot.note.trim()}` : "."}`);
  }
  prepItems.push("Head-to-toe assessment prep for each clinical day.");
  if (computed.packMissing.length) prepItems.push(`Pack list — still missing: ${computed.packMissing.join(", ")}. Missing a mandatory item can mean being sent home.`);
  else prepItems.push("Pack list — everything mandatory is packed.");
  if (computed.totalClinicalDays > 0 || slots.length) sections.push({ title: "Tonight's prep", items: prepItems });

  const sbarItems: string[] = [];
  for (const slot of slots) {
    sbarItems.push(`${slot.label} — S: the situation in one sentence. B: the background that matters. A: your assessment. R: what you recommend or need.`);
  }
  if (sbarItems.length) sections.push({ title: "SBAR sheet", intro: "De-identified only — no patient names or identifiers, ever.", items: sbarItems });

  const goals = input.learningGoals.map((goal) => goal.trim()).filter(Boolean);
  if (goals.length) {
    sections.push({ title: "Questions to ask", items: goals.map((goal) => `What would safe, supervised practice of “${goal}” look like today?`).concat(["What should I escalate immediately?", "What feedback should I request before leaving?"]) });
  }
  if (input.instructorRequirements.trim()) {
    sections.push({ title: "Instructor requirements", items: input.instructorRequirements.split(/\n|,|;/).map((item) => item.trim()).filter(Boolean) });
  }
  return sections;
}

export function clinicalHeadline(input: ClinicalPrepInput, today: Date = new Date()): { headline: string; summary: string } {
  const computed = computeClinicalPrep(input, today);
  const unit = input.unitType.trim();
  if (computed.nextShift) {
    const nextDue = computed.dueItems.find((item) => !item.done && item.date && item.date.getTime() >= today.getTime());
    return {
      headline: "Your rotation, planned.",
      summary: `${unit ? `${unit} — ` : ""}next shift ${formatDateShort(computed.nextShift)}, ${computed.daysRemaining} clinical days to go${nextDue ? `; next deadline: ${nextDue.label} by ${formatDateShort(nextDue.date as Date)}` : ""}.`,
    };
  }
  if (computed.totalClinicalDays > 0) {
    return { headline: "Your rotation, planned.", summary: `${unit ? `${unit} — ` : ""}${computed.totalClinicalDays} clinical days, all in the past. Set the next rotation's dates to plan ahead.` };
  }
  return { headline: "Your rotation, planned.", summary: "Add your rotation dates and clinical weekdays to build the plan." };
}
