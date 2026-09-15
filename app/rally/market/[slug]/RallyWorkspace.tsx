"use client";

import { useMemo, useState } from "react";
import type { RallyConcept } from "../../../catalog";
import { downloadMarkdown, markdownCell, safeFileName } from "../../../download-markdown";
import { buildCustomizationKit } from "../../../customization-kit";
import { createWorkingResult } from "../../../rally-results";

export default function RallyWorkspace({ concept }: { concept: RallyConcept }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const filled = useMemo(() => concept.inputs.filter((item) => answers[item]?.trim()), [answers, concept.inputs]);
  const result = useMemo(() => createWorkingResult(concept, answers), [answers, concept]);

  async function save() {
    setSaveStatus("Saving…");
    const summary = `${result.headline} created from ${filled.length} of ${concept.inputs.length} inputs.`;
    const response = await fetch("/api/rallies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toolSlug: `catalog:${concept.slug}`, title: concept.title, inputs: answers, summary }) });
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setSaveStatus(response.ok ? "Saved to My Rallies" : data.error ?? "Could not save this workspace.");
  }

  function downloadOutcome() {
    const markdown = `# ${result.headline}\n\n> ${result.summary}\n\n## What I brought\n\n${concept.inputs.map((item) => `- **${item}:** ${markdownCell(answers[item] || "Not answered")}`).join("\n")}\n\n${result.sections.map((section) => `## ${section.title}\n\n${section.intro ? `${section.intro}\n\n` : ""}${section.items.map((item) => `- ${markdownCell(item)}`).join("\n")}`).join("\n\n")}\n\n## Before using it\n\n${concept.guardrail}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}\n`;
    downloadMarkdown(`${safeFileName(concept.title)}-outcome.md`, markdown);
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({ title: concept.title, promise: concept.promise, audience: concept.forWhom, inputs: concept.inputs, outputs: concept.outcome, guardrail: concept.guardrail, currentAnswers: answers });
    downloadMarkdown(`${safeFileName(concept.title)}-customization-kit.md`, markdown);
  }

  return <main className={`market-workspace concept-${concept.accent}`}>
    <nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={`/discover/${concept.slug}`}>Full listing</a><a href="/library">My Rallies</a></div></nav>
    <header><small>WORKING RALLY · {concept.category.toUpperCase()}</small><h1>{concept.title}</h1><p>{concept.promise}</p><button className="customization-download" onClick={downloadCustomization}>Download customization prompts .md</button></header>
    <section className="market-workspace-grid"><form onSubmit={(event) => { event.preventDefault(); setCreated(true); }}><small>BRING YOUR REAL CONTEXT</small><h2>Make the first result yours.</h2>{concept.inputs.map((item) => <label key={item}>{item}<textarea value={answers[item] ?? ""} onChange={(event) => { setAnswers({ ...answers, [item]: event.target.value }); setCreated(false); }} placeholder="Add the detail you know…"/></label>)}<button className="primary" disabled={!filled.length}>Create my working result →</button></form><aside className={created ? "created" : ""}><small>YOUR OUTCOME</small><h2>{created ? result.headline : "Your finished result appears here."}</h2>{created ? <><p className="result-summary">{result.summary}</p>{result.sections.map((section, index) => <article key={section.title}><b>{String(index + 1).padStart(2, "0")} · {section.title}</b>{section.intro && <p>{section.intro}</p>}<ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}<div className="workspace-review"><b>Before you use it</b><p>{concept.guardrail}</p></div><div className="rally-actions"><button onClick={downloadOutcome}>Download my outcome .md</button><button onClick={downloadCustomization}>Customize this Rally .md</button><button onClick={save}>Save to My Rallies</button></div>{saveStatus && <small>{saveStatus}</small>}</> : <><p>Answer at least one question. This working Rally will organize your information into a domain-specific result you can review, save, and download.</p><button onClick={downloadCustomization}>Download prompts to customize this Rally</button></>}</aside></section>
  </main>;
}
