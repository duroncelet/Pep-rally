// Schedule guardrails for the Bachelorette itinerary. Pure functions, unit
// tested. Over-scheduling is the #1 itinerary failure in the firsthand
// research (the 25-friends story: early wake-ups + an action-packed schedule
// → slept-through brunch, the bride leaving in tears). The rule is buffers
// and flow, not a hard count — so these are warnings, never blocks.

export type EventRequirement = "required" | "optional";

export type SchedulableEvent = {
  day: number;
  time: string;
  title: string;
  required?: EventRequirement;
};

export type DayWarning = {
  kind: "packed" | "tight-gap" | "early-start" | "no-downtime";
  message: string;
};

// Parses "7:30 PM", "7:30PM", "19:30", "9 AM". Returns minutes after midnight,
// or null for untimed entries ("Time TBD", "Flexible", "").
export function parseTimeToMinutes(time: string): number | null {
  const value = (time || "").trim();
  if (!value) return null;
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*([aApP][mM])?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toLowerCase();
  if (minute < 0 || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

const DOWNTIME_WORDS = ["pool", "slow", "free time", "free-time", "recovery", "rest", "brunch", "chill", "downtime", "spa", "nap"];

export function isDowntimeTitle(title: string): boolean {
  const lower = (title || "").toLowerCase();
  return DOWNTIME_WORDS.some((word) => lower.includes(word));
}

// One day's guardrail check. Main activities are timed events that are not
// optional and not downtime; the research supports one main activity per day
// with flow, so two is a nudge and three is a warning. Gaps under 60 minutes
// between timed events get a travel-time warning. A first event before 9:30 AM
// gets the early-start warning — "do not schedule a 9:00 AM brunch" is
// confirmed by the 25-friends story.
export function analyzeDay(events: SchedulableEvent[], day: number): DayWarning[] {
  const warnings: DayWarning[] = [];
  const dayEvents = events.filter((e) => e.day === day);
  if (!dayEvents.length) return warnings;
  const timed = dayEvents
    .map((e) => ({ event: e, minutes: parseTimeToMinutes(e.time) }))
    .filter((item): item is { event: SchedulableEvent; minutes: number } => item.minutes !== null)
    .sort((a, b) => a.minutes - b.minutes);
  const main = timed.filter(({ event }) => event.required !== "optional" && !isDowntimeTitle(event.title));
  if (main.length >= 3) {
    warnings.push({ kind: "packed", message: `Day ${day} has ${main.length} main activities. Over-scheduling is the most common itinerary failure — consider making one optional or moving it.` });
  }
  for (let i = 1; i < timed.length; i++) {
    const gap = timed[i].minutes - timed[i - 1].minutes;
    if (gap < 60) {
      warnings.push({ kind: "tight-gap", message: `Day ${day}: “${timed[i - 1].event.title}” and “${timed[i].event.title}” are ${gap} minutes apart. Allow travel time between venues — groups move slower than one person.` });
    }
  }
  if (timed.length && timed[0].minutes < 570) {
    warnings.push({ kind: "early-start", message: `Day ${day} starts at ${timed[0].event.time}. Firsthand advice: do not schedule a 9:00 AM brunch — the group will sleep through it.` });
  }
  const hasDowntime = dayEvents.some((e) => e.required === "optional" || isDowntimeTitle(e.title));
  if (timed.length >= 2 && !hasDowntime) {
    warnings.push({ kind: "no-downtime", message: `Day ${day} has no downtime or optional block. Leave room for the itinerary to breathe — a slow morning or pool afternoon keeps the weekend from breaking.` });
  }
  return warnings;
}

export function analyzeItinerary(events: SchedulableEvent[]): Array<{ day: number; warnings: DayWarning[] }> {
  const days = [...new Set(events.map((e) => e.day))].sort((a, b) => a - b);
  return days.map((day) => ({ day, warnings: analyzeDay(events, day) })).filter((d) => d.warnings.length > 0);
}
