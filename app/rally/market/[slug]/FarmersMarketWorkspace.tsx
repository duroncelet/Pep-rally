"use client";

import { useEffect, useMemo, useState } from "react";
import type { RallyConcept } from "../../../catalog";
import { downloadMarkdown, markdownCell, safeFileName } from "../../../download-markdown";
import { buildCustomizationKit } from "../../../customization-kit";
import { parseMoneyToCents, parseWholeNumber, formatCents, formatTimeMinutes, computeFarmersBoard, farmersSections, farmersHeadline, PACK_LIST, WEATHER_GEAR, type FarmersMarketInput, type MarketCondition } from "../../../farmers-market-board";

// Farmers Market Morning Board — the printable board, from the vendor's inputs.
// Part 4 (all-Rallies consumer audit, section 8): the quantity call, learned
// from the vendor's own last week, on one printable page. The board is built
// for 5am, outdoors, dirty hands: big checkboxes, one page, nothing to tap.

type CropRow = { id: string; crop: string; unit: string; brought: string; sold: string; buffer: string; price: string };
type PreorderRow = { id: string; label: string; crop: string; qty: string };
type ZoneRow = { id: string; zone: string; items: string };

const newId = () => crypto.randomUUID();
const CONDITIONS: { key: MarketCondition; label: string }[] = [
  { key: "rain", label: "Rain" },
  { key: "wind", label: "Wind" },
  { key: "heat", label: "Heat" },
  { key: "cold", label: "Cold" },
];

export default function FarmersMarketWorkspace({ concept }: { concept: RallyConcept }) {
  const [marketDate, setMarketDate] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [setupMinutes, setSetupMinutes] = useState("");
  const [loadMinutes, setLoadMinutes] = useState("");
  const [conditions, setConditions] = useState<MarketCondition[]>([]);
  const [crops, setCrops] = useState<CropRow[]>([{ id: newId(), crop: "", unit: "", brought: "", sold: "", buffer: "", price: "" }]);
  const [preorders, setPreorders] = useState<PreorderRow[]>([]);
  const [standZones, setStandZones] = useState<ZoneRow[]>([]);
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [customPackItems, setCustomPackItems] = useState<string[]>([""]);
  const [created, setCreated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [access, setAccess] = useState<"checking" | "preview" | "unlocked">("checking");

  const input: FarmersMarketInput = useMemo(() => ({
    marketDate, openTime,
    setupMinutes: parseWholeNumber(setupMinutes),
    loadMinutes: parseWholeNumber(loadMinutes),
    conditions,
    crops: crops.map((row) => ({ crop: row.crop, unit: row.unit, broughtLastWeek: parseWholeNumber(row.brought), soldLastWeek: parseWholeNumber(row.sold), extraBuffer: parseWholeNumber(row.buffer), priceCents: parseMoneyToCents(row.price) })),
    preorders: preorders.map((row) => ({ label: row.label, crop: row.crop, qty: parseWholeNumber(row.qty) })),
    standZones: standZones.map(({ zone, items }) => ({ zone, items })),
    packedItems,
    customPackItems: customPackItems.filter((item) => item.trim()),
  }), [marketDate, openTime, setupMinutes, loadMinutes, conditions, crops, preorders, standZones, packedItems, customPackItems]);

  const computed = useMemo(() => computeFarmersBoard(input), [input]);
  const sections = useMemo(() => farmersSections(input), [input]);
  const { headline, summary } = useMemo(() => farmersHeadline(input), [input]);
  const canCreate = Boolean(crops.some((row) => row.crop.trim()) || marketDate.trim());
  const cropNames = useMemo(() => crops.map((row) => row.crop.trim()).filter(Boolean), [crops]);

  useEffect(() => {
    fetch(`/api/rally-access?slug=${encodeURIComponent(concept.slug)}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setAccess(data?.unlocked ? "unlocked" : "preview"))
      .catch(() => setAccess("preview"));
  }, [concept.slug]);

  function touch() { setCreated(false); }

  async function save() {
    setSaveStatus("Saving…");
    const summaryText = `${headline}${marketDate ? ` for ${marketDate}` : ""}.`;
    const response = await fetch("/api/rallies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: `catalog:${concept.slug}`, title: concept.title, inputs: input, summary: summaryText }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaveStatus(response.ok ? "Saved to My Rallies" : data.error ?? "Could not save this workspace.");
  }

  function downloadOutcome() {
    const markdown = `# ${headline}\n\n> ${summary}\n\n${sections.map((section) => `## ${section.title}\n\n${section.intro ? `${section.intro}\n\n` : ""}${section.items.map((item) => `- ${markdownCell(item)}`).join("\n")}`).join("\n\n")}\n\n## Before using it\n\n${concept.guardrail}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}\n`;
    downloadMarkdown(`${safeFileName(concept.title)}-outcome.md`, markdown);
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({ title: concept.title, promise: concept.promise, audience: concept.forWhom, inputs: concept.inputs, outputs: concept.outcome, guardrail: concept.guardrail, currentAnswers: { "Harvest-ready crops": cropNames.join("; "), "Preorders and inventory": preorders.map((row) => row.label).filter(Boolean).join("; "), "Market location and forecast": marketDate } });
    downloadMarkdown(`${safeFileName(concept.title)}-customization-kit.md`, markdown);
  }

  return <main className={`market-workspace concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={`/discover/${concept.slug}`}>Full listing</a><a href="/library">My Rallies</a></div></nav>
    <header><small>WORKING RALLY · {concept.category.toUpperCase()} · {access === "unlocked" ? "PURCHASED" : "PREVIEW"}</small><h1>{concept.title}</h1><p>{concept.promise}</p>{access === "unlocked" ? <button className="customization-download" onClick={downloadCustomization}>Download customization prompts .md</button> : <a className="customization-download" href={`/discover/${concept.slug}`}>See the preview details →</a>}</header>
    <section className="market-workspace-grid"><form onSubmit={(event) => { event.preventDefault(); setCreated(true); }}><small>BRING LAST WEEK'S TALLY</small><h2>This Saturday, pick the right amount.</h2><p className="fm-note">The board learns from your own last week — what you brought, what sold, what came home. No formula decides for you: last week's sold, plus a buffer you choose.</p>
      <article className="fm-card"><div className="fm-subhead"><b>Market day</b></div>
        <div className="fm-row two"><label>Market date<input type="date" value={marketDate} onChange={(event) => { setMarketDate(event.target.value); touch(); }}/></label><label>Market opens<input type="time" value={openTime} onChange={(event) => { setOpenTime(event.target.value); touch(); }}/></label></div>
        <div className="fm-row two"><label>Setup minutes<input value={setupMinutes} inputMode="numeric" onChange={(event) => { setSetupMinutes(event.target.value); touch(); }} placeholder="e.g. 60"/></label><label>Load-out minutes<input value={loadMinutes} inputMode="numeric" onChange={(event) => { setLoadMinutes(event.target.value); touch(); }} placeholder="e.g. 45"/></label></div>
        {computed.startLoading && <p className="fm-note">Start loading at {computed.startLoading} to arrive by {computed.arriveBy}.</p>}
        <div className="fm-subhead"><b>Expected conditions</b><span>It will storm at a market — plan for it before leaving home.</span></div>
        <div className="fm-conditions">{CONDITIONS.map(({ key, label }) => <label key={key}><input type="checkbox" checked={conditions.includes(key)} onChange={(event) => { setConditions(event.target.checked ? [...conditions, key] : conditions.filter((item) => item !== key)); touch(); }}/> {label}</label>)}</div></article>
      <article className="fm-card"><div className="fm-subhead"><b>Harvest — last week's tally per crop</b><span>Brought and sold last week set this week's number. Add a buffer if you want more than what sold.</span></div>
        <div className="fm-row labels"><span>Crop</span><span>Unit</span><span>Brought</span><span>Sold</span><span>Buffer</span><span>Price</span><span></span></div>
        {crops.map((row, index) => <div className="fm-row crop" key={row.id}><input value={row.crop} onChange={(event) => { setCrops(crops.map((item, i) => i === index ? { ...item, crop: event.target.value } : item)); touch(); }} placeholder="Kale"/><input value={row.unit} onChange={(event) => { setCrops(crops.map((item, i) => i === index ? { ...item, unit: event.target.value } : item)); touch(); }} placeholder="bunches"/><input value={row.brought} inputMode="numeric" onChange={(event) => { setCrops(crops.map((item, i) => i === index ? { ...item, brought: event.target.value } : item)); touch(); }} placeholder="60"/><input value={row.sold} inputMode="numeric" onChange={(event) => { setCrops(crops.map((item, i) => i === index ? { ...item, sold: event.target.value } : item)); touch(); }} placeholder="40"/><input value={row.buffer} inputMode="numeric" onChange={(event) => { setCrops(crops.map((item, i) => i === index ? { ...item, buffer: event.target.value } : item)); touch(); }} placeholder="0"/><input value={row.price} inputMode="decimal" onChange={(event) => { setCrops(crops.map((item, i) => i === index ? { ...item, price: event.target.value } : item)); touch(); }} placeholder="$4.00"/><button type="button" aria-label="Remove crop" onClick={() => { setCrops(crops.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="fm-add" onClick={() => { setCrops([...crops, { id: newId(), crop: "", unit: "", brought: "", sold: "", buffer: "", price: "" }]); touch(); }}>+ Add crop</button></article>
      <article className="fm-card"><div className="fm-subhead"><b>Preorders</b><span>Each order reconciles against the harvest — covered, or short by a number.</span></div>
        {preorders.map((row, index) => <div className="fm-row three" key={row.id}><input value={row.label} onChange={(event) => { setPreorders(preorders.map((item, i) => i === index ? { ...item, label: event.target.value } : item)); touch(); }} placeholder="Who is it for?"/><select value={row.crop} onChange={(event) => { setPreorders(preorders.map((item, i) => i === index ? { ...item, crop: event.target.value } : item)); touch(); }}><option value="">Crop…</option>{cropNames.map((name) => <option key={name} value={name}>{name}</option>)}</select><input value={row.qty} inputMode="numeric" onChange={(event) => { setPreorders(preorders.map((item, i) => i === index ? { ...item, qty: event.target.value } : item)); touch(); }} placeholder="Qty"/><button type="button" aria-label="Remove preorder" onClick={() => { setPreorders(preorders.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="fm-add" onClick={() => { setPreorders([...preorders, { id: newId(), label: "", crop: "", qty: "" }]); touch(); }}>+ Add preorder</button></article>
      <article className="fm-card"><div className="fm-subhead"><b>Stand plan</b><span>What goes where, so setup is a checklist and not a decision at 7am.</span></div>
        {standZones.map((row, index) => <div className="fm-row" key={row.id}><input value={row.zone} onChange={(event) => { setStandZones(standZones.map((item, i) => i === index ? { ...item, zone: event.target.value } : item)); touch(); }} placeholder="Table 1, back table…"/><input value={row.items} onChange={(event) => { setStandZones(standZones.map((item, i) => i === index ? { ...item, items: event.target.value } : item)); touch(); }} placeholder="What's on it"/><button type="button" aria-label="Remove zone" onClick={() => { setStandZones(standZones.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="fm-add" onClick={() => { setStandZones([...standZones, { id: newId(), zone: "", items: "" }]); touch(); }}>+ Add stand zone</button></article>
      <article className="fm-card"><div className="fm-subhead"><b>Pack checklist</b><span>The morning fails on the one forgotten thing. Check each item as it goes in the truck.</span></div>
        <div className="fm-pack">{PACK_LIST.map((item) => <label key={item}><input type="checkbox" checked={packedItems.includes(item)} onChange={(event) => { setPackedItems(event.target.checked ? [...packedItems, item] : packedItems.filter((entry) => entry !== item)); touch(); }}/> {item}</label>)}</div>
        {conditions.map((condition) => <p className="fm-note" key={condition}>{WEATHER_GEAR[condition].label}: {WEATHER_GEAR[condition].gear.join(", ")}.</p>)}
        {customPackItems.map((item, index) => <div className="fm-row single" key={index}><input value={item} onChange={(event) => { setCustomPackItems(customPackItems.map((entry, i) => i === index ? event.target.value : entry)); touch(); }} placeholder="Anything else to pack"/><button type="button" aria-label="Remove pack item" onClick={() => { setCustomPackItems(customPackItems.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="fm-add" onClick={() => { setCustomPackItems([...customPackItems, ""]); touch(); }}>+ Add pack item</button></article>
      <button className="primary" disabled={!canCreate}>Build my morning board →</button></form>
      <aside className={created ? "created" : ""}><small>YOUR OUTCOME</small><h2>{created ? headline : "Your morning board appears here."}</h2>{created ? <><p className="result-summary">{summary}</p>
        {computed.crops.length > 0 && <div className="fm-board"><b>Morning board{marketDate ? ` — ${marketDate}` : ""}</b>
          {computed.startLoading && <p>Load at {computed.startLoading} · arrive {computed.arriveBy}{openTime ? ` · open ${formatTimeMinutes(Number(openTime.slice(0, 2)) * 60 + Number(openTime.slice(3)))}` : ""}</p>}
          <div className="fm-board-table"><div className="fm-board-row labels"><span>Pick</span><span>Crop</span><span>Last week</span><span>Preorders</span></div>{computed.crops.map((crop) => <div className="fm-board-row" key={crop.crop}><span>{crop.suggested !== null ? `${crop.suggested} ${crop.unit}` : "—"}</span><span>{crop.crop}</span><span>{crop.soldLastWeek !== null && crop.broughtLastWeek !== null ? `sold ${crop.soldLastWeek}/${crop.broughtLastWeek}` : "—"}</span><span>{crop.preorderedQty > 0 ? `${crop.preorderedQty} ${crop.unit}${crop.covered ? " ✓" : ` — short ${crop.shortBy}`}` : "—"}</span></div>)}</div>
          {computed.packMissing.length > 0 && <p className="fm-board-alert">Still to pack: {computed.packMissing.join(", ")}.</p>}
          {computed.totalPreorderRevenueCents > 0 && <p>Preorders on the books: {formatCents(computed.totalPreorderRevenueCents)}.</p>}
        </div>}
        {sections.map((section, index) => <article key={section.title}><b>{String(index + 1).padStart(2, "0")} · {section.title}</b>{section.intro && <p>{section.intro}</p>}<ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        <div className="workspace-review"><b>Before you use it</b><p>{concept.guardrail}</p></div>
        {access === "unlocked" ? <><div className="rally-actions"><button onClick={downloadOutcome}>Download my outcome .md</button><button onClick={downloadCustomization}>Customize this Rally .md</button><button onClick={save}>Save to My Rallies</button></div>{saveStatus && <small>{saveStatus}</small>}</> : <div className="preview-lock"><small>WORKING PREVIEW COMPLETE</small><b>Paid access is not on sale yet.</b><p>This is a preview. For a complete plan you can download today, try one of the free Rallies.</p><a className="primary" href={`/discover/${concept.slug}`}>See the full listing →</a></div>}</> : <><p>Add a crop with last week's tally to build the board. Paid saving and downloads are not available yet.</p><a className="workspace-listing-link" href={`/discover/${concept.slug}`}>See the full listing →</a></>}</aside></section>
  </main>;
}
