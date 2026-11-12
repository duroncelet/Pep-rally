"use client";

import { useEffect, useMemo, useState } from "react";
import type { RallyConcept } from "../../../catalog";
import { downloadMarkdown, markdownCell, safeFileName } from "../../../download-markdown";
import { buildCustomizationKit } from "../../../customization-kit";
import { parseMoneyToCents, formatCents, computeMoveOut, roommateSections, roommateHeadline, type RoommateMoveOutInput, type LeaseStructure, type SharedItem } from "../../../roommate-move-out";

// Roommate Move-Out Splitter — deposit math + condition record computation.
// Part 4 (all-Rallies consumer audit, section 10): the buyer is buying
// proof, not a tool — a dated move-out record every roommate reviewed. The
// generic workspace assigned nobody to anything and did no arithmetic. This
// workspace computes the deposit split (shared vs per-person deductions),
// the final-month proration, sold-item proceeds, and the deposit-return
// deadline, and tracks the condition record's coverage and who has reviewed
// the agreement. No photo upload exists (out of scope tonight); the record
// tracks which rooms have photos taken.

type DeductionRow = { id: string; label: string; amount: string; chargedTo: string };
type ItemRow = { id: string; item: string; disposition: SharedItem["disposition"]; owner: string; proceeds: string };
type RoomRow = { id: string; room: string; note: string; photoTaken: boolean };
type TaskRow = { id: string; task: string; assignee: string; done: boolean };

const newId = () => crypto.randomUUID();
const SHARED = "__shared__";

export default function RoommateMoveOutWorkspace({ concept }: { concept: RallyConcept }) {
  const [roommates, setRoommates] = useState<string[]>(["", ""]);
  const [leaseStructure, setLeaseStructure] = useState<LeaseStructure>("joint");
  const [departingName, setDepartingName] = useState("");
  const [deposit, setDeposit] = useState("");
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [monthlyRent, setMonthlyRent] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [stateDeadlineDays, setStateDeadlineDays] = useState("");
  const [sharedItems, setSharedItems] = useState<ItemRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([{ id: newId(), room: "", note: "", photoTaken: false }]);
  const [tasks, setTasks] = useState<TaskRow[]>([{ id: newId(), task: "", assignee: "", done: false }]);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [created, setCreated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [access, setAccess] = useState<"checking" | "preview" | "unlocked">("checking");

  const names = useMemo(() => roommates.map((name) => name.trim()).filter(Boolean), [roommates]);
  const input: RoommateMoveOutInput = useMemo(() => ({
    roommates: names.map((name) => ({ name })),
    leaseStructure,
    departingName,
    depositCents: parseMoneyToCents(deposit),
    deductions: deductions.map((row) => ({ label: row.label, cents: parseMoneyToCents(row.amount), chargedTo: row.chargedTo })),
    monthlyRentCents: parseMoneyToCents(monthlyRent),
    moveOutDate,
    stateDeadlineDays: /^\d+$/.test(stateDeadlineDays.trim()) ? Number(stateDeadlineDays.trim()) : null,
    sharedItems: sharedItems.map((row) => ({ item: row.item, disposition: row.disposition, owner: row.owner, proceedsCents: parseMoneyToCents(row.proceeds) })),
    rooms: rooms.map(({ room, note, photoTaken }) => ({ room, note, photoTaken })),
    tasks: tasks.map(({ task, assignee, done }) => ({ task, assignee, done })),
    acknowledged,
  }), [names, leaseStructure, departingName, deposit, deductions, monthlyRent, moveOutDate, stateDeadlineDays, sharedItems, rooms, tasks, acknowledged]);

  const computed = useMemo(() => computeMoveOut(input), [input]);
  const sections = useMemo(() => roommateSections(input), [input]);
  const { headline, summary } = useMemo(() => roommateHeadline(input), [input]);
  const canCreate = Boolean(names.length && (input.depositCents !== null || rooms.some((row) => row.room.trim()) || tasks.some((row) => row.task.trim())));

  useEffect(() => {
    fetch(`/api/rally-access?slug=${encodeURIComponent(concept.slug)}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setAccess(data?.unlocked ? "unlocked" : "preview"))
      .catch(() => setAccess("preview"));
  }, [concept.slug]);

  function touch() { setCreated(false); }

  async function save() {
    setSaveStatus("Saving…");
    const summaryText = `${headline} for ${names.join(", ")}.`;
    const response = await fetch("/api/rallies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: `catalog:${concept.slug}`, title: concept.title, inputs: input, summary: summaryText }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaveStatus(response.ok ? "Saved to My Rallies" : data.error ?? "Could not save this workspace.");
  }

  function downloadOutcome() {
    const markdown = `# ${headline}\n\n> ${summary}\n\n## What I brought\n\nRoommates: ${names.length ? names.map((name) => markdownCell(name)).join(", ") : "none entered yet"}. Lease: ${leaseStructure === "joint" ? "everyone on one joint lease" : leaseStructure === "individual" ? "separate/individual leases" : `one roommate leaving mid-lease (${markdownCell(departingName) || "not named yet"})`}. Deposit: ${input.depositCents !== null ? formatCents(input.depositCents) : "not entered"}. Move-out date: ${moveOutDate || "not entered"}.\n\n${sections.map((section) => `## ${section.title}\n\n${section.intro ? `${section.intro}\n\n` : ""}${section.items.map((item) => `- ${markdownCell(item)}`).join("\n")}`).join("\n\n")}\n\n## Before using it\n\n${concept.guardrail}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}\n`;
    downloadMarkdown(`${safeFileName(concept.title)}-outcome.md`, markdown);
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({ title: concept.title, promise: concept.promise, audience: concept.forWhom, inputs: concept.inputs, outputs: concept.outcome, guardrail: concept.guardrail, currentAnswers: { "Roommates": names.join("; "), "Deposit and costs": deposit, "Condition and deadlines": rooms.map((row) => row.room).filter(Boolean).join("; ") } });
    downloadMarkdown(`${safeFileName(concept.title)}-customization-kit.md`, markdown);
  }

  return <main className={`market-workspace concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={`/discover/${concept.slug}`}>Full listing</a><a href="/library">My Rallies</a></div></nav>
    <header><small>WORKING RALLY · {concept.category.toUpperCase()} · {access === "unlocked" ? "PURCHASED" : "PREVIEW"}</small><h1>{concept.title}</h1><p>{concept.promise}</p>{access === "unlocked" ? <button className="customization-download" onClick={downloadCustomization}>Download customization prompts .md</button> : <a className="customization-download" href={`/discover/${concept.slug}`}>See the preview details →</a>}</header>
    <section className="market-workspace-grid"><form onSubmit={(event) => { event.preventDefault(); setCreated(true); }}><small>BRING YOUR REAL CONTEXT</small><h2>Your deposit, defended.</h2><p className="rm-note">The deposit is the biggest shared sum — and it comes back months later, after memories fade. This record does the math now, while everyone agrees on it.</p>
      <article className="rm-card"><div className="rm-subhead"><b>Roommates on the lease</b></div>
        {roommates.map((name, index) => <div className="rm-row single" key={index}><input value={name} onChange={(event) => { setRoommates(roommates.map((item, i) => i === index ? event.target.value : item)); touch(); }} placeholder={`Roommate ${index + 1}`}/>{roommates.length > 1 && <button type="button" aria-label="Remove roommate" onClick={() => { setRoommates(roommates.filter((_, i) => i !== index)); touch(); }}>×</button>}</div>)}
        <button type="button" className="rm-add" onClick={() => { setRoommates([...roommates, ""]); touch(); }}>+ Add roommate</button>
        <label>Lease structure<select value={leaseStructure} onChange={(event) => { setLeaseStructure(event.target.value as LeaseStructure); touch(); }}><option value="joint">Everyone on one joint lease</option><option value="individual">Separate / individual leases</option><option value="departing">One roommate leaving mid-lease</option></select></label>
        {leaseStructure === "departing" && <label>Who is leaving?<select value={departingName} onChange={(event) => { setDepartingName(event.target.value); touch(); }}><option value="">Choose…</option>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}
        {leaseStructure === "departing" && <p className="rm-note">The deposit stays with the landlord until everyone on the lease has moved out — the departing roommate's share is held, not refunded now.</p>}
        {leaseStructure === "joint" && <p className="rm-note">Joint lease: this split is between roommates only. Joint and several liability means it is unenforceable against the landlord.</p>}</article>
      <article className="rm-card"><div className="rm-subhead"><b>Deposit and deductions</b><span>What the landlord holds, and what comes off it. Charge a deduction to one roommate or share it across everyone.</span></div>
        <div className="rm-row two"><label>Total deposit<input value={deposit} inputMode="decimal" onChange={(event) => { setDeposit(event.target.value); touch(); }} placeholder="$2,400"/></label><label>Your state's deposit-return deadline (days)<input value={stateDeadlineDays} inputMode="numeric" onChange={(event) => { setStateDeadlineDays(event.target.value); touch(); }} placeholder="e.g. 21"/></label></div>
        <p className="rm-note">Deadlines vary by state, typically 14–45 days. Enter your state's number from your lease or state law — none is assumed for you.</p>
        {deductions.map((row, index) => <div className="rm-row three" key={row.id}><input value={row.label} onChange={(event) => { setDeductions(deductions.map((item, i) => i === index ? { ...item, label: event.target.value } : item)); touch(); }} placeholder="Cleaning, damage…"/><input value={row.amount} inputMode="decimal" onChange={(event) => { setDeductions(deductions.map((item, i) => i === index ? { ...item, amount: event.target.value } : item)); touch(); }} placeholder="$0.00"/><select value={row.chargedTo} onChange={(event) => { setDeductions(deductions.map((item, i) => i === index ? { ...item, chargedTo: event.target.value } : item)); touch(); }}><option value={SHARED}>Shared by all</option>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select><button type="button" aria-label="Remove deduction" onClick={() => { setDeductions(deductions.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="rm-add" onClick={() => { setDeductions([...deductions, { id: newId(), label: "", amount: "", chargedTo: SHARED }]); touch(); }}>+ Add deduction</button></article>
      <article className="rm-card"><div className="rm-subhead"><b>Final month</b><span>Rent prorates by days occupied over days in the month — a day-count split you agree to, with the formula shown.</span></div>
        <div className="rm-row two"><label>Monthly rent<input value={monthlyRent} inputMode="decimal" onChange={(event) => { setMonthlyRent(event.target.value); touch(); }} placeholder="$2,400"/></label><label>Move-out date<input type="date" value={moveOutDate} onChange={(event) => { setMoveOutDate(event.target.value); touch(); }}/></label></div>
        {computed.proratedRentCents !== null && computed.prorationLabel && <p className="rm-note">Prorated final month: {formatCents(computed.proratedRentCents)} ({computed.prorationLabel}).</p>}</article>
      <article className="rm-card"><div className="rm-subhead"><b>Shared items</b><span>What happens to the things you bought together — and where the money goes if something sells.</span></div>
        {sharedItems.map((row, index) => <div key={row.id} className="rm-item-group"><div className="rm-row three"><input value={row.item} onChange={(event) => { setSharedItems(sharedItems.map((item, i) => i === index ? { ...item, item: event.target.value } : item)); touch(); }} placeholder="Couch, TV, vacuum…"/><select value={row.disposition} onChange={(event) => { setSharedItems(sharedItems.map((item, i) => i === index ? { ...item, disposition: event.target.value as SharedItem["disposition"] } : item)); touch(); }}><option value="undecided">Undecided</option><option value="keep">Keep (one person)</option><option value="sell-split">Sell, split proceeds</option><option value="sell-owner">Sell, proceeds to owner</option><option value="donate">Donate</option></select><input value={row.proceeds} inputMode="decimal" aria-label="Sale proceeds" onChange={(event) => { setSharedItems(sharedItems.map((item, i) => i === index ? { ...item, proceeds: event.target.value } : item)); touch(); }} placeholder="Proceeds, if sold"/><button type="button" aria-label="Remove item" onClick={() => { setSharedItems(sharedItems.filter((_, i) => i !== index)); touch(); }}>×</button></div>
        {(row.disposition === "keep" || row.disposition === "sell-owner") && <label className="rm-sublabel">Who{row.disposition === "keep" ? " keeps it" : " gets the proceeds"}?<select value={row.owner} onChange={(event) => { setSharedItems(sharedItems.map((item, i) => i === index ? { ...item, owner: event.target.value } : item)); touch(); }}><option value="">Choose…</option>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}</div>)}
        <button type="button" className="rm-add" onClick={() => { setSharedItems([...sharedItems, { id: newId(), item: "", disposition: "undecided", owner: "", proceeds: "" }]); touch(); }}>+ Add shared item</button></article>
      <article className="rm-card"><div className="rm-subhead"><b>Condition record</b><span>Room by room, with photos. Documentation is what decides the dispute months later — check off each room as you photograph it.</span></div>
        {rooms.map((row, index) => <div className="rm-row three" key={row.id}><input value={row.room} onChange={(event) => { setRooms(rooms.map((item, i) => i === index ? { ...item, room: event.target.value } : item)); touch(); }} placeholder="Kitchen, bathroom…"/><input value={row.note} onChange={(event) => { setRooms(rooms.map((item, i) => i === index ? { ...item, note: event.target.value } : item)); touch(); }} placeholder="Condition note"/><label className="rm-check"><input type="checkbox" checked={row.photoTaken} onChange={(event) => { setRooms(rooms.map((item, i) => i === index ? { ...item, photoTaken: event.target.checked } : item)); touch(); }}/> Photo taken</label><button type="button" aria-label="Remove room" onClick={() => { setRooms(rooms.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="rm-add" onClick={() => { setRooms([...rooms, { id: newId(), room: "", note: "", photoTaken: false }]); touch(); }}>+ Add room</button></article>
      <article className="rm-card"><div className="rm-subhead"><b>Tasks</b><span>Every task gets a person. Unassigned tasks stay visible — they don't disappear.</span></div>
        {tasks.map((row, index) => <div className="rm-row three" key={row.id}><input value={row.task} onChange={(event) => { setTasks(tasks.map((item, i) => i === index ? { ...item, task: event.target.value } : item)); touch(); }} placeholder="Return keys, clean oven…"/><select value={row.assignee} onChange={(event) => { setTasks(tasks.map((item, i) => i === index ? { ...item, assignee: event.target.value } : item)); touch(); }}><option value="">Unassigned</option>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select><label className="rm-check"><input type="checkbox" checked={row.done} onChange={(event) => { setTasks(tasks.map((item, i) => i === index ? { ...item, done: event.target.checked } : item)); touch(); }}/> Done</label><button type="button" aria-label="Remove task" onClick={() => { setTasks(tasks.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="rm-add" onClick={() => { setTasks([...tasks, { id: newId(), task: "", assignee: "", done: false }]); touch(); }}>+ Add task</button></article>
      <button className="primary" disabled={!canCreate}>Build the move-out record →</button></form>
      <aside className={created ? "created" : ""}><small>YOUR OUTCOME</small><h2>{created ? headline : "Your move-out record appears here."}</h2>{created ? <><p className="result-summary">{summary}</p>
        {computed.settlements.length > 0 && input.depositCents !== null && <div className="rm-table"><div className="rm-table-row labels"><span>Roommate</span><span>Share</span><span>Deductions</span><span>Back</span></div>{computed.settlements.map((person) => <div className="rm-table-row" key={person.name}><span>{person.name}{person.heldUntilLeaseEnd ? " (held)" : ""}</span><span>{formatCents(person.depositShareCents)}</span><span>−{formatCents(person.sharedDeductionsCents + person.personalDeductionsCents)}</span><span>{formatCents(person.netCents)}</span></div>)}</div>}
        {sections.map((section, index) => <article key={section.title}><b>{String(index + 1).padStart(2, "0")} · {section.title}</b>{section.intro && <p>{section.intro}</p>}<ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        {names.length > 0 && <article><b>Reviewed by</b><p>Every roommate reviews the same record before anything is sent or paid. Check off each person as they review it.</p><div className="rm-review">{names.map((name) => <label key={name}><input type="checkbox" checked={acknowledged.includes(name)} onChange={(event) => { setAcknowledged(event.target.checked ? [...acknowledged, name] : acknowledged.filter((item) => item !== name)); }} /> {name} reviewed it</label>)}</div></article>}
        <div className="workspace-review"><b>Before you use it</b><p>{concept.guardrail}</p></div>
        {access === "unlocked" ? <><div className="rally-actions"><button onClick={downloadOutcome}>Download my outcome .md</button><button onClick={downloadCustomization}>Customize this Rally .md</button><button onClick={save}>Save to My Rallies</button></div>{saveStatus && <small>{saveStatus}</small>}</> : <div className="preview-lock"><small>WORKING PREVIEW COMPLETE</small><b>Paid access is not on sale yet.</b><p>This is a preview. For a complete plan you can download today, try one of the free Rallies.</p><a className="primary" href={`/discover/${concept.slug}`}>See the full listing →</a></div>}</> : <><p>Add the roommates and the deposit to see the split — plus the condition record and the review list. Paid saving and downloads are not available yet.</p><a className="workspace-listing-link" href={`/discover/${concept.slug}`}>See the full listing →</a></>}</aside></section>
  </main>;
}
