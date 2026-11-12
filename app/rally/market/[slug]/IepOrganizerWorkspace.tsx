"use client";

import { useEffect, useMemo, useState } from "react";
import type { RallyConcept } from "../../../catalog";
import { downloadMarkdown, markdownCell, safeFileName } from "../../../download-markdown";
import { downloadOutcomePdf } from "../../../download-pdf";
import { marketOutcomeDocument } from "../../../market-outcome-pdf";
import { buildCustomizationKit } from "../../../customization-kit";
import { daysUntilMeeting, followUpDeadline, preMeetingPlan, iepOnePager, iepFollowUpLetter, iepSections, iepHeadline, formatDate, type IepInput } from "../../../iep-organizer";

// IEP Meeting Organizer — the one-pager + follow-up letter, generated from
// the parent's inputs. Part 4 (all-Rallies consumer audit, section 9): the
// generic workspace echoed the parent's words plus four fixed generic
// questions. This workspace builds the artifact pair the audit names as the
// buy trigger — a printable one-page Parent Agenda and the follow-up letter
// that makes what the school said stick — plus the pre-meeting plan and the
// 48-hour follow-up deadline, computed from the meeting date.
//
// Privacy: the student field takes a first name or initials only and is
// optional. Nothing here is shared; the workspace stays private.

type GoalRow = { id: string; goal: string; progress: string };
type EvidenceRow = { id: string; date: string; observation: string; source: string };
type DecisionRow = { id: string; decision: string; owner: string; due: string };
type QuestionRow = { id: string; question: string };

const newId = () => crypto.randomUUID();

export default function IepOrganizerWorkspace({ concept }: { concept: RallyConcept }) {
  const [studentName, setStudentName] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [goals, setGoals] = useState<GoalRow[]>([{ id: newId(), goal: "", progress: "" }]);
  const [evidence, setEvidence] = useState<EvidenceRow[]>([{ id: newId(), date: "", observation: "", source: "" }]);
  const [questions, setQuestions] = useState<QuestionRow[]>([{ id: newId(), question: "" }]);
  const [priorities, setPriorities] = useState("");
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [created, setCreated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [access, setAccess] = useState<"checking" | "preview" | "unlocked">("checking");

  const input: IepInput = useMemo(() => ({
    studentName,
    meetingDate,
    goals: goals.map(({ goal, progress }) => ({ goal, progress })),
    evidence: evidence.map(({ date, observation, source }) => ({ date, observation, source })),
    questions: questions.map((row) => row.question),
    priorities,
    decisions: decisions.map(({ decision, owner, due }) => ({ decision, owner, due })),
  }), [studentName, meetingDate, goals, evidence, questions, priorities, decisions]);

  const onePager = useMemo(() => iepOnePager(input), [input]);
  const letter = useMemo(() => iepFollowUpLetter(input), [input]);
  const sections = useMemo(() => iepSections(input), [input]);
  const { headline, summary } = useMemo(() => iepHeadline(input), [input]);
  const days = useMemo(() => daysUntilMeeting(meetingDate), [meetingDate]);
  const deadline = useMemo(() => followUpDeadline(meetingDate), [meetingDate]);
  const plan = useMemo(() => preMeetingPlan(meetingDate), [meetingDate]);
  const canCreate = Boolean(meetingDate.trim() || goals.some((row) => row.goal.trim()) || evidence.some((row) => row.observation.trim()) || questions.some((row) => row.question.trim()) || priorities.trim());

  useEffect(() => {
    fetch(`/api/rally-access?slug=${encodeURIComponent(concept.slug)}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setAccess(data?.unlocked ? "unlocked" : "preview"))
      .catch(() => setAccess("preview"));
  }, [concept.slug]);

  function touch() { setCreated(false); }

  async function save() {
    setSaveStatus("Saving…");
    const summaryText = `${headline} for a meeting${meetingDate ? ` on ${meetingDate}` : ""}.`;
    const response = await fetch("/api/rallies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: `catalog:${concept.slug}`, title: concept.title, inputs: input, summary: summaryText }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaveStatus(response.ok ? "Saved to My Rallies" : data.error ?? "Could not save this workspace.");
  }

  function downloadOutcome() {
    const markdown = `# ${headline}\n\n> ${summary}\n\n## ${onePager.heading}\n\n${onePager.subheading}\n\n${onePager.sections.map((section) => `### ${section.title}\n\n${section.items.map((item) => `- ${markdownCell(item)}`).join("\n")}`).join("\n\n")}\n\n## Follow-up letter\n\n${letter.split("\n").map((line) => line.startsWith("- ") ? `- ${markdownCell(line.slice(2))}` : markdownCell(line)).join("\n")}\n\n## Before using it\n\n${concept.guardrail}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}\n`;
    downloadMarkdown(`${safeFileName(concept.title)}-outcome.md`, markdown);
  }

  // Part 1B, step A6: this Rally is PDF-first — the designed packet is the
  // outcome the buyer hands to the school. The packet renders the same
  // computed sections shown on screen, via the shared A6 document builder.
  async function downloadPacket() {
    try { await downloadOutcomePdf(marketOutcomeDocument(concept, { headline, summary, sections })); }
    catch (error) { setSaveStatus((error as Error).message); }
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({ title: concept.title, promise: concept.promise, audience: concept.forWhom, inputs: concept.inputs, outputs: concept.outcome, guardrail: concept.guardrail, currentAnswers: { "Meeting date": meetingDate, "Goals": goals.map((row) => row.goal).filter(Boolean).join("; "), "Observations": evidence.map((row) => row.observation).filter(Boolean).join("; "), "Questions and priorities": [...questions.map((row) => row.question).filter(Boolean), priorities].filter(Boolean).join("; ") } });
    downloadMarkdown(`${safeFileName(concept.title)}-customization-kit.md`, markdown);
  }

  return <main className={`market-workspace concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={`/discover/${concept.slug}`}>Full listing</a><a href="/library">My Rallies</a></div></nav>
    <header><small>WORKING RALLY · {concept.category.toUpperCase()} · {access === "unlocked" ? "PURCHASED" : "PREVIEW"}</small><h1>{concept.title}</h1><p>{concept.promise}</p>{access === "unlocked" ? <button className="customization-download" onClick={downloadCustomization}>Download customization prompts .md</button> : <a className="customization-download" href={`/discover/${concept.slug}`}>See the preview details →</a>}</header>
    <section className="market-workspace-grid"><form onSubmit={(event) => { event.preventDefault(); setCreated(true); }}><small>BRING YOUR REAL CONTEXT</small><h2>Walk in with a page. Walk out with a letter.</h2><p className="iep-note">The one-page Parent Agenda is what you hand the room; the follow-up letter is what makes what they said stick. Both are built from what you enter here — nothing is added for you.</p>
      <div className="iep-row two"><label>Meeting date<input type="date" value={meetingDate} onChange={(event) => { setMeetingDate(event.target.value); touch(); }}/></label><label>Student first name or initials (optional)<input value={studentName} onChange={(event) => { setStudentName(event.target.value); touch(); }} placeholder="First name or initials only"/></label></div>
      {days !== null && days > 0 && <p className="iep-note">Your meeting is in {days} day{days === 1 ? "" : "s"}{deadline ? ` — the follow-up letter goes out within 48 hours, by ${formatDate(deadline)}` : ""}.</p>}
      <article className="iep-card"><div className="iep-subhead"><b>Current goals</b><span>Each goal on the IEP, and what progress you have actually seen.</span></div>
        {goals.map((row, index) => <div className="iep-row" key={row.id}><input value={row.goal} onChange={(event) => { setGoals(goals.map((item, i) => i === index ? { ...item, goal: event.target.value } : item)); touch(); }} placeholder="Goal, in your own words"/><input value={row.progress} onChange={(event) => { setGoals(goals.map((item, i) => i === index ? { ...item, progress: event.target.value } : item)); touch(); }} placeholder="What progress have you seen?"/><button type="button" aria-label="Remove goal" onClick={() => { setGoals(goals.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="iep-add" onClick={() => { setGoals([...goals, { id: newId(), goal: "", progress: "" }]); touch(); }}>+ Add goal</button></article>
      <article className="iep-card"><div className="iep-subhead"><b>Evidence log</b><span>What you have observed, when, and where it was seen. Dated observations are what the room cannot wave away.</span></div>
        {evidence.map((row, index) => <div className="iep-row three" key={row.id}><input type="date" aria-label="Observation date" value={row.date} onChange={(event) => { setEvidence(evidence.map((item, i) => i === index ? { ...item, date: event.target.value } : item)); touch(); }}/><input value={row.observation} onChange={(event) => { setEvidence(evidence.map((item, i) => i === index ? { ...item, observation: event.target.value } : item)); touch(); }} placeholder="What did you observe?"/><input value={row.source} onChange={(event) => { setEvidence(evidence.map((item, i) => i === index ? { ...item, source: event.target.value } : item)); touch(); }} placeholder="Where: home, class, tutor…"/><button type="button" aria-label="Remove observation" onClick={() => { setEvidence(evidence.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="iep-add" onClick={() => { setEvidence([...evidence, { id: newId(), date: "", observation: "", source: "" }]); touch(); }}>+ Add observation</button></article>
      <article className="iep-card"><div className="iep-subhead"><b>Questions and priorities</b><span>Your questions, in your words — plus what your family is asking for. The agenda also turns each goal into a question about the data behind it.</span></div>
        {questions.map((row, index) => <div className="iep-row single" key={row.id}><input value={row.question} onChange={(event) => { setQuestions(questions.map((item, i) => i === index ? { ...item, question: event.target.value } : item)); touch(); }} placeholder="A question to bring to the meeting"/><button type="button" aria-label="Remove question" onClick={() => { setQuestions(questions.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="iep-add" onClick={() => { setQuestions([...questions, { id: newId(), question: "" }]); touch(); }}>+ Add question</button>
        <label>What we're asking for<textarea value={priorities} onChange={(event) => { setPriorities(event.target.value); touch(); }} placeholder="Family and student priorities — services, supports, changes…"/></label></article>
      <article className="iep-card"><div className="iep-subhead"><b>Decision log</b><span>Fill this in during or after the meeting: what was decided, who promised it, and by when. The follow-up letter is built from these lines.</span></div>
        {decisions.map((row, index) => <div className="iep-row three" key={row.id}><input value={row.decision} onChange={(event) => { setDecisions(decisions.map((item, i) => i === index ? { ...item, decision: event.target.value } : item)); touch(); }} placeholder="What was decided"/><input value={row.owner} onChange={(event) => { setDecisions(decisions.map((item, i) => i === index ? { ...item, owner: event.target.value } : item)); touch(); }} placeholder="Who promised it"/><input type="date" aria-label="Due date" value={row.due} onChange={(event) => { setDecisions(decisions.map((item, i) => i === index ? { ...item, due: event.target.value } : item)); touch(); }}/><button type="button" aria-label="Remove decision" onClick={() => { setDecisions(decisions.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="iep-add" onClick={() => { setDecisions([...decisions, { id: newId(), decision: "", owner: "", due: "" }]); touch(); }}>+ Add decision</button></article>
      <button className="primary" disabled={!canCreate}>Build my one-pager + letter →</button></form>
      <aside className={created ? "created" : ""}><small>YOUR OUTCOME</small><h2>{created ? headline : "Your one-pager and letter appear here."}</h2>{created ? <><p className="result-summary">{summary}</p>
        {onePager.sections.length > 0 && <div className="iep-page"><b>{onePager.heading}</b><p>{onePager.subheading}</p>{onePager.sections.map((section) => <article key={section.title}><b>{section.title}</b><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>}
        {onePager.sections.length === 0 && <p>Add a goal, an observation, or a question to build the one-pager.</p>}
        {plan.length > 0 && <article><b>Before the meeting</b><ul>{plan.map(({ date, step }) => <li key={step}>{formatDate(date)} — {step}</li>)}</ul></article>}
        <div className="iep-letter"><b>Follow-up letter draft</b><p>Send within 48 hours{deadline ? ` — by ${formatDate(deadline)}` : ""}. If it is not in writing, it does not exist.</p><pre>{letter}</pre></div>
        {sections.filter((section) => section.title === "Evidence log" || section.title === "Decision log").map((section, index) => <article key={section.title}><b>{String(index + 1).padStart(2, "0")} · {section.title}</b><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        <div className="workspace-review"><b>Before you use it</b><p>{concept.guardrail}</p></div>
        {access === "unlocked" ? <><div className="rally-actions"><button onClick={downloadOutcome}>Download my outcome .md</button><button onClick={downloadPacket}>Download PDF packet</button><button onClick={downloadCustomization}>Customize this Rally .md</button><button onClick={save}>Save to My Rallies</button></div>{saveStatus && <small>{saveStatus}</small>}</> : <div className="preview-lock"><small>WORKING PREVIEW COMPLETE</small><b>Paid access is not on sale yet.</b><p>This is a preview. For a complete plan you can download today, try one of the free Rallies.</p><a className="primary" href={`/discover/${concept.slug}`}>See the full listing →</a></div>}</> : <><p>Enter your meeting date and at least one goal, observation, or question. The one-pager and the follow-up letter build from what you enter. Paid saving and downloads are not available yet.</p><a className="workspace-listing-link" href={`/discover/${concept.slug}`}>See the full listing →</a></>}</aside></section>
  </main>;
}
