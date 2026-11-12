// Prescriptive bachelorette planning helpers. Pure functions only: every rule
// here is deterministic and unit-tested, and every suggestion the planner
// surfaces must carry a real, openable source link. Nothing is invented.

export type ResolvedPlace = {
  id: number;
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  label: string;
};

export type SuggestionStatus = "todo" | "picked" | "skipped";

export type Suggestion = {
  id: string;
  title: string;
  category: string;
  url: string;
  source: string;
  status: SuggestionStatus;
  note?: string;
  date?: string;
  time?: string;
  venue?: string;
};

export type TicketmasterEvent = {
  id: string;
  name: string;
  url: string;
  date?: string;
  time?: string;
  venue?: string;
  status?: string;
};

// A place label is the display form of a resolved place: name, region, country,
// skipping empty parts. Used for the destination field and for search queries.
export function placeLabel(place: { name: string; region?: string; country?: string }): string {
  return [place.name, place.region, place.country].filter(Boolean).join(", ");
}

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

export function webSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

// Group-size advice, from the firsthand research in the Part 3 spec: the same
// headcount advice does not fit 6, 9, 14, and 20 guests. Tiers follow the
// accounts (Napa 6, Nashville 9, Rosemary Beach 14, Hamptons 20).
export function groupSizeAdvice(count: number): string[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  if (count <= 6) {
    return [
      "A group this size fits one table and one rideshare XL. Hotels, small-group tastings, and walk-in brunch all work well.",
      "One main activity per day still applies — a small group can move fast, which makes over-scheduling tempting.",
    ];
  }
  if (count <= 9) {
    return [
      "Book brunch ahead: a group of 9 can wait 90 minutes and split across two tables.",
      "One rideshare XL will not fit everyone — plan two cars or a van for the group moves.",
    ];
  }
  if (count <= 13) {
    return [
      "At 10+, a party bus or sprinter van usually costs about the same as several XL rideshares — and the ride becomes part of the night.",
      "Call restaurants instead of booking online; party sizes this large often need a phone reservation and a group menu.",
    ];
  }
  if (count <= 19) {
    return [
      "At 14+, restaurants may seat you outside and some activities cap group size — call ahead about indoor seating and group minimums.",
      "Split the group for rideshares (for 14, plan on 3 XLs) or book one party bus and keep everyone together.",
      "Keep one main activity per day and protect downtime: a packed schedule breaks first at this size.",
    ];
  }
  return [
    "At 20, most restaurants cannot seat the group at all — plan dinners at the house and make the house the evening anchor.",
    "Book activities built for large groups (party bus, private venue, boat) and confirm the group cap before any deposit.",
    "Keep the schedule loose with optional labels: at this size the schedule itself is the thing most likely to break.",
  ];
}

export type CategoryLink = { label: string; url: string; note?: string };
export type CategoryCard = { category: string; blurb: string; links: CategoryLink[] };

// Prescriptive bachelorette categories (Part 3 spec, section 3). Every link is
// a live search against a real provider for the trip place — never an invented
// venue. Downtime is deliberately not a link card: it is a schedule prompt, and
// it is handled in the itinerary UI instead of the sourced to-do list.
export function categoryCards(place: string): CategoryCard[] {
  const where = place.trim() || "your destination";
  return [
    {
      category: "Activities",
      blurb: "The main event of each day. Pick one per day and let the rest breathe.",
      links: [
        { label: "Wine tasting", url: mapsSearchUrl(`wine tasting ${where}`) },
        { label: "Spa day", url: mapsSearchUrl(`spa ${where}`) },
        { label: "Boat rental", url: mapsSearchUrl(`boat rental ${where}`) },
        { label: "Cooking class", url: mapsSearchUrl(`cooking class ${where}`) },
        { label: "Dance class", url: mapsSearchUrl(`dance class ${where}`) },
        { label: "Pool day pass", url: mapsSearchUrl(`pool day pass ${where}`) },
      ],
    },
    {
      category: "Hire a pro",
      blurb: "The people who make the weekend feel planned. Book early — lead times run weeks, not days.",
      links: [
        { label: "Private chef", url: webSearchUrl(`private chef bachelorette ${where}`) },
        { label: "Bartender", url: webSearchUrl(`mobile bartender ${where}`) },
        { label: "Photographer", url: webSearchUrl(`bachelorette photographer ${where}`) },
        { label: "Glam team", url: webSearchUrl(`hair makeup glam team ${where}`) },
        { label: "DJ", url: webSearchUrl(`DJ bachelorette party ${where}`) },
        { label: "Driver / party bus", url: webSearchUrl(`party bus sprinter van ${where}`) },
      ],
    },
    {
      category: "Group meals",
      blurb: "Brunch is the anchor meal. For 10+, call the restaurant — online booking often caps the party size.",
      links: [
        { label: "Brunch spots", url: mapsSearchUrl(`brunch ${where}`) },
        { label: "Group-friendly dinner", url: mapsSearchUrl(`group dinner restaurant ${where}`) },
        { label: "Private dining room", url: mapsSearchUrl(`private dining room ${where}`) },
        { label: "OpenTable search", url: `https://www.opentable.com/s?term=${encodeURIComponent(where)}` },
      ],
    },
    {
      category: "Nightlife",
      blurb: "Dinner, then cocktails, then the night out. Check cover, guest list, and dress code before the group commits.",
      links: [
        { label: "Rooftop bars", url: mapsSearchUrl(`rooftop bar ${where}`) },
        { label: "Clubs", url: mapsSearchUrl(`nightclub ${where}`) },
        { label: "Live music bars", url: mapsSearchUrl(`live music bar ${where}`) },
      ],
    },
    {
      category: "What locals recommend",
      blurb: "Past groups and locals know the place better than any template. Search what they actually said.",
      links: [
        { label: `Reddit: bachelorette in ${where}`, url: `https://www.reddit.com/search/?q=${encodeURIComponent(`bachelorette ${where}`)}` },
        { label: `Local guides: ${where} bachelorette`, url: webSearchUrl(`bachelorette party guide ${where}`) },
        { label: `Events in ${where}`, url: webSearchUrl(`events ${where} this weekend`) },
      ],
    },
  ];
}

// A Ticketmaster event becomes a to-do-list suggestion only when it carries a
// real Ticketmaster link (validated server-side). No link, no suggestion.
export function suggestionFromEvent(event: TicketmasterEvent): Suggestion | null {
  if (!event || !event.name || !event.url) return null;
  try {
    const parsed = new URL(event.url);
    if (parsed.protocol !== "https:" || !(parsed.hostname === "ticketmaster.com" || parsed.hostname.endsWith(".ticketmaster.com"))) return null;
  } catch {
    return null;
  }
  return {
    id: `tm-${event.id}`,
    title: event.name,
    category: "Live event",
    url: event.url,
    source: "Ticketmaster",
    status: "todo",
    date: event.date,
    time: event.time,
    venue: event.venue,
    note: event.status && event.status !== "onsale" ? `Status: ${event.status}` : undefined,
  };
}

// The unpicked shortlist is what the packet keeps: everything the buyer did
// not pick, so nothing the group considered is lost.
export function unpickedSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return suggestions.filter((s) => s.status !== "picked");
}
