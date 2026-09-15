"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadMarkdown, markdownCell, safeFileName } from "../../download-markdown";

type GardenTask = { id: string; text: string; done: boolean; timing: string };
type JournalEntry = { id: string; date: string; note: string };
type Weather = {
  place: { name: string; region?: string; country?: string };
  current: { temperature_2m: number; apparent_temperature: number; precipitation: number; wind_speed_10m: number };
  currentUnits: Record<string, string>;
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; precipitation_probability_max: number[]; wind_speed_10m_max: number[]; et0_fao_evapotranspiration: number[] };
  source: string;
  sourceUrl: string;
};

const starterTasks: GardenTask[] = [
  { id: "soil", text: "Check drainage and refresh the growing mix", done: false, timing: "Before planting" },
  { id: "layout", text: "Place the tallest crops where they will not shade the rest", done: false, timing: "Layout day" },
  { id: "water", text: "Water deeply and record how quickly the soil dries", done: false, timing: "First week" },
  { id: "labels", text: "Label every variety and planting date", done: false, timing: "Planting day" },
];

const cropOptions = ["Tomatoes", "Peppers", "Lettuce", "Herbs", "Carrots", "Beans", "Cucumbers", "Flowers"];

export default function GardenRally() {
  const [tab, setTab] = useState<"setup" | "plan" | "layout" | "weather" | "tasks" | "journal">("setup");
  const [location, setLocation] = useState("Oakland, CA");
  const [space, setSpace] = useState("Raised beds");
  const [bedCount, setBedCount] = useState(2);
  const [length, setLength] = useState(8);
  const [width, setWidth] = useState(4);
  const [sun, setSun] = useState("6–8 hours");
  const [watering, setWatering] = useState("Hand watering");
  const [experience, setExperience] = useState("Beginner");
  const [goal, setGoal] = useState("Fresh food for the week");
  const [crops, setCrops] = useState(["Tomatoes", "Herbs", "Lettuce"]);
  const [tasks, setTasks] = useState(starterTasks);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [journalDraft, setJournalDraft] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("Add your location to load a live 7-day forecast.");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/garden-hub");
      const data = await response.json();
      if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
      if (data.plan?.version === 1) {
        const plan = data.plan;
        setLocation(plan.location); setSpace(plan.space); setBedCount(plan.bedCount); setLength(plan.length); setWidth(plan.width);
        setSun(plan.sun); setWatering(plan.watering); setExperience(plan.experience); setGoal(plan.goal); setCrops(plan.crops);
        setTasks(plan.tasks); setJournal(plan.journal ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const totalArea = space === "Pots / containers" ? bedCount : Math.max(1, bedCount * length * width);
  const suggestedPlants = useMemo(() => {
    const lowLight = ["Lettuce", "Herbs", "Carrots", "Flowers"];
    const container = ["Herbs", "Peppers", "Lettuce", "Tomatoes"];
    const base = sun === "Under 4 hours" ? lowLight : space === "Pots / containers" ? container : cropOptions;
    return crops.filter((crop) => base.includes(crop)).concat(base.filter((crop) => !crops.includes(crop))).slice(0, 5);
  }, [crops, space, sun]);

  const weatherActions = useMemo(() => {
    if (!weather) return [];
    const rain = weather.daily.precipitation_sum.reduce((sum, value) => sum + value, 0);
    const hottest = Math.max(...weather.daily.temperature_2m_max);
    const coldest = Math.min(...weather.daily.temperature_2m_min);
    const windiest = Math.max(...weather.daily.wind_speed_10m_max);
    const actions: string[] = [];
    if (rain > 20) actions.push("Rainy stretch ahead: pause automatic watering and check drainage after the heaviest day.");
    else if (rain < 4) actions.push("Dry week ahead: check soil moisture daily; containers may need more frequent watering.");
    if (hottest >= 32) actions.push("Heat watch: water early, mulch exposed soil, and give tender transplants afternoon shade.");
    if (coldest <= 4) actions.push("Cold-night watch: delay tender planting or keep row cover ready.");
    if (windiest >= 35) actions.push("Wind watch: secure trellises, pots, and young stems before the windiest day.");
    if (!actions.length) actions.push("Conditions look moderate. Keep the normal soil-check and watering rhythm.");
    return actions;
  }, [weather]);

  async function loadWeather() {
    setWeatherStatus("Loading live weather…");
    const response = await fetch(`/api/garden-weather?location=${encodeURIComponent(location)}`);
    const data = await response.json();
    if (!response.ok) { setWeatherStatus(data.error ?? "Weather is unavailable."); return; }
    setWeather(data); setWeatherStatus(`Live forecast for ${data.place.name}${data.place.region ? `, ${data.place.region}` : ""}`);
  }

  async function save() {
    const response = await fetch("/api/garden-hub", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: 1, location, space, bedCount, length, width, sun, watering, experience, goal, crops, tasks, journal }) });
    if (response.status === 401) { const data = await response.json(); if (data.signIn) window.location.href = data.signIn; return; }
    if (response.ok) { setSaved(true); setTimeout(() => setSaved(false), 1600); }
  }

  function downloadOutcome() {
    const forecastRows = weather ? weather.daily.time.map((day, index) => `| ${day} | ${Math.round(weather.daily.temperature_2m_min[index])}° | ${Math.round(weather.daily.temperature_2m_max[index])}° | ${weather.daily.precipitation_probability_max[index]}% |`).join("\n") : "| Load live weather in the Rally | — | — | — |";
    const markdown = `# The Little Garden Planner\n\n> A practical starting plan made with Pep Rally. Confirm planting dates, soil safety, varieties, and pest guidance with a trusted local extension or nursery.\n\n## My garden\n\n- **Location:** ${markdownCell(location)}\n- **Setup:** ${markdownCell(space)}\n- **Size:** ${totalArea} ${space === "Pots / containers" ? "containers" : "sq ft"}\n- **Sun:** ${markdownCell(sun)}\n- **Watering:** ${markdownCell(watering)}\n- **Experience:** ${markdownCell(experience)}\n- **Goal:** ${markdownCell(goal)}\n\n## What to grow first\n\n${suggestedPlants.map((plant, index) => `${index + 1}. **${plant}** — ${plant === "Tomatoes" || plant === "Cucumbers" || plant === "Beans" ? "Use the sunniest edge and support it vertically." : plant === "Lettuce" ? "Use the cooler edge and sow a little at a time." : plant === "Herbs" ? "Keep close to the kitchen and harvest often." : "Group by watering needs and leave room to reach it."}`).join("\n")}\n\n## Layout\n\n${Array.from({ length: Math.min(bedCount, 12) }).map((_, index) => `- **${space === "Pots / containers" ? "Pot" : space === "Rows / in-ground" ? "Row" : "Bed"} ${index + 1}:** ${suggestedPlants[index % suggestedPlants.length]}${index % 2 ? " + Herbs" : " + Flowers on the edge"}`).join("\n")}\n\n## This week's weather-aware actions\n\n${weatherActions.length ? weatherActions.map((action) => `- ${action}`).join("\n") : "- Load the live forecast in the Rally to add weather-aware actions."}\n\n| Date | Low | High | Rain chance |\n|---|---:|---:|---:|\n${forecastRows}\n\n## Care board\n\n${tasks.map((task) => `- [${task.done ? "x" : " "}] ${markdownCell(task.text)} — ${markdownCell(task.timing)}`).join("\n")}\n\n## Garden journal\n\n${journal.length ? journal.map((entry) => `- **${markdownCell(entry.date)}:** ${markdownCell(entry.note)}`).join("\n") : "No notes yet. Record what you plant, change, harvest, and notice."}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}${weather ? ` · Weather: ${weather.source}` : ""}\n`;
    downloadMarkdown(`${safeFileName(location)}-garden-plan.md`, markdown);
  }

  if (loading) return <main className="rally-loading">Opening your garden…</main>;
  const nav = ["setup", "plan", "layout", "weather", "tasks", "journal"] as const;

  return <main className="rally-room garden-room">
    <header className="rally-header garden-header">
      <a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a>
      <div><small>THE LITTLE GARDEN PLANNER · EXECUTABLE WORKSPACE</small><h1>Your garden, growing.</h1><p>{space} · {totalArea} {space === "Pots / containers" ? "containers" : "sq ft"} · {location}</p></div>
      <div className="rally-header-actions"><button onClick={downloadOutcome}>Download outcome .md</button><button className="primary" onClick={save}>{saved ? "Saved ✓" : "Save garden"}</button></div>
    </header>
    <nav className="rally-nav">{nav.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>

    {tab === "setup" && <section className="rally-content">
      <div className="workspace-intro"><div><small>START WITH THE REAL SPACE</small><h2>What are you actually growing in?</h2><p>This changes spacing, watering, crop choices, and maintenance more than a generic plant list ever could.</p></div><div className="workspace-stamp"><b>{experience}</b><span>{goal}</span></div></div>
      <div className="setup-grid">
        <label>City or postal code<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label>Growing setup<select value={space} onChange={(e) => setSpace(e.target.value)}><option>Rows / in-ground</option><option>Raised beds</option><option>Pots / containers</option><option>Indoor / windowsill</option></select></label>
        <label>{space === "Pots / containers" ? "Number of containers" : "Number of beds / rows"}<input type="number" min="1" max="30" value={bedCount} onChange={(e) => setBedCount(Number(e.target.value))} /></label>
        {space !== "Pots / containers" && <><label>Length (feet)<input type="number" min="1" value={length} onChange={(e) => setLength(Number(e.target.value))} /></label><label>Width (feet)<input type="number" min="1" value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label></>}
        <label>Direct sunlight<select value={sun} onChange={(e) => setSun(e.target.value)}><option>8+ hours</option><option>6–8 hours</option><option>4–6 hours</option><option>Under 4 hours</option></select></label>
        <label>Watering setup<select value={watering} onChange={(e) => setWatering(e.target.value)}><option>Hand watering</option><option>Drip irrigation</option><option>Sprinkler</option><option>Self-watering containers</option></select></label>
        <label>Experience<select value={experience} onChange={(e) => setExperience(e.target.value)}><option>Beginner</option><option>Some seasons</option><option>Experienced</option></select></label>
        <label>Primary goal<select value={goal} onChange={(e) => setGoal(e.target.value)}><option>Fresh food for the week</option><option>Herbs for cooking</option><option>Flowers and pollinators</option><option>Maximum harvest</option><option>A low-maintenance garden</option></select></label>
      </div>
      <div className="crop-picker"><small>WHAT DO YOU WANT TO GROW?</small>{cropOptions.map((crop) => <button key={crop} className={crops.includes(crop) ? "selected" : ""} onClick={() => setCrops(crops.includes(crop) ? crops.filter((item) => item !== crop) : [...crops, crop])}>{crops.includes(crop) ? "✓ " : "+ "}{crop}</button>)}</div>
      <button className="primary" onClick={() => { void loadWeather(); setTab("plan"); }}>Build my plan →</button>
    </section>}

    {tab === "plan" && <section className="rally-content">
      <div className="workspace-intro"><div><small>YOUR WORKING PLAN</small><h2>A small garden you can maintain.</h2><p>Built from your space, light, desired crops, watering setup, and current forecast.</p></div><button onClick={() => { void loadWeather(); setTab("weather"); }}>Refresh weather →</button></div>
      <div className="garden-plan-grid">
        {suggestedPlants.map((plant, index) => <article key={plant}><small>PRIORITY {index + 1}</small><h3>{plant}</h3><p>{plant === "Tomatoes" || plant === "Cucumbers" || plant === "Beans" ? "Give it the sunniest edge and support it vertically." : plant === "Lettuce" ? "Use the cooler edge and sow a little at a time." : plant === "Herbs" ? "Keep close to the kitchen and harvest often." : "Group by watering needs and leave room to reach it."}</p><span>{space} · {sun}</span></article>)}
      </div>
      <div className="weather-actions"><small>THIS WEEK</small>{weatherActions.length ? weatherActions.map((action) => <p key={action}>↗ {action}</p>) : <p>Load the forecast to add weather-aware actions.</p>}</div>
      <p className="confidence-note">This planner turns your inputs and forecast into a workable starting point. Confirm planting dates, varieties, soil safety, and pest guidance with a trusted local extension or nursery.</p>
    </section>}

    {tab === "layout" && <section className="rally-content">
      <div className="workspace-intro"><div><small>LAYOUT</small><h2>Put every plant somewhere.</h2><p>A simple, editable starting arrangement—not a claim about exact yield.</p></div><b>{totalArea} {space === "Pots / containers" ? "containers" : "sq ft total"}</b></div>
      <div className={`garden-layout ${space.includes("Pots") ? "pots" : "beds"}`}>{Array.from({ length: Math.min(bedCount, 12) }).map((_, index) => <article key={index}><small>{space === "Pots / containers" ? "POT" : space === "Rows / in-ground" ? "ROW" : "BED"} {index + 1}</small><b>{suggestedPlants[index % suggestedPlants.length]}</b><span>{index % 2 ? "Companion: Herbs" : "Edge: Flowers"}</span></article>)}</div>
      <div className="layout-rules"><span><b>Tall crops</b>Place where they will not shade shorter plants.</span><span><b>Access</b>Keep every planting area within comfortable reach.</span><span><b>Water</b>Group crops with similar moisture needs.</span><span><b>Rotation</b>Record each season before changing beds.</span></div>
    </section>}

    {tab === "weather" && <section className="rally-content">
      <div className="workspace-intro"><div><small>LIVE WEATHER</small><h2>{weatherStatus}</h2><p>Weather informs watering and protection tasks; it does not replace checking the soil and plants.</p></div><button onClick={loadWeather}>Refresh forecast</button></div>
      {weather ? <><div className="current-weather"><b>{Math.round(weather.current.temperature_2m)}{weather.currentUnits.temperature_2m}</b><span>Feels like {Math.round(weather.current.apparent_temperature)}{weather.currentUnits.apparent_temperature}<br/>Wind {Math.round(weather.current.wind_speed_10m)} {weather.currentUnits.wind_speed_10m}</span></div><div className="forecast-row">{weather.daily.time.map((day, index) => <article key={day}><small>{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</small><b>{Math.round(weather.daily.temperature_2m_max[index])}°</b><span>{Math.round(weather.daily.temperature_2m_min[index])}° low</span><i>{weather.daily.precipitation_probability_max[index]}% rain</i></article>)}</div><div className="weather-actions">{weatherActions.map((action) => <p key={action}>↗ {action}</p>)}</div><a className="source-link" href={weather.sourceUrl} target="_blank" rel="noreferrer">Weather data: {weather.source} ↗</a></> : <button className="primary" onClick={loadWeather}>Load live 7-day weather</button>}
    </section>}

    {tab === "tasks" && <section className="rally-content"><div className="rally-title"><div><small>CARE BOARD</small><h2>Do the next right thing.</h2></div><button onClick={() => setTasks([...tasks, { id: crypto.randomUUID(), text: "New garden task", done: false, timing: "This week" }])}>+ Add task</button></div><div className="task-list">{tasks.map((task, index) => <article className={task.done ? "done" : ""} key={task.id}><button className="check" onClick={() => setTasks(tasks.map((item, i) => i === index ? { ...item, done: !item.done } : item))}>{task.done ? "✓" : ""}</button><input value={task.text} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, text: e.target.value } : item))}/><input value={task.timing} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, timing: e.target.value } : item))}/><button onClick={() => setTasks(tasks.filter((item) => item.id !== task.id))}>×</button></article>)}</div></section>}

    {tab === "journal" && <section className="rally-content"><div className="workspace-intro"><div><small>GARDEN JOURNAL</small><h2>Turn this season into next season’s method.</h2><p>Log what happened, not just what was supposed to happen.</p></div><span>{journal.length} notes</span></div><form className="journal-compose" onSubmit={(e) => { e.preventDefault(); if (!journalDraft.trim()) return; setJournal([{ id: crypto.randomUUID(), date: new Date().toLocaleDateString(), note: journalDraft.trim() }, ...journal]); setJournalDraft(""); }}><textarea value={journalDraft} onChange={(e) => setJournalDraft(e.target.value)} placeholder="Planted, watered, harvested, noticed…"/><button className="primary">Add note</button></form><div className="journal-list">{journal.length ? journal.map((entry) => <article key={entry.id}><small>{entry.date}</small><p>{entry.note}</p><button onClick={() => setJournal(journal.filter((item) => item.id !== entry.id))}>Remove</button></article>) : <p>No notes yet. Your observations are what make this planner smarter for you over time.</p>}</div></section>}
  </main>;
}
