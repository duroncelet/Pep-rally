"use client";
import { useState } from "react";
import { generateBacheloretteArtifact, type ItineraryArtifact } from "../../agentic/rally-runtime";
import { validTripDates } from "./destinations";

type Props = { onApply: (artifact: ItineraryArtifact, answers: Record<string, string>) => void };
const questions = [
  { id: "bride", label: "Who are we celebrating?", placeholder: "Her name" },
  { id: "city", label: "Where are you going?", placeholder: "Any city, with state or country" },
  { id: "dates", label: "When is the trip?", placeholder: "" },
  { id: "headcount", label: "How many people, including the bride?", placeholder: "8" },
  { id: "budget", label: "What is the comfortable budget per person?", placeholder: "450" },
  { id: "vibe", label: "What feels most like her?", placeholder: "" },
];
const vibes = ["Poolside & playful", "Foodie & fabulous", "Wellness & slow", "Big night out", "Crafty & cozy"];

export default function AgenticPlanner({ onApply }: Props) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const question = questions[index];
  function answer(id: string, value: string) { setAnswers(current => ({ ...current, [id]: value })); setError(""); }
  function next() {
    if (question.id === "dates") {
      if (!validTripDates(answers.startDate || "", answers.endDate || "")) { setError("Choose valid dates, with departure on or after arrival and no more than 31 days apart."); return; }
    } else if (!answers[question.id]?.trim()) { setError("Add an answer to continue."); return; }
    if (question.id === "headcount" && (!Number.isInteger(Number(answers.headcount)) || Number(answers.headcount) < 1 || Number(answers.headcount) > 100)) { setError("Enter a whole number from 1 to 100."); return; }
    if (question.id === "budget" && (!Number.isFinite(Number(answers.budget)) || Number(answers.budget) <= 0 || Number(answers.budget) > 100000)) { setError("Enter a budget greater than $0 and up to $100,000."); return; }
    if (index < questions.length - 1) { setIndex(index + 1); return; }
    const complete = { ...answers, dates: `${answers.startDate} to ${answers.endDate}` };
    onApply(generateBacheloretteArtifact(complete), complete);
  }
  return <section className="agentic-shell">
    <header><div><small>YOUR WEEKEND STARTS HERE</small><h2>Make a plan everyone can get behind.</h2><p>A few details, then one editable plan for your people, places and budget.</p></div></header>
    {!started ? <div className="agent-start"><p>You can choose activities, add your own ideas and share the finished plan.</p><button className="primary" onClick={() => setStarted(true)}>Plan your weekend →</button></div> : <form className="agent-question" onSubmit={e => { e.preventDefault(); next(); }}>
      <small>QUESTION {index + 1} OF {questions.length}</small><h3 id="planner-question">{question.label}</h3>
      {question.id === "dates" ? <div className="trip-fields"><label>Arrival date<input type="date" required value={answers.startDate || ""} onChange={e => answer("startDate", e.target.value)}/></label><label>Departure date<input type="date" min={answers.startDate} required value={answers.endDate || ""} onChange={e => answer("endDate", e.target.value)}/></label></div> : question.id === "vibe" ? <div className="agent-choices">{vibes.map(v => <button key={v} type="button" className={answers.vibe === v ? "selected" : ""} aria-pressed={answers.vibe === v} onClick={() => answer("vibe", v)}>{v}</button>)}</div> : <input key={question.id} aria-labelledby="planner-question" autoFocus required type={["budget", "headcount"].includes(question.id) ? "number" : "text"} min="1" step={question.id === "budget" ? "0.01" : "1"} value={answers[question.id] || ""} onChange={e => answer(question.id, e.target.value)} placeholder={question.placeholder}/>}
      {question.id === "budget" && <p>In USD, excluding travel to the destination. This is a planning limit; you’ll add actual costs later.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="rally-actions">{index > 0 && <button type="button" onClick={() => { setIndex(index - 1); setError(""); }}>Back</button>}<button className="primary" type="submit">{index === questions.length - 1 ? "Create my weekend →" : "Continue →"}</button></div>
    </form>}
  </section>;
}
