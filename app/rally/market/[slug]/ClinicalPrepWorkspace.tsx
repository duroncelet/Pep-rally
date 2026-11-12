"use client";

import { useEffect, useMemo, useState } from "react";
import type { RallyConcept } from "../../../catalog";
import { downloadMarkdown, markdownCell, safeFileName } from "../../../download-markdown";
import { downloadOutcomePdf } from "../../../download-pdf";
import { marketOutcomeDocument } from "../../../market-outcome-pdf";
import { buildCustomizationKit } from "../../../customization-kit";
import { computeClinicalPrep, clinicalSections, clinicalHeadline, formatDate, PACK_LIST, type ClinicalPrepInput, type ClinicalSkill, type ClinicalPatientSlot } from "../../../clinical-prep";

// Clinical Rotation Pocket Prep — the rotation plan, from the student's inputs.
// Part 4 (all-Rallies consumer audit, section 4): the rotation-long plan —
// tonight's prep plus a tracker that tells her what's due, what's done, and
// what's missing before her instructor does. No patient names, identifiers,
// medical records, diagnosis, or treatment recommendations anywhere: prep
// slots are labeled Patient A/B/C only.

const WEEKDAYS = [{ day: 0, label: "Sun" }, { day: 1, label: "Mon" }, { day: 2, label: "Tue" }, { day: 3, label: "Wed" }, { day: 4, label: "Thu" }, { day: 5, label: "Fri" }, { day: 6, label: "Sat" }];
const newId = () => crypto.randomUUID();
type SkillRow = ClinicalSkill & { id: string };
type GoalRow = { id: string; goal: string };

export default function ClinicalPrepWorkspace({ concept }: { concept: RallyConcept }) {
  const [unitType, setUnitType] = useState("");
  const [rotationStart, setRotationStart] = useState("");
  const [rotationEnd, setRotationEnd] = useState("");
  const [clinicalWeekdays, setClinicalWeekdays] = useState<number[]>([]);
  const [graduationDate, setGraduationDate] = useState("");
  const [goals, setGoals] = useState<GoalRow[]>([{ id: newId(), goal: "" }]);
  const [instructorRequirements, setInstructorRequirements] = useState("");
  const [skills, setSkills] = useState<SkillRow[]>([{ id: newId(), skill: "", required: true, done: false }]);
  const [sterileProcedureDone, setSterileProcedureDone] = useState(false);
  const [medCardsDone, setMedCardsDone] = useState(false);
  const [patientSlots, setPatientSlots] = useState<ClinicalPatientSlot[]>([
    { label: "Patient A", focusMeds: false, focusLabs: false, focusCarePlan: false, note: "" },
    { label: "Patient B", focusMeds: false, focusLabs: false, focusCarePlan: false, note: "" },
    { label: "Patient C", focusMeds: false, focusLabs: false, focusCarePlan: false, note: "" },
  ]);
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [created, setCreated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [access, setAccess] = useState<"checking" | "preview" | "unlocked">("checking");

  const input: ClinicalPrepInput = useMemo(() => ({
    unitType, rotationStart, rotationEnd, clinicalWeekdays, graduationDate,
    learningGoals: goals.map((row) => row.goal),
    instructorRequirements,
    skills: skills.map(({ skill, required, done }) => ({ skill, required, done })),
    sterileProcedureDone, medCardsDone, patientSlots, packedItems,
  }), [unitType, rotationStart, rotationEnd, clinicalWeekdays, graduationDate, goals, instructorRequirements, skills, sterileProcedureDone, medCardsDone, patientSlots, packedItems]);

  const computed = useMemo(() => computeClinicalPrep(input), [input]);
  const sections = useMemo(() => clinicalSections(input), [input]);
  const { headline, summary } = useMemo(() => clinicalHeadline(input), [input]);
  const canCreate = Boolean(unitType.trim() || rotationStart.trim() || skills.some((row) => row.skill.trim()) || goals.some((row) => row.goal.trim()));

  useEffect(() => {
    fetch(`/api/rally-access?slug=${encodeURIComponent(concept.slug)}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setAccess(data?.unlocked ? "unlocked" : "preview"))
      .catch(() => setAccess("preview"));
  }, [concept.slug]);

  function touch() { setCreated(false); }

  async function save() {
    setSaveStatus("Saving…");
    const summaryText = `${headline}${unitType.trim() ? ` for ${unitType.trim()}` : ""}.`;
    const response = await fetch("/api/rallies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: `catalog:${concept.slug}`, title: concept.title, inputs: input, summary: summaryText }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaveStatus(response.ok ? "Saved to My Rallies" : data.error ?? "Could not save this workspace.");
  }

  function downloadOutcome() {
    const markdown = `# ${headline}\n\n> ${summary}\n\n## What I brought\n\nUnit: ${unitType.trim() ? markdownCell(unitType) : "not entered yet"}. Rotation: ${rotationStart || "no start date"} to ${rotationEnd || "no end date"}. Clinical weekdays: ${clinicalWeekdays.length ? clinicalWeekdays.map((day) => WEEKDAYS.find((item) => item.day === day)?.label).join(", ") : "none chosen yet"}.\n\n${sections.map((section) => `## ${section.title}\n\n${section.intro ? `${section.intro}\n\n` : ""}${section.items.map((item) => `- ${markdownCell(item)}`).join("\n")}`).join("\n\n")}\n\n## Before using it\n\n${concept.guardrail}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}\n`;
    downloadMarkdown(`${safeFileName(concept.title)}-outcome.md`, markdown);
  }

  // Part 1B, step A6: this Rally is PDF-first — the designed packet is the pocket prep the student prints for the shift. The packet
  // renders the same computed sections shown on screen, via the shared A6
  // document builder.
  async function downloadPacket() {
    try { await downloadOutcomePdf(marketOutcomeDocument(concept, { headline, summary, sections })); }
    catch (error) { setSaveStatus((error as Error).message); }
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({ title: concept.title, promise: concept.promise, audience: concept.forWhom, inputs: concept.inputs, outputs: concept.outcome, guardrail: concept.guardrail, currentAnswers: { "Unit type": unitType, "Learning goals": goals.map((row) => row.goal).filter(Boolean).join("; "), "Instructor checklist": instructorRequirements } });
    downloadMarkdown(`${safeFileName(concept.title)}-customization-kit.md`, markdown);
  }

  return <main className={`market-workspace concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={`/discover/${concept.slug}`}>Full listing</a><a href="/library">My Rallies</a></div></nav>
    <header><small>WORKING RALLY · {concept.category.toUpperCase()} · {access === "unlocked" ? "PURCHASED" : "PREVIEW"}</small><h1>{concept.title}</h1><p>{concept.promise}</p>{access === "unlocked" ? <button className="customization-download" onClick={downloadCustomization}>Download customization prompts .md</button> : <a className="customization-download" href={`/discover/${concept.slug}`}>See the preview details →</a>}</header>
    <section className="market-workspace-grid"><form onSubmit={(event) => { event.preventDefault(); setCreated(true); }}><small>BRING YOUR REAL CONTEXT</small><h2>Your rotation, planned.</h2><p className="clin-note">Tonight's prep plus the running rotation log — what's due, what's done, and what's missing, before your instructor tells you. De-identified only: no patient names or identifiers anywhere.</p>
      <label className="clin-top-field">Unit type<input value={unitType} onChange={(event) => { setUnitType(event.target.value); touch(); }} placeholder="Med-Surg, OB, ICU…"/></label>
      <article className="clin-card"><div className="clin-subhead"><b>Rotation dates</b><span>Your clinical days are counted from these dates and weekdays.</span></div>
        <div className="clin-row two"><label>Rotation start<input type="date" value={rotationStart} onChange={(event) => { setRotationStart(event.target.value); touch(); }}/></label><label>Rotation end<input type="date" value={rotationEnd} onChange={(event) => { setRotationEnd(event.target.value); touch(); }}/></label></div>
        <div className="clin-subhead"><b>Clinical weekdays</b></div>
        <div className="clin-weekdays">{WEEKDAYS.map(({ day, label }) => <label key={day}><input type="checkbox" checked={clinicalWeekdays.includes(day)} onChange={(event) => { setClinicalWeekdays(event.target.checked ? [...clinicalWeekdays, day].sort() : clinicalWeekdays.filter((item) => item !== day)); touch(); }}/> {label}</label>)}</div>
        <label>Graduation date (optional — sets the 90% skills deadline)<input type="date" value={graduationDate} onChange={(event) => { setGraduationDate(event.target.value); touch(); }}/></label></article>
      <article className="clin-card"><div className="clin-subhead"><b>Skills checklist, from your syllabus</b><span>Enter the skills your program requires. The plan tracks the required ones toward the 90% deadline.</span></div>
        {skills.map((row, index) => <div className="clin-row three" key={row.id}><input value={row.skill} onChange={(event) => { setSkills(skills.map((item, i) => i === index ? { ...item, skill: event.target.value } : item)); touch(); }} placeholder="IV insertion, Foley catheter…"/><label className="clin-check"><input type="checkbox" checked={row.required} onChange={(event) => { setSkills(skills.map((item, i) => i === index ? { ...item, required: event.target.checked } : item)); touch(); }}/> Required</label><label className="clin-check"><input type="checkbox" checked={row.done} onChange={(event) => { setSkills(skills.map((item, i) => i === index ? { ...item, done: event.target.checked } : item)); touch(); }}/> Done</label><button type="button" aria-label="Remove skill" onClick={() => { setSkills(skills.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="clin-add" onClick={() => { setSkills([...skills, { id: newId(), skill: "", required: true, done: false }]); touch(); }}>+ Add skill</button>
        <label className="clin-check"><input type="checkbox" checked={medCardsDone} onChange={(event) => { setMedCardsDone(event.target.checked); touch(); }}/> Med cards done (due Day 2, 0630, handwritten)</label>
        <label className="clin-check"><input type="checkbox" checked={sterileProcedureDone} onChange={(event) => { setSterileProcedureDone(event.target.checked); touch(); }}/> Sterile procedure completed (at least one required)</label></article>
      <article className="clin-card"><div className="clin-subhead"><b>Tonight's prep — de-identified patient slots</b><span>The night-before load is patient-specific prep: chart, meds, labs, care plan. Use Patient A/B/C only — never names or identifiers.</span></div>
        {patientSlots.map((slot, index) => <div className="clin-slot" key={slot.label}><b>{slot.label}</b><div className="clin-focus"><label><input type="checkbox" checked={slot.focusMeds} onChange={(event) => { setPatientSlots(patientSlots.map((item, i) => i === index ? { ...item, focusMeds: event.target.checked } : item)); touch(); }}/> Meds</label><label><input type="checkbox" checked={slot.focusLabs} onChange={(event) => { setPatientSlots(patientSlots.map((item, i) => i === index ? { ...item, focusLabs: event.target.checked } : item)); touch(); }}/> Labs</label><label><input type="checkbox" checked={slot.focusCarePlan} onChange={(event) => { setPatientSlots(patientSlots.map((item, i) => i === index ? { ...item, focusCarePlan: event.target.checked } : item)); touch(); }}/> Care plan</label></div><input value={slot.note} onChange={(event) => { setPatientSlots(patientSlots.map((item, i) => i === index ? { ...item, note: event.target.value } : item)); touch(); }} placeholder="De-identified note (no names, no identifiers)"/></div>)}
        <div className="clin-subhead"><b>Pack list</b><span>Mandatory items — missing one can mean being sent home.</span></div>
        <div className="clin-pack">{PACK_LIST.map((item) => <label key={item}><input type="checkbox" checked={packedItems.includes(item)} onChange={(event) => { setPackedItems(event.target.checked ? [...packedItems, item] : packedItems.filter((entry) => entry !== item)); touch(); }}/> {item}</label>)}</div></article>
      <article className="clin-card"><div className="clin-subhead"><b>Learning goals and instructor requirements</b></div>
        {goals.map((row, index) => <div className="clin-row single" key={row.id}><input value={row.goal} onChange={(event) => { setGoals(goals.map((item, i) => i === index ? { ...item, goal: event.target.value } : item)); touch(); }} placeholder="A learning goal for this rotation"/><button type="button" aria-label="Remove goal" onClick={() => { setGoals(goals.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="clin-add" onClick={() => { setGoals([...goals, { id: newId(), goal: "" }]); touch(); }}>+ Add learning goal</button>
        <label>Instructor checklist<textarea value={instructorRequirements} onChange={(event) => { setInstructorRequirements(event.target.value); touch(); }} placeholder="What your instructor requires — med cards, paperwork, dress code…"/></label></article>
      <button className="primary" disabled={!canCreate}>Build my rotation plan →</button></form>
      <aside className={created ? "created" : ""}><small>YOUR OUTCOME</small><h2>{created ? headline : "Your rotation plan appears here."}</h2>{created ? <><p className="result-summary">{summary}</p>
        {computed.nextShift && <div className="clin-next"><b>Next shift: {formatDate(computed.nextShift)}</b><p>{computed.daysRemaining} clinical days to go{computed.currentWeek !== null && computed.totalWeeks ? ` · week ${computed.currentWeek} of ${computed.totalWeeks}` : ""}.</p></div>}
        {computed.requiredSkillsPct !== null && <div className="clin-meter"><b>Required skills: {computed.requiredSkillsDone} of {computed.requiredSkillsTotal} ({computed.requiredSkillsPct}%)</b><div className="clin-meter-bar"><span style={{ width: `${computed.requiredSkillsPct}%` }} /></div>{computed.missingRequiredSkills.length > 0 && <p>Still needed: {computed.missingRequiredSkills.join(", ")}.</p>}</div>}
        {sections.map((section, index) => <article key={section.title}><b>{String(index + 1).padStart(2, "0")} · {section.title}</b>{section.intro && <p>{section.intro}</p>}<ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        <div className="workspace-review"><b>Before you use it</b><p>{concept.guardrail}</p></div>
        {access === "unlocked" ? <><div className="rally-actions"><button onClick={downloadOutcome}>Download my outcome .md</button><button onClick={downloadPacket}>Download PDF packet</button><button onClick={downloadCustomization}>Customize this Rally .md</button><button onClick={save}>Save to My Rallies</button></div>{saveStatus && <small>{saveStatus}</small>}</> : <div className="preview-lock"><small>WORKING PREVIEW COMPLETE</small><b>Paid access is not on sale yet.</b><p>This is a preview. For a complete plan you can download today, try one of the free Rallies.</p><a className="primary" href={`/discover/${concept.slug}`}>See the full listing →</a></div>}</> : <><p>Add your rotation dates and clinical weekdays to build the plan — plus tonight's prep. Paid saving and downloads are not available yet.</p><a className="workspace-listing-link" href={`/discover/${concept.slug}`}>See the full listing →</a></>}</aside></section>
  </main>;
}
