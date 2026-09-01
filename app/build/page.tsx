"use client";

import { useEffect, useMemo, useState } from "react";

type MakerApp = { id: string; name: string; outcome: string; stage: string; sourceType: string; sourceUrl: string | null; accessModel: string; priceCents: number };

const addOns = [
  { id: "payments", name: "Take payments", examples: "Stripe or PayPal checkout, receipts, and access after purchase", status: "Connect an account", group: "Sell it" },
  { id: "group-money", name: "Collect group money", examples: "Payment-request links, balances, reminders, and reconciliation", status: "Available in builds", group: "Sell it" },
  { id: "email", name: "Send email", examples: "Invites, reminders, results, receipts, and updates", status: "Connect an account", group: "Communicate" },
  { id: "sms", name: "Send text messages", examples: "Time-sensitive reminders and group updates", status: "Connect an account", group: "Communicate" },
  { id: "chat", name: "Add a shared chat", examples: "A conversation that stays beside the plan", status: "Available in builds", group: "Communicate" },
  { id: "calendar", name: "Use calendars", examples: "Deadlines, schedules, reminders, and calendar exports", status: "Available in builds", group: "Communicate" },
  { id: "weather", name: "Use live weather", examples: "Forecast-aware recommendations and changing plans", status: "Available in builds", group: "Live information" },
  { id: "maps", name: "Use maps and places", examples: "Location search, directions, venue lists, and booking handoffs", status: "Available in builds", group: "Live information" },
  { id: "reservations", name: "Book reservations", examples: "Live availability and booking inside the experience", status: "Available by request", group: "Live information" },
  { id: "files", name: "Accept files", examples: "Guides, spreadsheets, photos, PDFs, and source material", status: "Available in builds", group: "Build the result" },
  { id: "ai", name: "Add AI", examples: "Personalized plans, summaries, practice, and recommendations", status: "Usage credits apply", group: "Build the result" },
  { id: "exports", name: "Create takeaways", examples: "PDFs, printables, calendars, CSVs, and share links", status: "Available in builds", group: "Build the result" },
];

export default function BuildPage() {
  const [entryMode, setEntryMode] = useState<"build" | "bring">("build");
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [buyer, setBuyer] = useState("");
  const [problem, setProblem] = useState("");
  const [outcome, setOutcome] = useState("");
  const [proof, setProof] = useState("");
  const [questions, setQuestions] = useState("");
  const [steps, setSteps] = useState("");
  const [result, setResult] = useState("");
  const [selected, setSelected] = useState<string[]>(["files", "exports"]);
  const [price, setPrice] = useState(18);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [sourceType, setSourceType] = useState<"live" | "code">("live");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFileKey, setSourceFileKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sourceStatus, setSourceStatus] = useState("");
  const [apps, setApps] = useState<MakerApp[]>([]);

  const chosen = addOns.filter((item) => selected.includes(item.id));
  const groups = useMemo(() => [...new Set(addOns.map((item) => item.group))], []);
  const sourceReady = entryMode === "build" || sourceType === "live" ? entryMode === "build" || /^https:\/\//i.test(sourceUrl.trim()) : Boolean(sourceFileKey);
  const canContinue = step === 1 ? name.trim() && buyer.trim() && problem.trim() && outcome.trim() && proof.trim() && sourceReady : step === 2 ? questions.trim() && steps.trim() && result.trim() : true;

  useEffect(() => { refreshApps(); }, []);

  async function refreshApps() {
    const response = await fetch("/api/creator-apps");
    const data = await response.json();
    if (response.ok) setApps(data.apps ?? []);
  }

  async function uploadSource(file: File | null) {
    if (!file) return;
    setUploading(true); setSourceStatus("");
    const form = new FormData(); form.set("source", file);
    const response = await fetch("/api/creator-source", { method: "POST", body: form });
    const data = await response.json();
    setUploading(false);
    if (response.ok) { setSourceFileKey(data.key); setSourceStatus(`${data.name} uploaded securely ✓`); }
    else setSourceStatus(data.error ?? "The upload could not be saved.");
  }

  async function changeListing(id: string, action: "publish" | "unpublish") {
    const response = await fetch("/api/creator-apps", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action }) });
    const data = await response.json();
    setStatus(response.ok ? action === "publish" ? "Your Rally is live in the marketplace ✓" : "Your Rally is off the marketplace." : data.error ?? "The listing could not be updated.");
    if (response.ok) await refreshApps();
  }

  async function saveBuild() {
    setSaving(true); setStatus("");
    const builderSpec = [`Buyer: ${buyer}`, `Questions: ${questions}`, `Steps: ${steps}`, `Finished result: ${result}`, `Launch pieces: ${chosen.map((item) => item.name).join(", ")}`].join("\n\n");
    const finalSourceType = entryMode === "build" ? "guided" : sourceType;
    const response = await fetch("/api/creator-apps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, problem, outcome, proof, accessModel: price > 0 ? "paid" : "free", price, sourceType: finalSourceType, sourceUrl: finalSourceType === "live" ? sourceUrl : undefined, sourceFileKey: finalSourceType === "code" ? sourceFileKey : undefined, builderSpec: finalSourceType === "guided" ? builderSpec : undefined }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaving(false);
    if (response.ok) { setStatus(entryMode === "bring" && sourceType === "live" ? "Your Rally is saved. Publish it below when the listing looks right." : "Your build is saved in your studio. The next step is a private working version."); setStep(4); await refreshApps(); }
    else setStatus(data.error ?? "Your build could not be saved.");
  }

  return <main className="build-page">
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div className="build-progress"><span className={step >= 1 ? "active" : ""}>Idea</span><i>→</i><span className={step >= 2 ? "active" : ""}>Experience</span><i>→</i><span className={step >= 3 ? "active" : ""}>Launch pieces</span><i>→</i><span className={step >= 4 ? "active" : ""}>List it</span></div><div className="build-nav-actions"><a href="#my-rallies">My studio</a><a href="/">Back to shop</a></div></nav>
    <header className="build-header"><div><small>MAKE A RALLY</small><h1>Build it here.<br/><em>Or bring what you made.</em></h1><p>Turn an everyday solution into a polished listing and a mini-app people can open, use, and buy.</p></div><div className="included-card"><small>EVERY RALLY GETS</small><span>✓ A marketplace listing</span><span>✓ Free or paid access</span><span>✓ A hosted test path</span><span>✓ Customer feedback and reviews</span><span>✓ Saved buyer access</span></div></header>

    <section className="build-entry-choice"><button className={entryMode === "build" ? "active" : ""} onClick={() => { setEntryMode("build"); setStep(1); }}><small>START WITH AN IDEA</small><b>Build inside Pep Rally</b><span>Shape the outcome, customer experience, and tools from scratch.</span></button><button className={entryMode === "bring" ? "active" : ""} onClick={() => { setEntryMode("bring"); setStep(1); }}><small>ALREADY MADE SOMETHING?</small><b>Upload or link your mini-app</b><span>Bring a live site or upload the project you want to launch.</span></button></section>

    <section className="build-workbench">
      <div className="build-form">
        {step === 1 && <div className="build-step"><small>STEP 1 OF 4 · {entryMode === "build" ? "BUILD HERE" : "BRING YOUR APP"}</small><h2>What should someone be able to do?</h2><p>Describe the result in everyday language. This becomes the promise on your listing.</p><label>Name your Rally<input value={name} onChange={(event) => setName(event.target.value)} placeholder="The Sunday Dinner Planner"/></label><label>Who is it for?<input value={buyer} onChange={(event) => setBuyer(event.target.value)} placeholder="Busy families who still want to cook together"/></label><label>What is frustrating today?<textarea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="They have recipes and group texts, but no shared plan…"/></label><label>What should they have when they’re done?<textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="A chosen menu, shopping list, assignments, timing, and reminders"/></label><label>Why are you the person who made this?<textarea value={proof} onChange={(event) => setProof(event.target.value)} placeholder="I use this process every week with…"/></label>{entryMode === "bring" && <div className="source-picker"><small>BRING THE WORKING VERSION</small><div><button type="button" className={sourceType === "live" ? "selected" : ""} onClick={() => setSourceType("live")}><b>Link a live mini-app</b><span>Use a secure public preview or production URL.</span></button><button type="button" className={sourceType === "code" ? "selected" : ""} onClick={() => setSourceType("code")}><b>Upload the project</b><span>Send the files for a private hosting review.</span></button></div>{sourceType === "live" ? <label>Working https:// link<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://my-useful-app.com"/></label> : <label className="source-upload">{uploading ? "Uploading…" : sourceFileKey ? "Project uploaded ✓" : "Choose a ZIP project file"}<input type="file" accept=".zip,.txt,.md,.json,.csv" onChange={(event) => uploadSource(event.target.files?.[0] || null)}/></label>}</div>}</div>}
        {step === 2 && <div className="build-step"><small>STEP 2 OF 4</small><h2>How should it work?</h2><p>Think about the conversation you would have with a real person.</p><label>What does it need to ask?<textarea value={questions} onChange={(event) => setQuestions(event.target.value)} placeholder="How many people? Dietary needs? Budget? Date? What’s already in the pantry?"/></label><label>What should happen next?<textarea value={steps} onChange={(event) => setSteps(event.target.value)} placeholder="Suggest three menus, let the family vote, assign dishes, build the shopping list…"/></label><label>What should the finished result include?<textarea value={result} onChange={(event) => setResult(event.target.value)} placeholder="A shared dinner page, menu, list, assignments, calendar, and printable"/></label></div>}
        {step === 3 && <div className="build-step"><small>STEP 3 OF 4</small><h2>Add only what the idea needs.</h2><p>Choose capabilities by what they let your customer do. Connection requirements are shown before anything is promised.</p>{groups.map((group) => <div className="add-on-group" key={group}><h3>{group}</h3><div>{addOns.filter((item) => item.group === group).map((item) => <button type="button" className={selected.includes(item.id) ? "selected" : ""} key={item.id} onClick={() => setSelected(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])}><span>{selected.includes(item.id) ? "✓" : "+"}</span><b>{item.name}</b><p>{item.examples}</p><small>{item.status}</small></button>)}</div></div>)}</div>}
        {step === 4 && <div className="build-step final-step"><small>STEP 4 OF 4</small><h2>Your Rally listing is ready.</h2><p>Choose free or paid access, save it to your studio, and publish when the working version is ready.</p><div className="launch-summary"><span><b>{name || "Your Rally"}</b>{buyer || "Your customer"}</span><span><b>{chosen.length}</b>included tools</span><span><b>{price ? `$${price}` : "Free"}</b>customer price</span></div>{!status && <><label>Customer price · enter 0 for free<input type="number" min="0" value={price} onChange={(event) => setPrice(Number(event.target.value))}/></label><button className="dark" onClick={saveBuild} disabled={saving}>{saving ? "Saving…" : "Save to my studio"}</button></>}{status && <div className="build-saved"><b>Saved ✓</b><p>{status}</p><a href="#my-rallies">Manage my Rallies ↓</a></div>}</div>}
        <div className="build-controls">{step > 1 && step < 4 && <button onClick={() => setStep(step - 1)}>← Back</button>}{step < 4 && <button className="primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue →</button>}</div>
      </div>
      <aside className="live-build-preview"><small>YOUR WORKING IDEA</small><h2>{name || "Untitled planner"}</h2><p>{outcome || "The finished outcome will appear here as you describe it."}</p><div><span><b>FOR</b>{buyer || "Your future customer"}</span><span><b>ASKS</b>{questions || "The minimum useful questions"}</span><span><b>CREATES</b>{result || "A practical finished result"}</span></div><h3>What it can use</h3>{chosen.length ? <ul>{chosen.map((item) => <li key={item.id}>{item.name}<small>{item.status}</small></li>)}</ul> : <p>No extras selected yet.</p>}<em>Drafting is free during the private preview. Any provider fees or usage costs are shown before launch.</em></aside>
    </section>
    <section className="maker-studio" id="my-rallies"><header><small>MY RALLY STUDIO</small><h2>Your work, listings, and launches.</h2><p>Publish a linked working app now. Uploaded projects and new Pep Rally builds stay private while their hosted version is prepared.</p></header>{apps.length ? <div className="studio-grid">{apps.map((app) => <article key={app.id}><div><small>{app.stage.toUpperCase()}</small><span>{app.accessModel === "free" ? "Free" : `$${(app.priceCents / 100).toFixed(0)}`}</span></div><h3>{app.name}</h3><p>{app.outcome}</p><em>{app.sourceType === "live" ? "Live app linked" : app.sourceType === "code" ? "Project uploaded" : "Building inside Pep Rally"}</em>{app.stage === "published" ? <button onClick={() => changeListing(app.id, "unpublish")}>Remove from marketplace</button> : app.sourceType === "live" && app.sourceUrl ? <button className="primary" onClick={() => changeListing(app.id, "publish")}>Publish to marketplace →</button> : <b>Next: prepare the hosted working version</b>}</article>)}</div> : <div className="studio-empty"><b>Your first Rally will appear here.</b><p>Start with an idea or bring something you already made.</p></div>}{status && <p className="studio-status">{status}</p>}</section>

    <section className="connection-model"><header><small>BUILT FOR LAUNCH</small><h2>Everything around the mini-app, together.</h2><p>Pep Rally packages the pieces that turn a useful personal tool into something other people can find, trust, and use.</p></header><div><article><b>1</b><h3>Sell or share</h3><p>Give it away, set a price, control access, and keep the customer’s Rally in their library.</p></article><article><b>2</b><h3>Learn what works</h3><p>Collect usage signals, reviews, improvement requests, and new versions beside the product.</p></article><article><b>3</b><h3>Keep it running</h3><p>Bring hosting, accounts, payments, messages, data, and support into one launch path.</p></article></div></section>
  </main>;
}
