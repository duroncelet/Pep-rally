// IEP Meeting Organizer — the one-pager + follow-up letter, generated from
// the parent's own inputs.
//
// Part 4 of the Nov 11, 2026 build (all-Rallies consumer audit, section 9).
// The buy trigger, in the audit's words: walk in with a page that makes the
// room take you seriously, walk out with a letter that makes what they said
// stick. The generic workspace echoed the parent's words back plus four
// fixed generic questions; this module generates the artifact pair instead:
// a one-page Parent Agenda and a follow-up letter draft, both built only
// from what the parent entered, plus date math (days until the meeting, the
// pre-meeting plan, the 48-hour follow-up deadline).
//
// Firsthand-grounded, from the audit: the one-page parent input statement
// "changes the dynamic before you speak"; follow up in writing within 48
// hours, always ("If it is not in writing, it does not exist" — Wrightslaw);
// never sign at the table. Nothing here is built on the audit's UNVERIFIED
// items (the PWN attachment table shape, the SMART-goal check / Understood
// question shapes) — those are flagged in the PR, not built.
//
// Privacy: no child name, date of birth, or school is required. The student
// field takes a first name or initials only, is optional, and stays in the
// buyer's workspace — nothing here is shared.
//
// Pure functions only — no React, no I/O — so the PDF packet (Part 1B, A6)
// can render the same artifacts from iepOnePager() and iepFollowUpLetter().
// `today` is a parameter (defaulting to now) so the date math is testable.

import type { ResultSection } from "./rally-results";

export type IepGoal = { goal: string; progress: string };
export type IepEvidence = { date: string; observation: string; source: string };
export type IepDecision = { decision: string; owner: string; due: string };

export type IepInput = {
  studentName: string;
  meetingDate: string;
  goals: IepGoal[];
  evidence: IepEvidence[];
  questions: string[];
  priorities: string;
  decisions: IepDecision[];
};

export type IepOnePager = {
  heading: string;
  subheading: string;
  sections: ResultSection[];
};

const DAY_MS = 86_400_000;

/** Strict YYYY-MM-DD parse; null for blank or impossible dates. Parsed as UTC noon to avoid timezone day shifts. */
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

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Whole days from today to the meeting (negative when the meeting has passed). */
export function daysUntilMeeting(meetingDate: string, today: Date = new Date()): number | null {
  const meeting = parseDateInput(meetingDate);
  if (!meeting) return null;
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  return Math.round((meeting.getTime() - todayUtc.getTime()) / DAY_MS);
}

/** The 48-hour follow-up deadline: meeting date + 2 days. */
export function followUpDeadline(meetingDate: string): Date | null {
  const meeting = parseDateInput(meetingDate);
  return meeting ? addDays(meeting, 2) : null;
}

function studentLabel(input: IepInput): string {
  return input.studentName.trim() || "our child";
}

/** Pre-meeting plan with calendar dates computed from the meeting date. Steps whose date has passed are dropped. */
export function preMeetingPlan(meetingDate: string, today: Date = new Date()): { date: Date; step: string }[] {
  const meeting = parseDateInput(meetingDate);
  if (!meeting) return [];
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  const steps: { offset: number; step: string }[] = [
    { offset: -14, step: "Request the draft IEP, evaluations, and progress data in writing, so you read them before the table — not at it." },
    { offset: -7, step: "Confirm who will attend from the school team, and send your Parent Agenda ahead so the room has read it before you speak." },
    { offset: -3, step: "Review the evidence log and pick the three observations that matter most." },
    { offset: -1, step: "Print the one-pager. Pack the binder: draft IEP, evaluations, and work samples." },
    { offset: 0, step: "Meeting day. Do not sign at the table — take the draft home to review." },
  ];
  return steps
    .map(({ offset, step }) => ({ date: addDays(meeting, offset), step }))
    .filter(({ date }) => date.getTime() >= todayUtc.getTime());
}

/**
 * Questions generated from the parent's own goals and observations — not the
 * four fixed generic questions the old template showed every parent. Each
 * one quotes the parent's own words back as the thing to ask about.
 */
export function generatedQuestions(input: IepInput): string[] {
  const questions: string[] = [];
  for (const { goal, progress } of input.goals) {
    if (!goal.trim()) continue;
    questions.push(progress.trim()
      ? `What progress data supports the current conclusion on “${goal.trim()}” — you noted: ${progress.trim()}`
      : `What progress data supports the current conclusion on “${goal.trim()}”?`);
  }
  for (const { observation } of input.evidence.slice(0, 2)) {
    if (!observation.trim()) continue;
    questions.push(`Which supports were in place when you observed “${observation.trim()}”, and in what settings?`);
  }
  return questions.slice(0, 6);
}

function splitPriorities(priorities: string): string[] {
  return priorities.split(/\n|,|;/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

/** The one-page Parent Agenda: the page the parent walks in with. */
export function iepOnePager(input: IepInput): IepOnePager {
  const meeting = parseDateInput(input.meetingDate);
  const student = studentLabel(input);
  const sections: ResultSection[] = [];

  const goalItems = input.goals
    .filter((entry) => entry.goal.trim())
    .map((entry) => entry.progress.trim() ? `“${entry.goal.trim()}” — what we've seen: ${entry.progress.trim()}` : `“${entry.goal.trim()}”`);
  if (goalItems.length) sections.push({ title: "Goals under review", items: goalItems });

  const evidenceItems = input.evidence
    .filter((entry) => entry.observation.trim())
    .map((entry) => {
      const when = parseDateInput(entry.date) ? `${formatDateShort(parseDateInput(entry.date) as Date)}: ` : "";
      const where = entry.source.trim() ? ` (${entry.source.trim()})` : "";
      return `${when}“${entry.observation.trim()}”${where}`;
    });
  if (evidenceItems.length) sections.push({ title: "What we've observed", items: evidenceItems });

  const ownQuestions = input.questions.map((item) => item.trim()).filter(Boolean);
  const allQuestions = [...ownQuestions, ...generatedQuestions(input).filter((item) => !ownQuestions.includes(item))];
  if (allQuestions.length) sections.push({ title: "Our questions", items: allQuestions });

  const priorities = splitPriorities(input.priorities);
  if (priorities.length) sections.push({ title: "What we're asking for", items: priorities });

  return {
    heading: `Parent Agenda — IEP meeting${meeting ? `, ${formatDate(meeting)}` : ""}`,
    subheading: `Prepared by ${student}'s family. One page: what matters, what we've seen, what we're asking.`,
    sections,
  };
}

/** The follow-up letter draft: the letter that makes what the school said stick. */
export function iepFollowUpLetter(input: IepInput): string {
  const meeting = parseDateInput(input.meetingDate);
  const deadline = followUpDeadline(input.meetingDate);
  const student = studentLabel(input);
  const lines: string[] = [];
  lines.push(`Subject: Follow-up — IEP meeting${meeting ? ` on ${formatDateShort(meeting)}` : ""}`);
  lines.push("");
  lines.push("Dear IEP team,");
  lines.push("");
  lines.push(`Thank you for meeting with us${meeting ? ` on ${formatDateShort(meeting)}` : ""} to discuss ${student}'s IEP. This letter records what was decided so we all leave with the same understanding.`);
  lines.push("");
  const decisions = input.decisions.filter((entry) => entry.decision.trim());
  if (decisions.length) {
    lines.push("Decisions recorded:");
    for (const entry of decisions) {
      const owner = entry.owner.trim() ? ` — ${entry.owner.trim()}` : "";
      const due = parseDateInput(entry.due) ? `, by ${formatDateShort(parseDateInput(entry.due) as Date)}` : "";
      lines.push(`- ${entry.decision.trim()}${owner}${due}`);
    }
  } else {
    lines.push("Decisions from the meeting will be listed here once they are recorded in the decision log above.");
  }
  lines.push("");
  if (deadline) {
    lines.push(`Please reply in writing to confirm these decisions, or correct anything recorded wrongly, by ${formatDateShort(deadline)}. If it is not in writing, it does not exist — so we are keeping this letter with the IEP record.`);
  } else {
    lines.push("Please reply in writing to confirm these decisions, or correct anything recorded wrongly. If it is not in writing, it does not exist — so we are keeping this letter with the IEP record.");
  }
  lines.push("");
  lines.push("Thank you,");
  lines.push("[Parent name]");
  return lines.join("\n");
}

/** Computed outcome sections, shared by the workspace and the PDF packet (Part 1B, A6). */
export function iepSections(input: IepInput, today: Date = new Date()): ResultSection[] {
  const sections: ResultSection[] = [];
  const onePager = iepOnePager(input);
  const agendaItems = onePager.sections.flatMap((section) => [`${section.title}:`, ...section.items.map((item) => `  ${item}`)]);
  if (agendaItems.length) sections.push({ title: "Parent Agenda (one-pager)", intro: onePager.heading, items: agendaItems });

  const evidenceItems = input.evidence
    .filter((entry) => entry.observation.trim())
    .map((entry) => {
      const when = parseDateInput(entry.date) ? `${formatDateShort(parseDateInput(entry.date) as Date)} — ` : "";
      const where = entry.source.trim() ? ` [${entry.source.trim()}]` : "";
      return `${when}${entry.observation.trim()}${where}`;
    });
  if (evidenceItems.length) sections.push({ title: "Evidence log", items: evidenceItems });

  const decisionItems = input.decisions
    .filter((entry) => entry.decision.trim())
    .map((entry) => {
      const owner = entry.owner.trim() ? ` Owner: ${entry.owner.trim()}.` : "";
      const due = parseDateInput(entry.due) ? ` Due: ${formatDateShort(parseDateInput(entry.due) as Date)}.` : "";
      return `${entry.decision.trim()}${owner}${due}`;
    });
  if (decisionItems.length) sections.push({ title: "Decision log", items: decisionItems });

  const plan = preMeetingPlan(input.meetingDate, today);
  if (plan.length) sections.push({ title: "Before the meeting", items: plan.map(({ date, step }) => `${formatDateShort(date)} — ${step}`) });

  const deadline = followUpDeadline(input.meetingDate);
  if (deadline) sections.push({ title: "Follow-up letter", intro: `Send within 48 hours — by ${formatDateShort(deadline)}. The full draft is shown in the workspace and downloads with this outcome.`, items: iepFollowUpLetter(input).split("\n").filter((line) => line.trim()) });
  return sections;
}

export function iepHeadline(input: IepInput, today: Date = new Date()): { headline: string; summary: string } {
  const days = daysUntilMeeting(input.meetingDate, today);
  const deadline = followUpDeadline(input.meetingDate);
  if (days !== null && days > 0) {
    return {
      headline: "Walk in with a page. Walk out with a letter.",
      summary: `Your meeting is in ${days} day${days === 1 ? "" : "s"}${deadline ? `; the follow-up letter goes out within 48 hours, by ${formatDateShort(deadline)}` : ""}.`,
    };
  }
  if (days === 0) {
    return { headline: "Walk in with a page. Walk out with a letter.", summary: `Your meeting is today${deadline ? `; the follow-up letter goes out within 48 hours, by ${formatDateShort(deadline)}` : ""}. Do not sign at the table.` };
  }
  if (days !== null && days < 0) {
    return { headline: "Walk in with a page. Walk out with a letter.", summary: `Your meeting date has passed${deadline ? ` — the follow-up letter was due by ${formatDateShort(deadline)}` : ""}. Record the decisions below and send the letter.` };
  }
  return { headline: "Walk in with a page. Walk out with a letter.", summary: "Add your meeting date to get the pre-meeting plan and the 48-hour follow-up deadline." };
}
