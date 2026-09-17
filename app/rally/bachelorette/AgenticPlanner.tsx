"use client";

import { useMemo, useState } from "react";
import { bacheloretteAgentSpec, generateBacheloretteArtifact, reviseBacheloretteArtifact, validateSpec, type ItineraryArtifact, type ProvenanceItem } from "../../agentic/rally-runtime";
import { downloadMarkdown, markdownCell } from "../../download-markdown";

type Props = { signedIn: boolean; onSignIn: () => void; onSaveWorkspace: () => void };

export default function AgenticPlanner({ signedIn, onSignIn, onSaveWorkspace }: Props) {
  const questions = bacheloretteAgentSpec.steps.filter((step) => step.type === "ask");
  const [started, setStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [artifact, setArtifact] = useState<ItineraryArtifact | null>(null);
  const [feedback, setFeedback] = useState("");
  const [revisions, setRevisions] = useState(0);
  const [provenance, setProvenance] = useState<ProvenanceItem[]>([]);
  const validation = useMemo(() => validateSpec(bacheloretteAgentSpec), []);
  const current = questions[questionIndex];

  function submitAnswer() {
    if (!current || !draft.trim()) return;
    const nextAnswers = { ...answers, [current.id]: draft.trim() };
    setAnswers(nextAnswers);
    setProvenance((items) => [...items, { label: "Asked", detail: current.prompt }]);
    setDraft("");
    if (questionIndex < questions.length - 1) setQuestionIndex(questionIndex + 1);
    else {
      const result = generateBacheloretteArtifact(nextAnswers);
      setArtifact(result);
      setProvenance((items) => [...items, { label: "Generated", detail: "Created a three-day itinerary with a visible budget and booking checklist." }]);
    }
  }

  function revise() {
    if (!artifact || !feedback.trim() || revisions >= 3) return;
    setArtifact(reviseBacheloretteArtifact(artifact, feedback.trim(), answers));
    setProvenance((items) => [...items, { label: `Revision ${revisions + 1}`, detail: feedback.trim() }]);
    setFeedback(""); setRevisions(revisions + 1);
  }

  function download() {
    if (!artifact) return;
    const markdown = `# ${artifact.title}\n\n${artifact.summary}\n\n**Estimated total per person:** $${artifact.totalPerPerson.toLocaleString()}\n\n${artifact.days.map((day) => `## ${day.label}\n\n${day.items.map((item) => `- **${item.time} · ${markdownCell(item.title)}** — ${markdownCell(item.note)}${item.estimatedCost ? ` · est. $${item.estimatedCost}` : ""}`).join("\n")}`).join("\n\n")}\n\n## Booking list\n\n${artifact.bookingList.map((item) => `- [ ] ${markdownCell(item)}`).join("\n")}\n\n## How it was made\n\n${provenance.map((item) => `- **${item.label}:** ${markdownCell(item.detail)}`).join("\n")}\n\n---\nCreated with the Pep Rally agentic preview. Review live prices, availability, policies, and every booking before paying.\n`;
    downloadMarkdown("bachelorette-agentic-itinerary.md", markdown);
  }

  if (!validation.valid) return <section className="agentic-shell"><b>This Rally needs a creator fix before it can run.</b><p>{validation.errors.join(" ")}</p></section>;

  return <section className="agentic-shell" id="agentic-preview">
    <header><div><small>AGENTIC PREVIEW · NO SIGN-IN</small><h2>Plan the weekend through a real back-and-forth.</h2><p>Pep Rally asks only what it needs, drafts the outcome, and revises the affected part without making you restart.</p></div><div className="agent-budget"><span><b>{Math.min(provenance.length + 1, 12)}/12</b>step budget</span><span><b>{revisions}/3</b>revisions</span><span><b>$0.00</b>preview spend</span></div></header>
    {!started ? <div className="agent-start"><div><b>What you’ll finish</b><p>{bacheloretteAgentSpec.listingContract.deliverableDescription}</p><ul>{bacheloretteAgentSpec.listingContract.claims.map((claim) => <li key={claim}>{claim}</li>)}</ul></div><button className="primary" onClick={() => setStarted(true)}>Plan my weekend →</button></div> : !artifact && current ? <div className="agent-question"><div className="agent-progress"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}/></div><small>QUESTION {questionIndex + 1} OF {questions.length}</small><h3>{current.prompt}</h3>{current.inputKind === "choice" ? <div className="agent-choices">{current.choices?.map((choice) => <button className={draft === choice ? "selected" : ""} key={choice} onClick={() => setDraft(choice)}>{choice}</button>)}</div> : <input autoFocus type={current.inputKind === "number" ? "number" : "text"} min={current.inputKind === "number" ? 1 : undefined} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={current.id === "city" ? "Palm Springs, CA" : current.id === "dates" ? "October 9–11" : current.id === "headcount" ? "8" : "$450"}/>}<button className="primary" disabled={!draft.trim()} onClick={submitAnswer}>{questionIndex === questions.length - 1 ? "Create my itinerary →" : "Continue →"}</button></div> : artifact ? <div className="agent-result"><div className="agent-artifact"><small>DELIVERED · REVIEW BEFORE BOOKING</small><h3>{artifact.title}</h3><p>{artifact.summary}</p><div className="agent-total"><span>Estimated ceiling per person</span><b>${artifact.totalPerPerson.toLocaleString()}</b></div>{artifact.days.map((day) => <article key={day.label}><h4>{day.label}</h4>{day.items.map((item) => <div key={`${day.label}-${item.time}-${item.title}`}><time>{item.time}</time><span><b>{item.title}</b><small>{item.note}</small></span>{item.estimatedCost > 0 && <em>~${item.estimatedCost}</em>}</div>)}</article>)}<aside><b>Booking list</b>{artifact.bookingList.map((item) => <span key={item}>□ {item}</span>)}</aside></div><div className="agent-review"><small>REVIEW + REVISE</small><h3>What should change?</h3><p>Try “make Saturday cheaper,” “swap the dinner,” or “make it more relaxed.” Only the affected section changes.</p><div className="agent-quick"><button onClick={() => setFeedback("Make Saturday cheaper")}>Make it cheaper</button><button onClick={() => setFeedback("Swap the celebration dinner")}>Swap dinner</button><button onClick={() => setFeedback("Make the schedule more relaxed")}>More relaxed</button></div><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Tell the Rally what to revise…"/><button disabled={!feedback.trim() || revisions >= 3} onClick={revise}>{revisions >= 3 ? "Revision limit reached" : "Revise this plan →"}</button><div className="agent-provenance"><b>How this was made</b>{provenance.map((item, index) => <span key={`${item.label}-${index}`}><i>{index + 1}</i><span><strong>{item.label}</strong>{item.detail}</span></span>)}</div><div className="agent-keep">{signedIn ? <><button className="primary" onClick={onSaveWorkspace}>Save to My Rallies</button><button onClick={download}>Download itinerary .md</button></> : <><b>Like the result?</b><p>Sign in now to keep or download it. You did not need an account to create it.</p><button className="primary" onClick={onSignIn}>Sign in to keep it →</button></>}</div></div></div> : null}
  </section>;
}
