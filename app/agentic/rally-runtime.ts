import { destinationFor } from "../rally/bachelorette/destinations";
export type AskBlock = { id: string; type: "ask"; prompt: string; inputKind: "text" | "choice" | "number"; choices?: string[]; required?: boolean };
export type GenerateBlock = { id: string; type: "generate"; instruction: string };
export type ReviseBlock = { id: string; type: "revise"; instruction: string; maxRevisions: number; preserveUnchanged: boolean };
export type DeliverBlock = { id: string; type: "deliver"; title: string; artifactKind: string };
export type RallyBlock = AskBlock | GenerateBlock | ReviseBlock | DeliverBlock;

export type RallySpec = {
  version: "0.1";
  id: string;
  goal: string;
  steps: RallyBlock[];
  budgets: { maxSteps: number; maxCostCents: number; previewMaxCostCents: number };
  listingContract: { claims: string[]; deliverableDescription: string };
  fallback: { message: string };
};

export type ItineraryArtifact = {
  title: string;
  summary: string;
  totalPerPerson: number;
  days: Array<{ label: string; items: Array<{ time: string; title: string; note: string; estimatedCost: number }> }>;
  bookingList: string[];
};

export type ProvenanceItem = { label: string; detail: string };

export const bacheloretteAgentSpec: RallySpec = {
  version: "0.1",
  id: "bachelorette-blueprint",
  goal: "Create a realistic, budget-aware bachelorette weekend itinerary the organizer can review and act on.",
  steps: [
    { id: "city", type: "ask", prompt: "Where is the weekend happening?", inputKind: "text", required: true },
    { id: "dates", type: "ask", prompt: "What dates or weekend are you considering?", inputKind: "text", required: true },
    { id: "headcount", type: "ask", prompt: "How many people are going?", inputKind: "number", required: true },
    { id: "budget", type: "ask", prompt: "What should each person comfortably spend, excluding travel?", inputKind: "number", required: true },
    { id: "vibe", type: "ask", prompt: "Which direction feels most like the bride?", inputKind: "choice", choices: ["Poolside & playful", "Foodie & fabulous", "Wellness & slow", "Big night out", "Crafty & cozy"], required: true },
    { id: "draft", type: "generate", instruction: "Draft a three-day itinerary with a visible per-person estimate and realistic booking checklist." },
    { id: "revise", type: "revise", instruction: "Apply buyer feedback only to the affected plan sections and preserve everything else.", maxRevisions: 3, preserveUnchanged: true },
    { id: "deliver", type: "deliver", title: "Your bachelorette weekend plan", artifactKind: "itinerary" },
  ],
  budgets: { maxSteps: 12, maxCostCents: 75, previewMaxCostCents: 15 },
  listingContract: {
    claims: ["A three-day itinerary", "Visible per-person estimates", "Up to three targeted revisions", "A booking checklist"],
    deliverableDescription: "A reviewable weekend itinerary with schedule, budget estimate, and booking list.",
  },
  fallback: { message: "Here is the useful portion of your plan so far. You can keep editing the details manually." },
};

export function validateSpec(spec: RallySpec) {
  const errors: string[] = [];
  const ids = spec.steps.map((step) => step.id);
  if (new Set(ids).size !== ids.length) errors.push("Every block needs a unique id.");
  if (!spec.listingContract.claims.length) errors.push("The listing needs at least one testable claim.");
  if (spec.budgets.maxSteps < spec.steps.length || spec.budgets.maxSteps > 20) errors.push("The step budget must cover the flow and remain within the platform cap.");
  for (const step of spec.steps) if (step.type === "ask" && step.inputKind === "choice" && (!step.choices || step.choices.length < 2)) errors.push(`${step.id} needs at least two choices.`);
  return { valid: errors.length === 0, errors };
}

function num(value: unknown, fallback: number) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }

export function generateBacheloretteArtifact(answers: Record<string, string>): ItineraryArtifact {
  const city = answers.city || "your destination";
  const dates = answers.dates || "your selected weekend";
  const headcount = num(answers.headcount, 6);
  const budget = num(answers.budget, 450);
  const vibe = answers.vibe || "Poolside & playful";
  const destination = destinationFor(city);
  const lodging = Math.round(budget * .46);
  const food = Math.round(budget * .24);
  const activities = Math.round(budget * .2);
  const buffer = budget - lodging - food - activities;
  const signature: Record<string, string> = {
    "Poolside & playful": "Pool afternoon and easy group games",
    "Foodie & fabulous": "Neighborhood tasting or cooking experience",
    "Wellness & slow": "Spa, nature, or restorative afternoon",
    "Big night out": "Easy afternoon and time to get ready",
    "Crafty & cozy": "Creative workshop and cozy dinner in",
  };
  return {
    title: `${vibe} weekend in ${city}`,
    summary: `${dates} · ${headcount} people · $${budget.toLocaleString()} planning allowance per person, not a live price quote. ${destination ? `Research ${destination.activity.toLowerCase()}; keep ${destination.backup.toLowerCase()} as a backup.` : "Confirm local options before paying."}`,
    totalPerPerson: budget,
    days: [
      { label: "Day 1 · arrive gently", items: [{ time: "4:00 PM", title: "Check in + room plan", note: "Confirm access, groceries, sleeping arrangements, and the cancellation contact.", estimatedCost: lodging }, { time: "7:30 PM", title: "Welcome dinner", note: "Choose a flexible reservation close to the stay.", estimatedCost: Math.round(food * .35) }] },
      { label: "Day 2 · the main day", items: [{ time: "10:30 AM", title: "Slow breakfast", note: "Keep the morning forgiving for different arrival energy.", estimatedCost: Math.round(food * .2) }, { time: "1:00 PM", title: destination && !["Wellness & slow", "Crafty & cozy"].includes(vibe) ? destination.activity : signature[vibe] || signature["Poolside & playful"], note: destination ? `Backup: ${destination.backup}. Check availability and the all-in price before booking.` : "Shortlist one primary option and one weather-safe backup before booking.", estimatedCost: activities }, { time: "7:30 PM", title: "Celebration dinner", note: "Verify dietary needs, deposit policy, gratuity, and transportation.", estimatedCost: food - Math.round(food * .35) - Math.round(food * .2) }] },
      { label: "Day 3 · close the loop", items: [{ time: "10:30 AM", title: "Brunch + departures", note: `Leave about $${Math.max(0, buffer)} per person uncommitted for fees, rides, or changes.`, estimatedCost: 0 }] },
    ],
    bookingList: ["Stay with flexible cancellation", "Saturday activity plus backup", "Celebration dinner", "Safe late-night transportation", "Dietary and accessibility confirmations"],
  };
}

export function reviseBacheloretteArtifact(current: ItineraryArtifact, feedback: string, answers: Record<string, string>) {
  const next = structuredClone(current);
  const normalized = feedback.toLowerCase();
  if (/cheap|budget|less|save/.test(normalized)) {
    const activity = next.days[1].items[1];
    const originalCost = activity.estimatedCost;
    activity.title = "Low-cost local activity + pool or park time";
    activity.note = "Choose a free or low-cost anchor and keep only one paid reservation.";
    activity.estimatedCost = Math.round(activity.estimatedCost * .45);
    next.totalPerPerson = current.totalPerPerson - originalCost + activity.estimatedCost;
    next.summary = `${answers.dates} · ${answers.headcount} people · revised planning allowance $${next.totalPerPerson.toLocaleString()} per person, not a quote. Only the activity allowance changed.`;
  } else if (/dinner|restaurant|food/.test(normalized)) {
    const dinner = next.days[1].items[2];
    dinner.title = "Revised celebration dinner";
    dinner.note = "Compare two restaurants with transparent prix-fixe, deposit, dietary, and cancellation terms.";
  } else if (/relax|slow|less busy|fewer/.test(normalized)) {
    next.days[1].items = [next.days[1].items[0], { ...next.days[1].items[1], time: "2:00 PM", title: "One unhurried signature plan", note: "Protect a three-hour open block before dinner.", estimatedCost: next.days[1].items[1].estimatedCost }, next.days[1].items[2]];
  } else {
    next.days[1].items[1].note = `${next.days[1].items[1].note} Buyer note: ${feedback}`;
  }
  return next;
}
