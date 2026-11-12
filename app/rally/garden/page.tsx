"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { downloadMarkdown, markdownCell, safeFileName } from "../../download-markdown";
import {readBrowserDraft,useBrowserDraft} from "../../browser-draft";
import OutcomePreview from "../../OutcomePreview";
import type {OutcomeDocument} from "../../outcome-document";
import { downloadOutcomePdf } from "../../download-pdf";
import { gardenAssignments } from "./assignments";
import { gardenWeatherActions, weatherRequestGate } from "./weather";
import { buildCustomizationKit } from "../../customization-kit";

type GardenTask = { id: string; text: string; done: boolean; timing: string };
import GardenJournal, { type JournalEntry } from "./GardenJournal";
import PlotEditor from "./PlotEditor";
import PlantingCalendar, { type Timings } from './PlantingCalendar';
import { emptyProfile, plantingMarkdown, type GrowingProfile } from './planting';
import { gridSize, makePlots, plotSummary, validPlot, type Plot } from "./plots";
type Weather = {
  fetchedAt?:string;
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
  const [tab, setTab] = useState<"setup" | "plan" | "calendar" | "layout" | "weather" | "tasks" | "journal">("setup");
  const [growingProfile,setGrowingProfile]=useState<GrowingProfile>(emptyProfile);
  const [timings,setTimings]=useState<Timings>({});
  const [location, setLocation] = useState("");
  const [space, setSpace] = useState("Raised beds");
  const [bedCount, setBedCount] = useState(2);
  const [length, setLength] = useState(8);
  const [width, setWidth] = useState(4);
  const [sun, setSun] = useState("6–8 hours");
  const [watering, setWatering] = useState("Hand watering");
  const [experience, setExperience] = useState("Beginner");
  const [goal, setGoal] = useState("Fresh food for the week");
  const [crops, setCrops] = useState<string[]>([]);
  const [customCrop,setCustomCrop]=useState("");
  const [tasks, setTasks] = useState(starterTasks);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherChoices,setWeatherChoices]=useState<Array<{id:number;name:string;region?:string;country?:string}>>([]);
  const [weatherPlace,setWeatherPlace]=useState('');
  const [fahrenheit,setFahrenheit]=useState(true);
  const temperature=(n:number)=>Math.round(fahrenheit?n*9/5+32:n);
  const [weatherStatus, setWeatherStatus] = useState("Add your location to load a live 7-day forecast.");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [choices, setChoices] = useState<Record<number,string>>({});
  const weatherRequest = useRef(weatherRequestGate());
  useEffect(() => {
    weatherRequest.current.invalidate();
    setWeather(null); setWeatherChoices([]); setWeatherPlace('');
    setWeatherStatus(location.trim().length >= 2 ? "Loading live weather…" : "Add your location to load a live 7-day forecast.");
    const timer = location.trim().length >= 2 ? setTimeout(() => { void loadWeather(''); }, 500) : undefined;
    return () => { clearTimeout(timer); weatherRequest.current.invalidate(); };
  }, [location]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"checking" | "guest" | "signed-in">("checking");
  const [signInPath, setSignInPath] = useState("/sign-in?redirect_url=%2Frally%2Fgarden");

  const [draftOwner,setDraftOwner]=useState("");
  const [advanced,setAdvanced]=useState(false);
  useEffect(() => {
    (async () => {
      try {
      const response = await fetch("/api/garden-hub");
      const data = await response.json();
      if (response.status === 401 && data.signIn) {
        setAuthState("guest"); setSignInPath(data.signIn);
      }
      if (!response.ok && response.status !== 401) throw new Error("load");
      if (response.ok) setAuthState("signed-in");
      const pending = sessionStorage.getItem("pep-rally-garden-draft");
      setDraftOwner(data.ownerId || "guest");
      const recovery=readBrowserDraft("garden",data.ownerId || "guest",data.updatedAt);
      const plan = pending ? JSON.parse(pending) : recovery || data.plan;
      if (plan?.version === 1 || plan?.version === 2 || plan?.version === 3) {
        setReady(true); setTab("plan"); setChoices(plan.choices || {});
        setLocation(plan.location); setSpace(plan.space); setBedCount(plan.bedCount); setLength(plan.length); setWidth(plan.width);
        setSun(plan.sun); setWatering(plan.watering); setExperience(plan.experience); setGoal(plan.goal); setCrops(plan.crops);
        setTasks(plan.tasks); setJournal(plan.journal ?? []);
        setGrowingProfile(plan.growingProfile || emptyProfile);setTimings(plan.timings || {});
        setPlots(plan.version === 3 && Array.isArray(plan.plots) ? plan.plots : makePlots(plan.space,plan.bedCount,plan.length,plan.width,gardenAssignments(plan.crops,plan.bedCount,plan.choices || {}).slots));
      }
      setLoading(false);
      } catch { setAuthState("guest"); setLoading(false); setError("Your saved garden could not load. Refresh before editing a saved garden."); }
    })();
  }, []);

  const summary = plotSummary(plots,crops);
  const totalArea = summary.area;
  const allocation = {slots:summary.placed,unassigned:summary.unassigned};
  const suggestedPlants = summary.placed;
  const slotName = space === "Pots / containers" ? "Pot" : space === "Rows / in-ground" ? "Row" : space === "Indoor / windowsill" ? "Growing area" : "Bed";
  function buildPlan() {
    if (!location.trim() || !crops.length || !Number.isInteger(bedCount) || bedCount < 1 || bedCount > 30 || !Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) { setError("Add your location, choose at least one crop, and enter 1–30 growing spaces with positive dimensions."); return; }
    setError(""); if(!ready) setPlots(makePlots(space,bedCount,length,width,gardenAssignments(crops,bedCount,choices).slots)); setReady(true); setTab("plan"); void loadWeather();
  }

  const weatherActions = useMemo(() => {
    if (!weather) return [];
    return gardenWeatherActions(weather.daily);
  }, [weather]);

  async function loadWeather(place=weatherPlace) {
    const isCurrent = weatherRequest.current.begin();
    setWeatherStatus("Loading live weather…"); setWeather(null);
    try {
    const response = await fetch(`/api/garden-weather?location=${encodeURIComponent(location)}${place ? `&place=${encodeURIComponent(place)}`:''}`);
    const data = await response.json();
    if (!isCurrent()) return;
    if (!response.ok) { setWeatherStatus(data.error ?? "Weather is unavailable."); return; }
    if(data.choices) {setWeatherChoices(data.choices);setWeatherStatus('Choose your location to see the forecast.');return;}
    setWeatherChoices([]);setWeatherPlace(place);
    setWeather(data); setWeatherStatus(`Live forecast for ${data.place.name}${data.place.region ? `, ${data.place.region}` : ""}`);
    } catch { if (isCurrent()) setWeatherStatus("Weather could not load. You can still use your garden plan and retry."); }
  }

  function snapshot() { return { version:3, growingProfile, timings, plots, choices, location, space, bedCount, length, width, sun, watering, experience, goal, crops, tasks, journal }; }
  const backup=useBrowserDraft("garden",draftOwner,snapshot(),!loading&&ready);
  const gardenDocument:OutcomeDocument={title:"My garden",subtitle:`${location} · ${sun} · ${plots.length} plots`,sections:[
    {heading:"This week",paragraphs:[...weatherActions,...tasks.filter(t=>!t.done).map(t=>`${t.text} — ${t.timing}`)]},
    ...plots.map(p=>({heading:p.name,paragraphs:[`${p.kind} · ${p.length} × ${p.width} ft. Crop groups, not plant counts. Check variety spacing before planting.`],grid:{columns:gridSize(p).columns,cells:p.zones}})),
    {heading:"My planting calendar",paragraphs:[`Zone: ${growingProfile.zone||"not confirmed"}. Last frost: ${growingProfile.lastFrost||"not confirmed"}. First frost: ${growingProfile.firstFrost||"not confirmed"}.`, `Source: ${growingProfile.source||"not recorded"}. These are gardener-recorded dates, not guarantees or an automatic local lookup.`,...Object.entries(timings).map(([crop,t])=>`${crop}: outdoor target ${t.outdoor||"not set"}; planted ${t.planted||"not recorded"}; packet harvest range ${t.minDays||"?"}–${t.maxDays||"?"} days.`)]},
  ]};
  const gardenPacket:OutcomeDocument={...gardenDocument,sections:[
    {heading:"Season plan",paragraphs:[`Location: ${location}. Growing setup: ${space}. Plot footprint: ${totalArea} sq ft.`, `Sun: ${sun}. Watering: ${watering}. Goal: ${goal}.`, `Selected crops: ${crops.join(', ') || 'None yet'}. Not placed: ${allocation.unassigned.join(', ') || 'None'}.`, "Crop groups are not plant counts. Confirm variety spacing, soil safety, and planting dates with a local extension or nursery."]},
    ...gardenDocument.sections,
    {heading:"Care board",paragraphs:tasks.length?tasks.map(t=>`${t.done?'Done':'To do'}: ${t.text} - ${t.timing}`):["No tasks yet."]},
    {heading:"Forecast note",paragraphs:weather?[`Forecast for ${weather.place.name}${weather.place.region?', '+weather.place.region:''}, loaded ${weather.fetchedAt || 'during this session'}. Source: ${weather.source}.`,"Forecasts change; refresh in the live garden before making a weather-dependent decision."]:["No current forecast was loaded. Open the Weather & care tab to check it before planting."]},
  ]};
  async function downloadPacket(){
    if(plots.some(p=>!validPlot(p))){setError("Check your plot names and dimensions before downloading.");return;}
    try{await downloadOutcomePdf(gardenPacket);}catch(e){setError((e as Error).message);}
  }
  async function save() {
    if(plots.some(p=>!validPlot(p))) { setError("Check plot names and dimensions (greater than 0 and up to 100 ft)."); return; }
    setError("");
    try {
      const response = await fetch("/api/garden-hub", { method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify(snapshot()) });
      if (response.status === 401) { keepThisRally(); return; }
      if (!response.ok) throw new Error("save");
      sessionStorage.removeItem("pep-rally-garden-draft"); setSaved(true); setTimeout(() => setSaved(false), 1600);
    } catch { setError("Your garden could not save. Download a copy and try again."); }
  }
  function keepThisRally() { try { sessionStorage.setItem("pep-rally-garden-draft", JSON.stringify(snapshot())); window.location.href = signInPath; } catch { setError("Download your garden before signing in; this browser could not preserve your draft."); } }

  function downloadOutcome() {
    if(plots.some(p=>!validPlot(p))) { setError("Check your plot names and dimensions before downloading."); return; }
    const forecastRows = weather ? weather.daily.time.map((day, index) => `| ${day} | ${Math.round(weather.daily.temperature_2m_min[index])}° | ${Math.round(weather.daily.temperature_2m_max[index])}° | ${weather.daily.precipitation_probability_max[index]}% |`).join("\n") : "| Load live weather in the Rally | — | — | — |";
    const markdown = `# The Little Garden Planner\n\n> A practical starting plan made with Pep Rally. Confirm planting dates, soil safety, varieties, and pest guidance with a trusted local extension or nursery.\n\n## My garden\n\n- **Location:** ${markdownCell(location)}\n- **Setup:** ${markdownCell(space)}\n- **Size:** ${totalArea} sq ft of plot footprint\n- **Sun:** ${markdownCell(sun)}\n- **Watering:** ${markdownCell(watering)}\n- **Experience:** ${markdownCell(experience)}\n- **Goal:** ${markdownCell(goal)}\n\n## What to grow first\n\n${suggestedPlants.map((plant, index) => `${index + 1}. **${plant}** — ${plant === "Tomatoes" || plant === "Cucumbers" || plant === "Beans" ? "Use the sunniest edge and support it vertically." : plant === "Lettuce" ? "Use the cooler edge and sow a little at a time." : plant === "Herbs" ? "Keep close to the kitchen and harvest often." : "Group by watering needs and leave room to reach it."}`).join("\n")}\n\n## Layout\n\n${plots.map(plot => `### ${markdownCell(plot.name)}\n${plot.kind} · ${plot.length} × ${plot.width} ft\n${plot.zones.map((crop,i)=>`- Row ${Math.floor(i/gridSize(plot).columns)+1}, column ${i%gridSize(plot).columns+1}: ${markdownCell(crop || "Open")}`).join("\n")}`).join("\n\n")}\n\nNot placed yet: ${allocation.unassigned.join(", ") || "None"}. These are crop groups, not plant quantities; confirm spacing and container size for each variety.\n\n## This week's weather-aware actions\n\n${weatherActions.length ? weatherActions.map((action) => `- ${action}`).join("\n") : "- Load the live forecast in the Rally to add weather-aware actions."}\n\n| Date | Low (°C) | High (°C) | Rain chance |\n|---|---:|---:|---:|\n${forecastRows}\n\n## Care board\n\n${tasks.map((task) => `- [${task.done ? "x" : " "}] ${markdownCell(task.text)} — ${markdownCell(task.timing)}`).join("\n")}\n\n## Garden journal\n\n${journal.length ? journal.map((entry) => `- **${markdownCell(entry.date)} · ${markdownCell(entry.kind || "Observation")} · ${markdownCell(entry.plotName || "Whole garden")}:** ${markdownCell(entry.note)}`).join("\n") : "No notes yet. Record what you plant, change, harvest, and notice."}\n\n---\nCreated with Pep Rally · ${new Date().toLocaleDateString()}${weather ? ` · Weather: ${weather.source}` : ""}\n`;
    downloadMarkdown(`${safeFileName(location)}-garden-plan.md`, markdown+'\n'+plantingMarkdown(growingProfile)+'\n## My crop calendar\n\n'+Object.entries(timings).map(([crop,t])=>`- **${markdownCell(crop)}:** outdoor target ${t.outdoor || 'unset'}; planted ${t.planted || 'unset'}; packet days to harvest ${t.minDays || '?'}–${t.maxDays || '?'}.`).join('\n'));
  }

  function downloadCustomization() {
    const markdown = buildCustomizationKit({
      title: "The Little Garden Planner",
      promise: "Turn a gardener’s real space, light, location, watering setup, and crops into a maintainable layout and current care plan.",
      audience: "A home gardener planning rows, raised beds, pots, or an indoor growing space",
      inputs: ["Location", "Growing setup and dimensions", "Sun and watering", "Experience and goal", "Crops"],
      outputs: ["A prioritized crop plan", "A visual growing layout", "Live weather-aware actions", "A care board, journal, and portable plan"],
      guardrail: "The gardener confirms planting dates, varieties, soil safety, pests, and local advice with a trusted extension or nursery.",
      currentAnswers: { Location: location, "Growing conditions": plantingMarkdown(growingProfile), "Crop calendar":JSON.stringify(timings), "Growing setup and dimensions": `${plots.map(p=>`${p.name}: ${p.kind}, ${p.length} × ${p.width} ft, grid ${gridSize(p).rows} rows × ${gridSize(p).columns} columns (row-major order), cells: ${p.zones.map(c=>c || 'Open').join(', ')}`).join('; ')}; ${totalArea} sq ft footprint`, "Sun and watering": `${sun}; ${watering}`, "Experience and goal": `${experience}; ${goal}`, Crops: crops.join(", "), Journal:journal.map(e=>`${e.date} ${e.kind || 'Observation'} ${e.plotName || 'Whole garden'}: ${e.note}`).join('\n') },
    });
    downloadMarkdown(`${safeFileName(location)}-garden-customization-kit.md`, markdown);
  }

  if (loading) return <main className="rally-loading">Opening your garden…</main>;
  const nav = ["plan", "calendar", "tasks", "journal"] as const;
  const labels = { plan:"Garden map", calendar:"Planting calendar", tasks:"Weather & care", journal:"Journal" };

  return <main className="rally-room garden-room">
    <header className="rally-header photo-rally-header garden-header">
      <a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a>
      <div className="rally-header-copy"><small>THE LITTLE GARDEN PLANNER</small><h1>Your garden, growing.</h1><p>Give your favorite crops a place to grow.</p></div>
      <figure className="rally-cover"><img src="/rallies/lush-garden.jpg" alt="A lush edible garden with raised beds, herbs, flowers, and containers"/><figcaption><b>Free Rally</b><span>From your space and weather to a growing plan</span></figcaption></figure>
      {ready && <div className="rally-header-actions">{authState === "guest" ? <button className="primary" onClick={keepThisRally}>Sign in to save</button> : <button className="primary" onClick={save}>{saved ? "Saved ✓" : "Save garden"}</button>}</div>}
    </header>
    {authState === "guest" && <div className="guest-preview-note"><span>Free to use. No account needed to start. Your draft is backed up on this browser. Sign in to save across devices. Do not use a shared device for private notes.</span></div>}
    {ready && <p className="trip-notice" role="status">{backup.status} <a href="/library">My Rallies</a></p>}
    {error && <p role="alert" className="trip-notice">{error}</p>}
    {ready && <nav className="rally-nav">{nav.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{labels[item]}</button>)}<button onClick={()=>setTab("setup")}>Garden settings</button></nav>}

    {tab === "setup" && <section className="rally-content">
      <div className="workspace-intro"><div><small>START WITH THE REAL SPACE</small><h2>What are you actually growing in?</h2><p>Choose your starting setup and crops. You can mix plot types and edit each plot on your garden map.</p></div><div className="workspace-stamp"><b>{experience}</b><span>{goal}</span></div></div>
      <div className="setup-grid">
        <label>City or postal code<input placeholder="Your city, state or country" value={location} onChange={(e) => {setLocation(e.target.value);setGrowingProfile(emptyProfile);}} /></label>
        <label>Growing setup<select value={space} onChange={(e) => setSpace(e.target.value)}><option>Rows / in-ground</option><option>Raised beds</option><option>Pots / containers</option><option>Indoor / windowsill</option></select></label>
        <button type="button" onClick={()=>setAdvanced(!advanced)}>{advanced ? "Hide growing details" : "Optional: dimensions, sunlight & care"}</button>
        {advanced && <>
        {!ready && <><label>{space === "Pots / containers" ? "Number of containers" : "Number of beds / rows"}<input type="number" min="1" max="30" value={bedCount} onChange={(e) => setBedCount(Number(e.target.value))} /></label>
        {space !== "Pots / containers" && <><label>Length (feet)<input type="number" min="1" value={length} onChange={(e) => setLength(Number(e.target.value))} /></label><label>Width (feet)<input type="number" min="1" value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label></>}
        </>}
        <label>Direct sunlight<select value={sun} onChange={(e) => setSun(e.target.value)}><option>8+ hours</option><option>6–8 hours</option><option>4–6 hours</option><option>Under 4 hours</option></select></label>
        <label>Watering setup<select value={watering} onChange={(e) => setWatering(e.target.value)}><option>Hand watering</option><option>Drip irrigation</option><option>Sprinkler</option><option>Self-watering containers</option></select></label>
        <label>Experience<select value={experience} onChange={(e) => setExperience(e.target.value)}><option>Beginner</option><option>Some seasons</option><option>Experienced</option></select></label>
        <label>Primary goal<select value={goal} onChange={(e) => setGoal(e.target.value)}><option>Fresh food for the week</option><option>Herbs for cooking</option><option>Flowers and pollinators</option><option>Maximum harvest</option><option>A low-maintenance garden</option></select></label>
        </>}
      </div>
      <p>You can adjust every plot on the map. Starting defaults: {bedCount} {space.toLowerCase()}, {length} × {width} ft, {sun} of sun.</p>
      <div className="crop-picker"><small>WHAT DO YOU WANT TO GROW?</small>{[...new Set([...cropOptions,...crops])].map((crop) => <button key={crop} className={crops.includes(crop) ? "selected" : ""} onClick={() => setCrops(crops.includes(crop) ? crops.filter((item) => item !== crop) : [...crops, crop])}>{crops.includes(crop) ? "✓ " : "+ "}{crop}</button>)}</div>
      <form className="rally-actions" onSubmit={e=>{e.preventDefault();const crop=customCrop.trim();if(crop && !crops.includes(crop))setCrops([...crops,crop]);setCustomCrop("");}}><label>Add another crop<input maxLength={100} value={customCrop} onChange={e=>setCustomCrop(e.target.value)} placeholder="e.g. Sweet potatoes"/></label><button>Add crop</button></form>
      <button className="primary" onClick={buildPlan}>{ready ? "Back to garden map" : "Plan my garden →"}</button>
    </section>}

    {tab === "plan" && <section className="rally-content">
      <div className="workspace-intro"><div><small>YOUR WORKING PLAN</small><h2>Your garden, at a glance.</h2><p>{location} · {plots.length} plots · {sun}</p></div><div className="rally-actions"><button className="primary" onClick={downloadPacket}>Download PDF packet</button><button onClick={downloadOutcome}>Download Markdown</button></div></div>
      {allocation.unassigned.length > 0 && <p role="status" className="trip-notice">Not placed yet: {allocation.unassigned.join(", ")}. Swap an assignment below or add another growing space. We haven’t assumed these crops fit.</p>}
      {sun === "Under 4 hours" && <p className="confidence-note">Limited direct sun: check each selected variety’s light requirements before planting. Your choices have not been silently replaced.</p>}
      <p className="confidence-note">This planner turns your inputs and forecast into a workable starting point. Confirm planting dates, varieties, soil safety, and pest guidance with a trusted local extension or nursery.</p>
    </section>}

    {tab === "plan" && <OutcomePreview document={gardenDocument} label="Keep your garden plan" privacy="A printable map, planting dates and care list. Your private journal is left out."/>}
    {tab === "plan" && <PlotEditor plots={plots} crops={crops} onChange={setPlots}/>}
    {tab === 'calendar' && <PlantingCalendar profile={growingProfile} onProfile={setGrowingProfile} timings={timings} onTimings={setTimings} crops={crops} onAdd={crop=>setCrops(current=>current.includes(crop)?current:[...current,crop])} location={location} sun={sun} onLog={(date,note)=>setJournal(current=>current.some(e=>e.date===date&&e.note===note)?current:[{id:crypto.randomUUID(),date,note,kind:'Planted'},...current])} onTask={(date,text)=>setTasks(current=>current.some(t=>t.text===text&&t.timing===date)?current:[...current,{id:crypto.randomUUID(),text,timing:date,done:false}])}/>}



    {tab === "tasks" && <section className="rally-content garden-forecast">
      <div className="workspace-intro"><div><small>LIVE WEATHER</small><h2>{weatherStatus}</h2><p>Check the matched city below. Forecasts guide your checks, not automatic watering or fertilizer doses.</p></div><button onClick={()=>loadWeather()}>Refresh forecast</button></div>
      {weatherChoices.length>0 && <label>Which location?<select aria-label="Weather location" value="" onChange={e=>loadWeather(e.target.value)}><option value="" disabled>Choose your city</option>{weatherChoices.map(p=><option key={p.id} value={p.id}>{p.name}, {p.region}, {p.country}</option>)}</select></label>}
      {weather && <label>Temperature units<select value={fahrenheit?'F':'C'} onChange={e=>setFahrenheit(e.target.value==='F')}><option value="F">Fahrenheit (°F)</option><option value="C">Celsius (°C)</option></select></label>}
      {weather ? <><div className="current-weather"><b>{temperature(weather.current.temperature_2m)}{fahrenheit?"°F":"°C"}</b><span>Feels like {temperature(weather.current.apparent_temperature)}{fahrenheit?"°F":"°C"}<br/>Wind {Math.round(weather.current.wind_speed_10m)} {weather.currentUnits.wind_speed_10m}</span></div><div className="forecast-row">{weather.daily.time.map((day, index) => <article key={day}><small>{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</small><b>{temperature(weather.daily.temperature_2m_max[index])}°</b><span>{temperature(weather.daily.temperature_2m_min[index])}° low</span><i>{weather.daily.precipitation_probability_max[index]}% rain</i></article>)}</div><div className="weather-actions">{weatherActions.map((action) => <p key={action}>↗ {action}</p>)}</div><p>Forecast retrieved {weather.fetchedAt ? new Date(weather.fetchedAt).toLocaleString() : "this session"}. Rain is a forecast, not a soil measurement.</p><a className="source-link" href={weather.sourceUrl} target="_blank" rel="noreferrer">Weather data: {weather.source} ↗</a></> : <p>{weatherStatus}</p>}
    </section>}

    {tab === "tasks" && <section className="rally-content"><div className="rally-title"><div><small>CARE BOARD</small><h2>Do the next right thing.</h2></div><button onClick={() => setTasks([...tasks, { id: crypto.randomUUID(), text: "New garden task", done: false, timing: "This week" }])}>+ Add task</button></div><div className="task-list">{tasks.map((task, index) => <article className={task.done ? "done" : ""} key={task.id}><button className="check" onClick={() => setTasks(tasks.map((item, i) => i === index ? { ...item, done: !item.done } : item))}>{task.done ? "✓" : ""}</button><input value={task.text} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, text: e.target.value } : item))}/><input value={task.timing} onChange={(e) => setTasks(tasks.map((item, i) => i === index ? { ...item, timing: e.target.value } : item))}/><button onClick={() => setTasks(tasks.filter((item) => item.id !== task.id))}>×</button></article>)}</div></section>}

    {tab === "journal" && <GardenJournal entries={journal} plots={plots} onChange={setJournal}/>}
    {tab === "plan" && <details className="rally-content"><summary>Downloads, customization & browser backup</summary><button onClick={backup.clear}>Remove this browser backup</button><p>Removing the backup leaves your open plan and account save unchanged. New edits create another backup.</p><p>Download prompts with your garden details. The plan above remains usable here.</p><button onClick={downloadCustomization}>Customize this Rally .md</button></details>}
  </main>;
}
