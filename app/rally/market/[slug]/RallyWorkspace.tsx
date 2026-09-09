"use client";

import { useMemo, useState } from "react";
import type { RallyConcept } from "../../../catalog";

export default function RallyWorkspace({ concept }: { concept: RallyConcept }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const filled = useMemo(() => concept.inputs.filter((item) => answers[item]?.trim()), [answers, concept.inputs]);

  async function save() {
    setSaveStatus("Saving…");
    const summary = `${concept.outcome.join(", ")} created from ${filled.length} of ${concept.inputs.length} inputs.`;
    const response = await fetch("/api/rallies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: `catalog:${concept.slug}`, title: concept.title, inputs: answers, summary }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaveStatus(response.ok ? "Saved to My Rallies" : data.error ?? "Could not save this workspace.");
  }

  return <main className={`market-workspace concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={`/discover/${concept.slug}`}>Full listing</a><a href="/library">My Rallies</a></div></nav>
    <header><small>WORKING PREVIEW · {concept.category.toUpperCase()}</small><h1>{concept.title}</h1><p>{concept.promise}</p></header>
    <section className="market-workspace-grid"><form onSubmit={(event) => { event.preventDefault(); setCreated(true); }}><small>BRING YOUR REAL CONTEXT</small><h2>Make the first result yours.</h2>{concept.inputs.map((item) => <label key={item}>{item}<textarea value={answers[item] ?? ""} onChange={(event) => setAnswers({ ...answers, [item]: event.target.value })} placeholder="Add the detail you know…"/></label>)}<button className="primary" disabled={!filled.length}>Create my first result →</button></form><aside className={created ? "created" : ""}><small>YOUR OUTCOME</small><h2>{created ? "A useful first draft—not a blank template." : "Your finished result appears here."}</h2>{created ? <>{concept.outcome.map((item, index) => <article key={item}><b>{String(index + 1).padStart(2, "0")} · {item}</b><p>Built from {answers[concept.inputs[index % concept.inputs.length]] || "the context you provided"}. Review the assumptions, add missing details, and keep the final decision with you.</p></article>)}<div className="workspace-review"><b>Before you use it</b><p>{concept.guardrail}</p></div><button onClick={save}>Save this workspace</button>{saveStatus && <small>{saveStatus}</small>}</> : <p>Answer at least one question. The Rally will organize it into the promised deliverables so you can review, refine, and save the result.</p>}</aside></section>
  </main>;
}
