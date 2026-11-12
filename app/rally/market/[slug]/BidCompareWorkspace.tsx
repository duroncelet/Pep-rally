"use client";

import { useEffect, useMemo, useState } from "react";
import type { RallyConcept } from "../../../catalog";
import { downloadMarkdown, markdownCell, safeFileName } from "../../../download-markdown";
import { downloadOutcomePdf } from "../../../download-pdf";
import { downloadXlsx } from "../../../download-xlsx";
import { bidCompareWorksheetXlsx } from "../../../bid-worksheet";
import { marketOutcomeDocument } from "../../../market-outcome-pdf";
import { buildCustomizationKit } from "../../../customization-kit";
import { parseMoneyToCents, formatCents, computeBidComparison, bidCompareSections, bidCompareHeadline, MAX_BIDS, type BidInput } from "../../../bid-compare";

// Home Project Bid Compare — structured bid entry + true-cost computation.
// Part 4 (all-Rallies consumer audit, section 12): the generic three-textarea
// workspace echoed bids back with verbs attached and computed nothing. This
// workspace takes real bid line items and shows the normalized true cost:
// quoted price, allowances repriced to what the buyer actually expects to
// pay, and exclusions added back. Nothing is invented — an unpriced line is
// surfaced as an unknown and the true cost is labeled a floor.

type MoneyRow = { id: string; label: string; amount: string };
type AllowanceRow = { id: string; label: string; allowance: string; expected: string };
type BidForm = { id: string; name: string; quoted: string; items: MoneyRow[]; allowances: AllowanceRow[]; exclusions: MoneyRow[]; deposit: string; weeks: string };

const newId = () => crypto.randomUUID();
const blankBid = (): BidForm => ({ id: newId(), name: "", quoted: "", items: [{ id: newId(), label: "", amount: "" }], allowances: [], exclusions: [], deposit: "", weeks: "" });

function toBidInput(form: BidForm): BidInput {
  const weeks = /^\d+$/.test(form.weeks.trim()) ? Number(form.weeks.trim()) : null;
  return {
    name: form.name,
    quotedCents: parseMoneyToCents(form.quoted),
    items: form.items.map((item) => ({ label: item.label, cents: parseMoneyToCents(item.amount) })),
    allowances: form.allowances.map((row) => ({ label: row.label, allowanceCents: parseMoneyToCents(row.allowance), expectedCents: parseMoneyToCents(row.expected) })),
    exclusions: form.exclusions.map((row) => ({ label: row.label, estimatedCents: parseMoneyToCents(row.amount) })),
    depositCents: parseMoneyToCents(form.deposit),
    weeks: weeks !== null && weeks > 0 && weeks <= 520 ? weeks : null,
  };
}

function moneyInvalid(value: string) {
  return value.trim() !== "" && parseMoneyToCents(value) === null;
}

export default function BidCompareWorkspace({ concept }: { concept: RallyConcept }) {
  const [bids, setBids] = useState<BidForm[]>([blankBid(), blankBid()]);
  const [mustHaves, setMustHaves] = useState("");
  const [questions, setQuestions] = useState("");
  const [created, setCreated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [access, setAccess] = useState<"checking" | "preview" | "unlocked">("checking");

  const bidInputs = useMemo(() => bids.map(toBidInput), [bids]);
  const comparison = useMemo(() => computeBidComparison(bidInputs), [bidInputs]);
  const sections = useMemo(() => bidCompareSections(bidInputs, mustHaves, questions), [bidInputs, mustHaves, questions]);
  const { headline, summary } = useMemo(() => bidCompareHeadline(bidInputs), [bidInputs]);
  const canCreate = bidInputs.some((bid) => bid.quotedCents !== null || bid.name.trim());
  const invalidMoney = bids.some((bid) => moneyInvalid(bid.quoted) || moneyInvalid(bid.deposit) || bid.items.some((item) => moneyInvalid(item.amount)) || bid.allowances.some((row) => moneyInvalid(row.allowance) || moneyInvalid(row.expected)) || bid.exclusions.some((row) => moneyInvalid(row.amount)));

  useEffect(() => {
    fetch(`/api/rally-access?slug=${encodeURIComponent(concept.slug)}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setAccess(data?.unlocked ? "unlocked" : "preview"))
      .catch(() => setAccess("preview"));
  }, [concept.slug]);

  function updateBid(id: string, patch: Partial<BidForm>) {
    setBids(bids.map((bid) => bid.id === id ? { ...bid, ...patch } : bid));
    setCreated(false);
  }

  async function save() {
    setSaveStatus("Saving…");
    const summaryText = `${headline} from ${comparison.priced.length} priced bid${comparison.priced.length === 1 ? "" : "s"}.`;
    const response = await fetch("/api/rallies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: `catalog:${concept.slug}`, title: concept.title, inputs: { bids: bidInputs, mustHaves, questions }, summary: summaryText }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaveStatus(response.ok ? "Saved to My Rallies" : data.error ?? "Could not save this workspace.");
  }

  function downloadOutcome() {
    const brought = bidInputs.map((bid, index) => {
      const lines = [`- **${markdownCell(bid.name || `Bid ${String.fromCharCode(65 + index)}`)}:** quoted ${bid.quotedCents !== null ? formatCents(bid.quotedCents) : "not entered"}`];
      for (const item of bid.items) if (item.label.trim()) lines.push(`  - ${markdownCell(item.label)}: ${item.cents !== null ? formatCents(item.cents) : "unpriced"}`);
      for (const row of bid.allowances) if (row.label.trim()) lines.push(`  - Allowance ${markdownCell(row.label)}: ${row.allowanceCents !== null ? formatCents(row.allowanceCents) : "?"} in the bid, expecting ${row.expectedCents !== null ? formatCents(row.expectedCents) : "?"}`);
      for (const row of bid.exclusions) if (row.label.trim()) lines.push(`  - Excluded ${markdownCell(row.label)}: estimated ${row.estimatedCents !== null ? formatCents(row.estimatedCents) : "?"}`);
      return lines.join("\n");
    }).join("\n");
    const markdown = `# ${headline}\n\n> ${summary}\n\n## What I brought\n\n${brought}${mustHaves.trim() ? `\n\nMust-haves and budget: ${markdownCell(mustHaves)}` : ""}${questions.trim() ? `\n\nQuestions for each contractor: ${markdownCell(questions)}` : ""}\n\n${sections.map((section) => `## ${section.title}\n\n${section.intro ? `${section.intro}\n\n` : ""}${section.items.map((item) => `- ${markdownCell(item)}`).join("\n")}`).join("\n\n")}\n\n## Before using it\n\n${concept.guardrail}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}\n`;
    downloadMarkdown(`${safeFileName(concept.title)}-outcome.md`, markdown);
  }

  // Part 1B, step A6: this Rally is PDF-first — the designed packet is the
  // comparison the buyer keeps and shares — and the normalized Excel
  // worksheet is a named deliverable. Both render the same computed
  // sections and true costs shown on screen, via the shared A6 builders.
  async function downloadPacket() {
    try { await downloadOutcomePdf(marketOutcomeDocument(concept, { headline, summary, sections })); }
    catch (error) { setSaveStatus((error as Error).message); }
  }

  function downloadWorksheet() {
    downloadXlsx(`${safeFileName(concept.title)}-bid-worksheet.xlsx`, bidCompareWorksheetXlsx(bidInputs, mustHaves, questions));
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({ title: concept.title, promise: concept.promise, audience: concept.forWhom, inputs: concept.inputs, outputs: concept.outcome, guardrail: concept.guardrail, currentAnswers: { "Bids compared": `${comparison.priced.length} priced`, "Must-haves and budget": mustHaves, "Questions for each contractor": questions } });
    downloadMarkdown(`${safeFileName(concept.title)}-customization-kit.md`, markdown);
  }

  return <main className={`market-workspace concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={`/discover/${concept.slug}`}>Full listing</a><a href="/library">My Rallies</a></div></nav>
    <header><small>WORKING RALLY · {concept.category.toUpperCase()} · {access === "unlocked" ? "PURCHASED" : "PREVIEW"}</small><h1>{concept.title}</h1><p>{concept.promise}</p>{access === "unlocked" ? <button className="customization-download" onClick={downloadCustomization}>Download customization prompts .md</button> : <a className="customization-download" href={`/discover/${concept.slug}`}>See the preview details →</a>}</header>
    <section className="market-workspace-grid"><form onSubmit={(event) => { event.preventDefault(); setCreated(true); }}><small>BRING YOUR REAL BIDS</small><h2>Three bids. One real price.</h2><p className="compute-note">Enter each bid as it was quoted — line items, allowances, and what it leaves out. The comparison reprices allowances to what you expect to pay and adds exclusions back, so the cheapest quote and the cheapest real price stop being confused.</p>
      {bids.map((bid, bidIndex) => <article className="bid-card" key={bid.id}><div className="bid-card-head"><h3>{bid.name.trim() || `Bid ${String.fromCharCode(65 + bidIndex)}`}</h3>{bids.length > 1 && <button type="button" aria-label={`Remove ${bid.name.trim() || `Bid ${String.fromCharCode(65 + bidIndex)}`}`} onClick={() => { setBids(bids.filter((item) => item.id !== bid.id)); setCreated(false); }}>Remove bid</button>}</div>
        <label>Contractor or bid name<input value={bid.name} onChange={(event) => updateBid(bid.id, { name: event.target.value })} placeholder="e.g. Alvarez Remodeling"/></label>
        <label>Quoted total<input value={bid.quoted} inputMode="decimal" onChange={(event) => updateBid(bid.id, { quoted: event.target.value })} placeholder="$14,000"/>{moneyInvalid(bid.quoted) && <span className="field-note">Enter a dollar amount, like $14,000.</span>}</label>
        <div className="bid-subhead"><b>Line items</b><span>What the bid prices, line by line.</span></div>
        {bid.items.map((item, itemIndex) => <div className="bid-row" key={item.id}><input value={item.label} onChange={(event) => updateBid(bid.id, { items: bid.items.map((row, i) => i === itemIndex ? { ...row, label: event.target.value } : row) })} placeholder="Labor, tile, framing…"/><input value={item.amount} inputMode="decimal" aria-label={`Amount for ${item.label || "line item"}`} onChange={(event) => updateBid(bid.id, { items: bid.items.map((row, i) => i === itemIndex ? { ...row, amount: event.target.value } : row) })} placeholder="$0.00"/><button type="button" aria-label="Remove line item" onClick={() => updateBid(bid.id, { items: bid.items.filter((_, i) => i !== itemIndex) })}>×</button></div>)}
        <button type="button" className="row-add" onClick={() => updateBid(bid.id, { items: [...bid.items, { id: newId(), label: "", amount: "" }] })}>+ Add line item</button>
        <div className="bid-subhead"><b>Allowances</b><span>What the bid allows vs what you expect the item to really cost. A low allowance is where cheap bids hide money.</span></div>
        {bid.allowances.map((row, rowIndex) => <div className="bid-row three" key={row.id}><input value={row.label} onChange={(event) => updateBid(bid.id, { allowances: bid.allowances.map((item, i) => i === rowIndex ? { ...item, label: event.target.value } : item) })} placeholder="Tile, fixtures…"/><input value={row.allowance} inputMode="decimal" aria-label={`Allowance for ${row.label || "item"}`} onChange={(event) => updateBid(bid.id, { allowances: bid.allowances.map((item, i) => i === rowIndex ? { ...item, allowance: event.target.value } : item) })} placeholder="Allowed"/><input value={row.expected} inputMode="decimal" aria-label={`Expected cost for ${row.label || "item"}`} onChange={(event) => updateBid(bid.id, { allowances: bid.allowances.map((item, i) => i === rowIndex ? { ...item, expected: event.target.value } : item) })} placeholder="Expect to pay"/><button type="button" aria-label="Remove allowance" onClick={() => updateBid(bid.id, { allowances: bid.allowances.filter((_, i) => i !== rowIndex) })}>×</button></div>)}
        <button type="button" className="row-add" onClick={() => updateBid(bid.id, { allowances: [...bid.allowances, { id: newId(), label: "", allowance: "", expected: "" }] })}>+ Add allowance</button>
        <div className="bid-subhead"><b>Exclusions</b><span>What the bid leaves out, and what you estimate it will cost to add back.</span></div>
        {bid.exclusions.map((row, rowIndex) => <div className="bid-row" key={row.id}><input value={row.label} onChange={(event) => updateBid(bid.id, { exclusions: bid.exclusions.map((item, i) => i === rowIndex ? { ...item, label: event.target.value } : item) })} placeholder="Permits, demo, haul-away…"/><input value={row.amount} inputMode="decimal" aria-label={`Estimated cost for ${row.label || "exclusion"}`} onChange={(event) => updateBid(bid.id, { exclusions: bid.exclusions.map((item, i) => i === rowIndex ? { ...item, amount: event.target.value } : item) })} placeholder="Est. cost"/><button type="button" aria-label="Remove exclusion" onClick={() => updateBid(bid.id, { exclusions: bid.exclusions.filter((_, i) => i !== rowIndex) })}>×</button></div>)}
        <button type="button" className="row-add" onClick={() => updateBid(bid.id, { exclusions: [...bid.exclusions, { id: newId(), label: "", amount: "" }] })}>+ Add exclusion</button>
        <div className="bid-row two"><label>Deposit requested<input value={bid.deposit} inputMode="decimal" onChange={(event) => updateBid(bid.id, { deposit: event.target.value })} placeholder="$0.00"/></label><label>Timeline (weeks)<input value={bid.weeks} inputMode="numeric" onChange={(event) => updateBid(bid.id, { weeks: event.target.value })} placeholder="e.g. 6"/></label></div>
      </article>)}
      {bids.length < MAX_BIDS && <button type="button" className="row-add" onClick={() => { setBids([...bids, blankBid()]); setCreated(false); }}>+ Add another bid</button>}
      <label>Must-haves and budget<textarea value={mustHaves} onChange={(event) => { setMustHaves(event.target.value); setCreated(false); }} placeholder="What the finished job must include, and your budget ceiling…"/></label>
      <label>Questions for each contractor<textarea value={questions} onChange={(event) => { setQuestions(event.target.value); setCreated(false); }} placeholder="What you still need to ask before deciding…"/></label>
      {invalidMoney && <p className="field-note">One or more amounts could not be read as dollars — those lines are left out of the totals until fixed.</p>}
      <button className="primary" disabled={!canCreate}>Compare my bids →</button></form>
      <aside className={created ? "created" : ""}><small>YOUR OUTCOME</small><h2>{created ? headline : "Your true-cost comparison appears here."}</h2>{created ? <><p className="result-summary">{summary}</p>
        {comparison.reveal && comparison.quotedCheapest && comparison.trueCheapest && <div className="reveal-box"><b>The lowest quote isn&apos;t the lowest price.</b><p>{comparison.quotedCheapest.name} looks cheapest at {formatCents(comparison.quotedCheapest.quotedCents ?? 0)}, but once allowances are repriced and exclusions added back it is {formatCents(comparison.quotedCheapest.trueCents ?? 0)} — and {comparison.trueCheapest.name} is the real low cost at {formatCents(comparison.trueCheapest.trueCents ?? 0)}.</p></div>}
        {comparison.priced.length > 0 && <div className="bid-compare-table"><div className="bid-compare-row labels"><span>Bid</span><span>Quoted</span><span>Allowances</span><span>Exclusions</span><span>True cost</span></div>{comparison.priced.map((bid) => <div className={`bid-compare-row${comparison.trueCheapest?.name === bid.name ? " cheapest" : ""}`} key={bid.name}><span>{bid.name}{comparison.trueCheapest?.name === bid.name ? " ★" : ""}</span><span>{formatCents(bid.quotedCents ?? 0)}</span><span>{bid.allowanceAdjustmentCents === 0 ? "—" : `${bid.allowanceAdjustmentCents > 0 ? "+" : ""}${formatCents(bid.allowanceAdjustmentCents)}`}</span><span>{bid.exclusionCents === 0 ? "—" : `+${formatCents(bid.exclusionCents)}`}</span><span>{bid.trueIsFloor ? "≥ " : ""}{formatCents(bid.trueCents ?? 0)}</span></div>)}</div>}
        {sections.map((section, index) => <article key={section.title}><b>{String(index + 1).padStart(2, "0")} · {section.title}</b>{section.intro && <p>{section.intro}</p>}<ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        {comparison.priced.length === 0 && <p>Add a quoted total for at least one bid to see its true cost.</p>}
        <div className="workspace-review"><b>Before you use it</b><p>{concept.guardrail}</p></div>
        {access === "unlocked" ? <><div className="rally-actions"><button onClick={downloadOutcome}>Download my outcome .md</button><button onClick={downloadPacket}>Download PDF packet</button><button onClick={downloadWorksheet}>Download bid worksheet .xlsx</button><button onClick={downloadCustomization}>Customize this Rally .md</button><button onClick={save}>Save to My Rallies</button></div>{saveStatus && <small>{saveStatus}</small>}</> : <div className="preview-lock"><small>WORKING PREVIEW COMPLETE</small><b>Paid access is not on sale yet.</b><p>This is a preview. For a complete plan you can download today, try one of the free Rallies.</p><a className="primary" href={`/discover/${concept.slug}`}>See the full listing →</a></div>}</> : <><p>Enter at least one bid with a quoted total. The comparison reprices allowances and adds exclusions back, so you see the real price — not the quoted one. Paid saving and downloads are not available yet.</p><a className="workspace-listing-link" href={`/discover/${concept.slug}`}>See the full listing →</a></>}</aside></section>
  </main>;
}
