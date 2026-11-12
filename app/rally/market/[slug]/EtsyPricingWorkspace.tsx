"use client";

import { useEffect, useMemo, useState } from "react";
import type { RallyConcept } from "../../../catalog";
import { downloadMarkdown, markdownCell, safeFileName } from "../../../download-markdown";
import { buildCustomizationKit } from "../../../customization-kit";
import { parseMoneyToCents, parseDecimal, formatCents, computeEtsyPricing, etsySections, etsyHeadline, ETSY_POLICY_FEES, type EtsyPricingInput } from "../../../etsy-pricing";

// Etsy Profit & Pricing Desk — pricing math from the seller's own costs.
// Part 4 (all-Rallies consumer audit, section 5): the promise was a price
// you can explain, but there was no arithmetic anywhere. This workspace
// computes the true unit cost, the take-home at the current price vs the
// recommended price, three price scenarios solved from the costs, and the
// break-even quantity. Fee assumptions are visible and editable, per the
// catalog guardrail; no rate or packaging cost is prefilled.

type CostRow = { id: string; label: string; amount: string };

const newId = () => crypto.randomUUID();

export default function EtsyPricingWorkspace({ concept }: { concept: RallyConcept }) {
  const [productName, setProductName] = useState("");
  const [materials, setMaterials] = useState<CostRow[]>([{ id: newId(), label: "", amount: "" }]);
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");
  const [packaging, setPackaging] = useState("");
  const [otherCosts, setOtherCosts] = useState<CostRow[]>([]);
  const [shippingCost, setShippingCost] = useState("");
  const [shippingCharged, setShippingCharged] = useState("");
  const [freeShipping, setFreeShipping] = useState(true);
  const [currentPrice, setCurrentPrice] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [monthlyFixed, setMonthlyFixed] = useState("");
  const [transactionPct, setTransactionPct] = useState(String(ETSY_POLICY_FEES.transactionPct));
  const [paymentPct, setPaymentPct] = useState(String(ETSY_POLICY_FEES.paymentPct));
  const [adsPct, setAdsPct] = useState("0");
  const [created, setCreated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [access, setAccess] = useState<"checking" | "preview" | "unlocked">("checking");

  const input: EtsyPricingInput = useMemo(() => ({
    productName,
    materials: materials.map((row) => ({ label: row.label, cents: parseMoneyToCents(row.amount) })),
    laborHours: parseDecimal(laborHours),
    laborRateCents: parseMoneyToCents(laborRate),
    packagingCents: parseMoneyToCents(packaging),
    otherCosts: otherCosts.map((row) => ({ label: row.label, cents: parseMoneyToCents(row.amount) })),
    shippingCostCents: parseMoneyToCents(shippingCost),
    shippingChargedCents: freeShipping ? 0 : parseMoneyToCents(shippingCharged),
    currentPriceCents: parseMoneyToCents(currentPrice),
    targetMarginPct: parseDecimal(targetMargin),
    monthlyFixedCents: parseMoneyToCents(monthlyFixed),
    fees: { ...ETSY_POLICY_FEES, transactionPct: parseDecimal(transactionPct) ?? ETSY_POLICY_FEES.transactionPct, paymentPct: parseDecimal(paymentPct) ?? ETSY_POLICY_FEES.paymentPct, adsPct: parseDecimal(adsPct) ?? 0 },
  }), [productName, materials, laborHours, laborRate, packaging, otherCosts, shippingCost, shippingCharged, freeShipping, currentPrice, targetMargin, monthlyFixed, transactionPct, paymentPct, adsPct]);

  const computed = useMemo(() => computeEtsyPricing(input), [input]);
  const sections = useMemo(() => etsySections(input), [input]);
  const { headline, summary } = useMemo(() => etsyHeadline(input), [input]);
  const canCreate = Boolean(computed.unitCostCents > 0 || input.currentPriceCents !== null || productName.trim());

  useEffect(() => {
    fetch(`/api/rally-access?slug=${encodeURIComponent(concept.slug)}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setAccess(data?.unlocked ? "unlocked" : "preview"))
      .catch(() => setAccess("preview"));
  }, [concept.slug]);

  function touch() { setCreated(false); }

  async function save() {
    setSaveStatus("Saving…");
    const summaryText = `${headline}${productName.trim() ? ` for ${productName.trim()}` : ""}.`;
    const response = await fetch("/api/rallies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: `catalog:${concept.slug}`, title: concept.title, inputs: input, summary: summaryText }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaveStatus(response.ok ? "Saved to My Rallies" : data.error ?? "Could not save this workspace.");
  }

  function downloadOutcome() {
    const markdown = `# ${headline}\n\n> ${summary}\n\n## What I brought\n\nProduct: ${productName.trim() ? markdownCell(productName) : "not named yet"}. True unit cost: ${formatCents(computed.unitCostCents)} (materials ${formatCents(computed.materialsCents)}, labor ${computed.laborCents !== null ? formatCents(computed.laborCents) : "not entered"}, packaging ${formatCents(computed.packagingCents)}). Current price: ${input.currentPriceCents !== null ? formatCents(input.currentPriceCents) : "not entered"}. Target margin: ${input.targetMarginPct !== null ? `${input.targetMarginPct}%` : "not entered"}.\n\n${sections.map((section) => `## ${section.title}\n\n${section.intro ? `${section.intro}\n\n` : ""}${section.items.map((item) => `- ${markdownCell(item)}`).join("\n")}`).join("\n\n")}\n\n## Before using it\n\n${concept.guardrail}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}\n`;
    downloadMarkdown(`${safeFileName(concept.title)}-outcome.md`, markdown);
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({ title: concept.title, promise: concept.promise, audience: concept.forWhom, inputs: concept.inputs, outputs: concept.outcome, guardrail: concept.guardrail, currentAnswers: { "Product": productName, "Materials and labor": materials.map((row) => row.label).filter(Boolean).join("; "), "Packaging and shipping": packaging, "Fees and margin": targetMargin } });
    downloadMarkdown(`${safeFileName(concept.title)}-customization-kit.md`, markdown);
  }

  return <main className={`market-workspace concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={`/discover/${concept.slug}`}>Full listing</a><a href="/library">My Rallies</a></div></nav>
    <header><small>WORKING RALLY · {concept.category.toUpperCase()} · {access === "unlocked" ? "PURCHASED" : "PREVIEW"}</small><h1>{concept.title}</h1><p>{concept.promise}</p>{access === "unlocked" ? <button className="customization-download" onClick={downloadCustomization}>Download customization prompts .md</button> : <a className="customization-download" href={`/discover/${concept.slug}`}>See the preview details →</a>}</header>
    <section className="market-workspace-grid"><form onSubmit={(event) => { event.preventDefault(); setCreated(true); }}><small>BRING YOUR REAL COSTS</small><h2>A price you can explain.</h2><p className="etsy-note">Type in what a sale really costs you — materials, your time, packaging, shipping — and see what you actually keep after Etsy's cut, and what price covers it.</p>
      <label className="etsy-top-field">Product<input value={productName} onChange={(event) => { setProductName(event.target.value); touch(); }} placeholder="What are you pricing?"/></label>
      <article className="etsy-card"><div className="etsy-subhead"><b>Materials, per unit</b></div>
        {materials.map((row, index) => <div className="etsy-row" key={row.id}><input value={row.label} onChange={(event) => { setMaterials(materials.map((item, i) => i === index ? { ...item, label: event.target.value } : item)); touch(); }} placeholder="Clay, yarn, beads…"/><input value={row.amount} inputMode="decimal" onChange={(event) => { setMaterials(materials.map((item, i) => i === index ? { ...item, amount: event.target.value } : item)); touch(); }} placeholder="$0.00"/><button type="button" aria-label="Remove material" onClick={() => { setMaterials(materials.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="etsy-add" onClick={() => { setMaterials([...materials, { id: newId(), label: "", amount: "" }]); touch(); }}>+ Add material</button></article>
      <article className="etsy-card"><div className="etsy-subhead"><b>Labor, per unit</b><span>Hours × your hourly rate. Pricing your time at zero is the #1 way sellers lose money — if you skip this, the desk will say so.</span></div>
        <div className="etsy-row two"><label>Hours per unit<input value={laborHours} inputMode="decimal" onChange={(event) => { setLaborHours(event.target.value); touch(); }} placeholder="e.g. 0.5"/></label><label>Your hourly rate<input value={laborRate} inputMode="decimal" onChange={(event) => { setLaborRate(event.target.value); touch(); }} placeholder="$ per hour"/></label></div>
        {computed.laborCents !== null && computed.laborCents > 0 && <p className="etsy-note">Labor per unit: {formatCents(computed.laborCents)}.</p>}</article>
      <article className="etsy-card"><div className="etsy-subhead"><b>Packaging, shipping, and other costs</b></div>
        <div className="etsy-row two"><label>Packaging, per unit<input value={packaging} inputMode="decimal" onChange={(event) => { setPackaging(event.target.value); touch(); }} placeholder="$0.00"/></label><label>Shipping cost, per order<input value={shippingCost} inputMode="decimal" onChange={(event) => { setShippingCost(event.target.value); touch(); }} placeholder="$0.00"/></label></div>
        <label className="etsy-check"><input type="checkbox" checked={freeShipping} onChange={(event) => { setFreeShipping(event.target.checked); touch(); }}/> Free shipping — the buyer pays no shipping, so the cost comes out of your margin</label>
        {!freeShipping && <label>Shipping charged to the buyer<input value={shippingCharged} inputMode="decimal" onChange={(event) => { setShippingCharged(event.target.value); touch(); }} placeholder="$0.00"/></label>}
        {!freeShipping && <p className="etsy-note">Etsy charges the 6.5% transaction fee on shipping charged, too.</p>}
        {otherCosts.map((row, index) => <div className="etsy-row" key={row.id}><input value={row.label} onChange={(event) => { setOtherCosts(otherCosts.map((item, i) => i === index ? { ...item, label: event.target.value } : item)); touch(); }} placeholder="Spoilage, rework, fees…"/><input value={row.amount} inputMode="decimal" onChange={(event) => { setOtherCosts(otherCosts.map((item, i) => i === index ? { ...item, amount: event.target.value } : item)); touch(); }} placeholder="$0.00"/><button type="button" aria-label="Remove cost" onClick={() => { setOtherCosts(otherCosts.filter((_, i) => i !== index)); touch(); }}>×</button></div>)}
        <button type="button" className="etsy-add" onClick={() => { setOtherCosts([...otherCosts, { id: newId(), label: "", amount: "" }]); touch(); }}>+ Add other per-unit cost</button></article>
      <article className="etsy-card"><div className="etsy-subhead"><b>Your price and margin</b></div>
        <div className="etsy-row two"><label>Current listing price<input value={currentPrice} inputMode="decimal" onChange={(event) => { setCurrentPrice(event.target.value); touch(); }} placeholder="$24.00"/></label><label>Target margin (%)<input value={targetMargin} inputMode="decimal" onChange={(event) => { setTargetMargin(event.target.value); touch(); }} placeholder="e.g. 30"/></label></div>
        <label>Monthly fixed costs (for break-even)<input value={monthlyFixed} inputMode="decimal" onChange={(event) => { setMonthlyFixed(event.target.value); touch(); }} placeholder="Rent, subscriptions, supplies…"/></label></article>
      <article className="etsy-card"><div className="etsy-subhead"><b>Fee assumptions</b><span>From Etsy's published policy — edit them if the policy changes, and recheck the live policy before publishing. Tax is not modeled here.</span></div>
        <div className="etsy-row three"><label>Transaction %<input value={transactionPct} inputMode="decimal" onChange={(event) => { setTransactionPct(event.target.value); touch(); }}/></label><label>Payment %<input value={paymentPct} inputMode="decimal" onChange={(event) => { setPaymentPct(event.target.value); touch(); }}/></label><label>Offsite Ads %<select value={adsPct} onChange={(event) => { setAdsPct(event.target.value); touch(); }}><option value="0">None</option><option value="15">15% (under $10k/yr)</option><option value="12">12% (over $10k/yr)</option></select></label></div>
        <p className="etsy-note">Fixed fees: $0.20 listing + $0.25 payment processing per sale.</p></article>
      <button className="primary" disabled={!canCreate}>Price my product →</button></form>
      <aside className={created ? "created" : ""}><small>YOUR OUTCOME</small><h2>{created ? headline : "Your pricing desk appears here."}</h2>{created ? <><p className="result-summary">{summary}</p>
        {computed.laborIsZero && computed.unitCostCents > 0 && <div className="etsy-flag"><b>Labor is $0.</b><p>Most sellers price their time at exactly zero — and that is how a price that looks fine quietly loses money. Add your hours and rate above.</p></div>}
        {computed.currentNetCents !== null && input.currentPriceCents !== null && computed.targetNetCents !== null && computed.targetPriceCents !== null && <div className="etsy-reveal"><b>The reveal</b><p>Your {formatCents(input.currentPriceCents)} listing nets you {formatCents(computed.currentNetCents)} per sale. At {formatCents(computed.targetPriceCents)} it nets {formatCents(computed.targetNetCents)}.</p></div>}
        {(computed.floorPriceCents !== null || computed.targetPriceCents !== null || computed.premiumPriceCents !== null) && <div className="etsy-table"><div className="etsy-table-row labels"><span>Scenario</span><span>Price</span><span>You keep</span></div>
          {computed.floorPriceCents !== null && <div className="etsy-table-row"><span>Floor · covers costs, no profit</span><span>{formatCents(computed.floorPriceCents)}</span><span>~$0.00</span></div>}
          {computed.targetPriceCents !== null && computed.targetNetCents !== null && <div className="etsy-table-row best"><span>Target · your {input.targetMarginPct}% margin</span><span>{formatCents(computed.targetPriceCents)}</span><span>{formatCents(computed.targetNetCents)}</span></div>}
          {computed.premiumPriceCents !== null && <div className="etsy-table-row"><span>Premium · margin holds under 15% ads</span><span>{formatCents(computed.premiumPriceCents)}</span><span>—</span></div>}
        </div>}
        {sections.map((section, index) => <article key={section.title}><b>{String(index + 1).padStart(2, "0")} · {section.title}</b>{section.intro && <p>{section.intro}</p>}<ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        <div className="workspace-review"><b>Before you use it</b><p>{concept.guardrail}</p></div>
        {access === "unlocked" ? <><div className="rally-actions"><button onClick={downloadOutcome}>Download my outcome .md</button><button onClick={downloadCustomization}>Customize this Rally .md</button><button onClick={save}>Save to My Rallies</button></div>{saveStatus && <small>{saveStatus}</small>}</> : <div className="preview-lock"><small>WORKING PREVIEW COMPLETE</small><b>Paid access is not on sale yet.</b><p>This is a preview. For a complete plan you can download today, try one of the free Rallies.</p><a className="primary" href={`/discover/${concept.slug}`}>See the full listing →</a></div>}</> : <><p>Add materials and labor to see the true unit cost — then the price that covers it. Paid saving and downloads are not available yet.</p><a className="workspace-listing-link" href={`/discover/${concept.slug}`}>See the full listing →</a></>}</aside></section>
  </main>;
}
