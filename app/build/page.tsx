"use client";

import { useMemo, useState } from "react";

const addOns = [
  { id: "payments", name: "Take payments", examples: "Stripe or PayPal checkout, receipts, and access after purchase", status: "Connect an account", group: "Sell it" },
  { id: "group-money", name: "Collect group money", examples: "Payment-request links, balances, reminders, and reconciliation", status: "Available in builds", group: "Sell it" },
  { id: "email", name: "Send email", examples: "Invites, reminders, results, receipts, and updates", status: "Connect an account", group: "Communicate" },
  { id: "sms", name: "Send text messages", examples: "Time-sensitive reminders and group updates", status: "Connect an account", group: "Communicate" },
  { id: "chat", name: "Add a shared chat", examples: "A conversation that stays beside the plan", status: "Available in builds", group: "Communicate" },
  { id: "calendar", name: "Use calendars", examples: "Deadlines, schedules, reminders, and calendar exports", status: "Available in builds", group: "Communicate" },
  { id: "weather", name: "Use live weather", examples: "Forecast-aware recommendations and changing plans", status: "Available in builds", group: "Live information" },
  { id: "maps", name: "Use maps and places", examples: "Location search, directions, venue lists, and booking handoffs", status: "Available in builds", group: "Live information" },
  { id: "reservations", name: "Book reservations", examples: "Live availability and booking inside the experience", status: "Partner access needed", group: "Live information" },
  { id: "files", name: "Accept files", examples: "Guides, spreadsheets, photos, PDFs, and source material", status: "Available in builds", group: "Build the result" },
  { id: "ai", name: "Add AI", examples: "Personalized plans, summaries, practice, and recommendations", status: "Usage credits apply", group: "Build the result" },
  { id: "exports", name: "Create takeaways", examples: "PDFs, printables, calendars, CSVs, and share links", status: "Available in builds", group: "Build the result" },
];

export default function BuildPage() {
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

  const chosen = addOns.filter((item) => selected.includes(item.id));
  const groups = useMemo(() => [...new Set(addOns.map((item) => item.group))], []);
  const canContinue = step === 1 ? name.trim() && buyer.trim() && problem.trim() && outcome.trim() : step === 2 ? questions.trim() && steps.trim() && result.trim() : true;

  async function saveBuild() {
    setSaving(true); setStatus("");
    const builderSpec = [`Buyer: ${buyer}`, `Questions: ${questions}`, `Steps: ${steps}`, `Finished result: ${result}`, `Launch pieces: ${chosen.map((item) => item.name).join(", ")}`].join("\n\n");
    const response = await fetch("/api/creator-apps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, problem, outcome, proof, accessModel: price > 0 ? "paid" : "free", price, sourceType: "guided", builderSpec }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaving(false);
    if (response.ok) { setStatus("Your build is saved. Next, Pep Rally reviews the workflow and turns it into a private test version."); setStep(4); }
    else setStatus(data.error ?? "Your build could not be saved.");
  }

  return <main className="build-page">
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div className="build-progress"><span className={step >= 1 ? "active" : ""}>Idea</span><i>→</i><span className={step >= 2 ? "active" : ""}>Experience</span><i>→</i><span className={step >= 3 ? "active" : ""}>Launch pieces</span><i>→</i><span className={step >= 4 ? "active" : ""}>Test</span></div><div className="build-nav-actions"><a href="/connections">Connections</a><a href="/">Back to shop</a></div></nav>
    <header className="build-header"><div><small>BUILD INSIDE PEP RALLY</small><h1>Start with the useful idea.<br/><em>Add the hard parts later.</em></h1><p>You do not need to arrive with code, a payment system, or a finished app. Describe what should happen, choose what it needs, and save a private build brief.</p></div><div className="included-card"><small>EVERY BUILD STARTS WITH</small><span>✓ Private hosted test version</span><span>✓ Customer accounts and saved progress</span><span>✓ A place to collect feedback</span><span>✓ Clear connection requirements</span><span>✓ No surprise technology decisions</span></div></header>

    <section className="build-workbench">
      <div className="build-form">
        {step === 1 && <div className="build-step"><small>STEP 1 OF 4</small><h2>What should someone be able to do?</h2><p>Describe the result in everyday language. The app comes after the outcome.</p><label>Name your idea<input value={name} onChange={(event) => setName(event.target.value)} placeholder="The Sunday Dinner Planner"/></label><label>Who is it for?<input value={buyer} onChange={(event) => setBuyer(event.target.value)} placeholder="Busy families who still want to cook together"/></label><label>What is frustrating today?<textarea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="They have recipes and group texts, but no shared plan…"/></label><label>What should they have when they’re done?<textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="A chosen menu, shopping list, assignments, timing, and reminders"/></label><label>Why do you know this works?<textarea value={proof} onChange={(event) => setProof(event.target.value)} placeholder="I use this process every week with…"/></label></div>}
        {step === 2 && <div className="build-step"><small>STEP 2 OF 4</small><h2>How should it work?</h2><p>Think about the conversation you would have with a real person.</p><label>What does it need to ask?<textarea value={questions} onChange={(event) => setQuestions(event.target.value)} placeholder="How many people? Dietary needs? Budget? Date? What’s already in the pantry?"/></label><label>What should happen next?<textarea value={steps} onChange={(event) => setSteps(event.target.value)} placeholder="Suggest three menus, let the family vote, assign dishes, build the shopping list…"/></label><label>What should the finished result include?<textarea value={result} onChange={(event) => setResult(event.target.value)} placeholder="A shared dinner page, menu, list, assignments, calendar, and printable"/></label></div>}
        {step === 3 && <div className="build-step"><small>STEP 3 OF 4</small><h2>Add only what the idea needs.</h2><p>Choose capabilities by what they let your customer do. Connection requirements are shown before anything is promised.</p>{groups.map((group) => <div className="add-on-group" key={group}><h3>{group}</h3><div>{addOns.filter((item) => item.group === group).map((item) => <button type="button" className={selected.includes(item.id) ? "selected" : ""} key={item.id} onClick={() => setSelected(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])}><span>{selected.includes(item.id) ? "✓" : "+"}</span><b>{item.name}</b><p>{item.examples}</p><small>{item.status}</small></button>)}</div></div>)}</div>}
        {step === 4 && <div className="build-step final-step"><small>STEP 4 OF 4</small><h2>Your first build brief is ready.</h2><p>The next version is private and testable. Connections that need an account or partner approval stay off until they are properly configured.</p><div className="launch-summary"><span><b>{name || "Your idea"}</b>{buyer || "Your customer"}</span><span><b>{chosen.length}</b>selected launch pieces</span><span><b>{price ? `$${price}` : "Free"}</b>possible price</span></div>{!status && <><label>Possible customer price<input type="number" min="0" value={price} onChange={(event) => setPrice(Number(event.target.value))}/></label><button className="dark" onClick={saveBuild} disabled={saving}>{saving ? "Saving…" : "Save my private build"}</button></>}{status && <div className="build-saved"><b>Saved ✓</b><p>{status}</p><a href="/">Return to Pep Rally</a></div>}</div>}
        <div className="build-controls">{step > 1 && step < 4 && <button onClick={() => setStep(step - 1)}>← Back</button>}{step < 4 && <button className="primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue →</button>}</div>
      </div>
      <aside className="live-build-preview"><small>YOUR WORKING IDEA</small><h2>{name || "Untitled planner"}</h2><p>{outcome || "The finished outcome will appear here as you describe it."}</p><div><span><b>FOR</b>{buyer || "Your future customer"}</span><span><b>ASKS</b>{questions || "The minimum useful questions"}</span><span><b>CREATES</b>{result || "A practical finished result"}</span></div><h3>What it can use</h3>{chosen.length ? <ul>{chosen.map((item) => <li key={item.id}>{item.name}<small>{item.status}</small></li>)}</ul> : <p>No extras selected yet.</p>}<em>Drafting is free during the private preview. Any provider fees or usage costs are shown before launch.</em></aside>
    </section>
    <section className="connection-model"><header><small>HOW THE HARD PARTS WORK</small><h2>One build. Add only what earns its place.</h2><p>Pep Rally’s job is to make common launch pieces reusable, clearly priced, and much easier to turn on.</p><a className="connection-center-link" href="/connections">See what is genuinely connected today →</a></header><div><article><b>1</b><h3>Included foundation</h3><p>Hosting, accounts, saved progress, a private test version, and feedback collection come with the Pep Rally build.</p></article><article><b>2</b><h3>Connection packs</h3><p>Add payments, messages, AI, maps, weather, calendars, or exports. Any setup charge, provider fee, or usage credit is shown before activation.</p></article><article><b>3</b><h3>Partner access</h3><p>Some services—such as booking a restaurant entirely inside the app—require a formal provider partnership. Pep Rally shows that honestly and uses a safe handoff until access is approved.</p></article></div></section>
  </main>;
}
