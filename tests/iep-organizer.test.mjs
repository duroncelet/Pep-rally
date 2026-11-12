import test from "node:test";
import assert from "node:assert/strict";

import { parseDateInput, formatDate, addDays, daysUntilMeeting, followUpDeadline, preMeetingPlan, generatedQuestions, iepOnePager, iepFollowUpLetter, iepSections, iepHeadline } from "../app/iep-organizer.ts";

const input = (overrides = {}) => ({
  studentName: "",
  meetingDate: "",
  goals: [],
  evidence: [],
  questions: [],
  priorities: "",
  decisions: [],
  ...overrides,
});

// Fixed "today" so the date math is deterministic: Monday, Nov 16, 2026.
const TODAY = new Date(2026, 10, 16);

test("date parsing accepts real dates and rejects impossible ones", () => {
  assert.ok(parseDateInput("2026-11-20") instanceof Date);
  assert.equal(parseDateInput(""), null);
  assert.equal(parseDateInput("2026-02-30"), null);
  assert.equal(parseDateInput("11/20/2026"), null);
  assert.equal(formatDate(parseDateInput("2026-11-20")), "Friday, November 20, 2026");
});

test("days-until and the 48-hour follow-up deadline are computed from the meeting date", () => {
  assert.equal(daysUntilMeeting("2026-11-20", TODAY), 4);
  assert.equal(daysUntilMeeting("2026-11-16", TODAY), 0);
  assert.equal(daysUntilMeeting("2026-11-14", TODAY), -2);
  assert.equal(daysUntilMeeting("", TODAY), null);
  assert.equal(formatDate(followUpDeadline("2026-11-20")), "Sunday, November 22, 2026");
  assert.equal(followUpDeadline(""), null);
  assert.equal(formatDate(addDays(parseDateInput("2026-11-20"), -14)), "Friday, November 6, 2026");
});

test("pre-meeting plan carries computed dates and drops steps whose date has passed", () => {
  const plan = preMeetingPlan("2026-11-20", TODAY);
  // 14-day and 7-day steps are in the past relative to Nov 16; 3-day, 1-day, and meeting-day steps remain.
  assert.deepEqual(plan.map(({ date }) => formatDate(date)), ["Tuesday, November 17, 2026", "Thursday, November 19, 2026", "Friday, November 20, 2026"]);
  assert.match(plan[2].step, /Do not sign at the table/);
  assert.match(plan[1].step, /Print the one-pager/);
  assert.deepEqual(preMeetingPlan("", TODAY), []);
});

test("questions are generated from the parent's own goals and observations", () => {
  const questions = generatedQuestions(input({
    goals: [{ goal: "Reading fluency", progress: "Still reading below grade level" }, { goal: "Speech sounds", progress: "" }],
    evidence: [{ date: "", observation: "Meltdowns after transitions", source: "" }],
  }));
  assert.equal(questions[0], "What progress data supports the current conclusion on “Reading fluency” — you noted: Still reading below grade level");
  assert.equal(questions[1], "What progress data supports the current conclusion on “Speech sounds”?");
  assert.match(questions[2], /Which supports were in place when you observed “Meltdowns after transitions”/);
  assert.deepEqual(generatedQuestions(input()), []);
});

test("the one-pager assembles goals, evidence, questions, and asks from buyer inputs", () => {
  const onePager = iepOnePager(input({
    studentName: "M",
    meetingDate: "2026-11-20",
    goals: [{ goal: "Reading fluency", progress: "Below grade level" }],
    evidence: [{ date: "2026-11-10", observation: "Finished homework alone twice", source: "Tutor notes" }],
    questions: ["Can we add 30 minutes of reading support?"],
    priorities: "More reading support, keep the aide",
  }));
  assert.equal(onePager.heading, "Parent Agenda — IEP meeting, Friday, November 20, 2026");
  assert.match(onePager.subheading, /Prepared by M's family/);
  assert.deepEqual(onePager.sections.map((section) => section.title), ["Goals under review", "What we've observed", "Our questions", "What we're asking for"]);
  const text = JSON.stringify(onePager);
  assert.match(text, /November 10, 2026: “Finished homework alone twice” \(Tutor notes\)/);
  assert.match(text, /Can we add 30 minutes of reading support\?/);
  assert.match(text, /More reading support/);
});

test("the one-pager never invents a student name", () => {
  const onePager = iepOnePager(input({ meetingDate: "2026-11-20" }));
  assert.match(onePager.subheading, /Prepared by our child's family/);
  assert.deepEqual(onePager.sections, []);
});

test("the follow-up letter records decisions with owners and due dates, and the 48-hour deadline", () => {
  const letter = iepFollowUpLetter(input({
    studentName: "M",
    meetingDate: "2026-11-20",
    decisions: [
      { decision: "Add 30 minutes of weekly reading support", owner: "Ms. Rivera", due: "2026-12-01" },
      { decision: "Share progress data monthly", owner: "", due: "" },
    ],
  }));
  assert.match(letter, /Subject: Follow-up — IEP meeting on November 20, 2026/);
  assert.match(letter, /- Add 30 minutes of weekly reading support — Ms. Rivera, by December 1, 2026/);
  assert.match(letter, /- Share progress data monthly/);
  assert.match(letter, /by November 22, 2026/);
  assert.match(letter, /If it is not in writing, it does not exist/);
});

test("the letter with no decisions says so instead of inventing any", () => {
  const letter = iepFollowUpLetter(input({ meetingDate: "2026-11-20" }));
  assert.match(letter, /Decisions from the meeting will be listed here once they are recorded in the decision log above/);
  assert.doesNotMatch(letter, /- Add|— Ms\./);
});

test("sections carry the agenda, evidence log, decision log, plan, and letter", () => {
  const sections = iepSections(input({
    meetingDate: "2026-11-20",
    goals: [{ goal: "Reading fluency", progress: "" }],
    evidence: [{ date: "", observation: "Finished homework alone", source: "" }],
    decisions: [{ decision: "Add reading support", owner: "Ms. Rivera", due: "2026-12-01" }],
  }), TODAY);
  assert.deepEqual(sections.map((section) => section.title), ["Parent Agenda (one-pager)", "Evidence log", "Decision log", "Before the meeting", "Follow-up letter"]);
  assert.deepEqual(iepSections(input(), TODAY), []);
});

test("headline names the countdown and the follow-up deadline", () => {
  const { headline, summary } = iepHeadline(input({ meetingDate: "2026-11-20" }), TODAY);
  assert.equal(headline, "Walk in with a page. Walk out with a letter.");
  assert.match(summary, /in 4 days/);
  assert.match(summary, /by November 22, 2026/);
  const past = iepHeadline(input({ meetingDate: "2026-11-14" }), TODAY);
  assert.match(past.summary, /has passed/);
});
