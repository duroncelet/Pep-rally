import type { OutcomeDocument } from "./outcome-document";

// Part 1B, step B5: sample outcomes — finished examples the visitor opens
// first, clicks through, and replaces with her own details. Bachelorette +
// Garden first; the rest follow the same shape.
//
// These are explicitly labeled SAMPLES, rendered with a sample banner on the
// public page. Names are first names only, stays and activities are generic
// descriptions, and figures are illustrative example amounts — never a real
// person's plan, a real listing, or a price claim about a real place.
export type SampleOutcome = { rallySlug: string; document: OutcomeDocument };

const bacheloretteSample: OutcomeDocument = {
  title: "Ari's Bachelorette",
  subtitle: "Palm Springs · May 1 — May 3",
  sections: [
    { heading: "The weekend", columns: ["Day", "Time", "Plan", "Est. each (USD)", "Status"], rows: [
      ["Day 1", "5 PM", "Pool welcome", "$0.00", "Booked"],
      ["Day 2", "10 AM", "Brunch downtown", "$35.00", "Booked"],
      ["Day 2", "7 PM", "Group dinner", "$60.00", "Shortlisted"],
      ["Day 3", "11 AM", "Slow morning + checkout", "$0.00", "Idea"],
    ] },
    { heading: "Stay shortlist", paragraphs: [
      "Desert House · Top choice · $1200.00 USD total · Free cancellation to Apr 20",
      "Palm Court Hotel · Considering · $980.00 USD total · Free cancellation to Apr 25",
    ] },
    { heading: "Packing", paragraphs: ["☐ Swimsuit", "☐ Comfortable shoes", "☐ Sunscreen", "☐ A note for the bride"] },
    { heading: "Group and RSVP", columns: ["Guest", "RSVP"], rows: [["Dana", "Yes"], ["Lee", "Yes"], ["Jo", "Maybe"], ["Priya", "Yes"]] },
    { heading: "Suggested repayments", paragraphs: ["Dana pays Lee $60.00 USD", "Jo pays Dana $25.00 USD", "These are calculated suggestions, not bank confirmations. Recorded contributions are included only when a fund holder has been selected."] },
  ],
};

const gardenSample: OutcomeDocument = {
  title: "The Portland Garden",
  subtitle: "Portland · 6-8 hours · 2 plots",
  sections: [
    { heading: "This week", paragraphs: ["Rain likely Thursday — hold off watering.", "Water the seedlings — This week", "Thin the lettuce — This week"] },
    { heading: "Bed 1", paragraphs: ["Raised bed · 8 × 4 ft. Crop groups, not plant counts. Check variety spacing before planting."], grid: { columns: 2, cells: ["Tomatoes", "Lettuce", "Open", "Open"] } },
    { heading: "Bed 2", paragraphs: ["In-ground · 6 × 4 ft. Crop groups, not plant counts. Check variety spacing before planting."], grid: { columns: 2, cells: ["Beans", "Herbs", "Open", "Open"] } },
    { heading: "My planting calendar", paragraphs: [
      "Zone: 8b. Last frost: 2027-04-10. First frost: 2027-11-01.",
      "Source: gardener-recorded. These are gardener-recorded dates, not guarantees or an automatic local lookup.",
      "Tomatoes: outdoor target 2027-05-10; planted not recorded; packet harvest range 60–80 days.",
      "Lettuce: outdoor target 2027-04-15; planted 2027-04-12; packet harvest range 45–60 days.",
    ] },
    { heading: "Care board", paragraphs: ["To do: Water the seedlings - This week", "To do: Thin the lettuce - This week", "Done: Mulch Bed 1 - Last week"] },
    { heading: "Forecast note", paragraphs: ["Forecast for Portland, loaded during this session. Source: Open-Meteo.", "Forecasts change; refresh in the live garden before making a weather-dependent decision."] },
  ],
};

// Reserved slugs. They contain hyphens and exceed 12 characters, so they can
// never collide with a generated outcome slug (12 chars, no hyphens).
export const SAMPLE_OUTCOMES: Record<string, SampleOutcome> = {
  "sample-bachelorette-blueprint": { rallySlug: "bachelorette-blueprint", document: bacheloretteSample },
  "sample-garden-planner": { rallySlug: "garden-planner", document: gardenSample },
};

export function findSampleOutcome(slug: string): SampleOutcome | null {
  return SAMPLE_OUTCOMES[slug] ?? null;
}

export function sampleOutcomeHref(rallySlug: string): string | null {
  const slug = `sample-${rallySlug}`;
  return SAMPLE_OUTCOMES[slug] ? `/s/${slug}` : null;
}
