export const originals = [
  {
    slug: "bachelorette-blueprint",
    title: "The Bachelorette Blueprint",
    eyebrow: "THE ONE-STOP PARTY PLANNER",
    image: "/rallies/bachelorette-pool.jpg",
    price: "Free",
    appHref: "/rally/bachelorette",
    blurb: "Bring the guest list, weekend itinerary, lodging options and split bills together in one editable plan.",
    included: ["Lodging budget + stay shortlist", "Guest list + RSVPs", "Budget + payment requests", "Itinerary + booking links", "Organizer notes + packing list", "Downloadable plan + customization prompts"],
    inputs: ["Destination and dates", "Guest list", "Lodging comfort amounts you collect", "Bride’s vibe and must-haves"],
    outputs: ["A realistic shared budget", "A stay shortlist", "A day-by-day itinerary", "A saved plan plus customization prompts"],
    permissions: ["Your saved party plan", "Links you choose to open", "No bank or payment credentials stored by the Rally"],
    color: "coral",
    version: "Launch edition · updated September 2026",
  },
  {
    slug: "garden-planner",
    title: "The Little Garden Planner",
    eyebrow: "A FREE WEATHER-AWARE GARDEN PLAN",
    image: "/rallies/lush-garden.jpg",
    price: "Free",
    appHref: "/rally/garden",
    blurb: "Turn your actual space, sunlight, setup, location, and favorite crops into a garden plan you can use all season.",
    included: ["Rows, beds, pots, or indoor", "Visual growing layout", "Live seven-day weather", "Weather-aware care tasks", "Garden journal", "Downloadable plan + customization prompts"],
    inputs: ["Location", "Growing setup and dimensions", "Daily sunlight", "Crops you actually want to eat"],
    outputs: ["A visual growing layout", "Crop assignments with room to adjust", "Weather-aware care list", "A saved plan plus customization prompts"],
    permissions: ["Approximate location for weather", "Your saved garden plan", "No precise location shared publicly"],
    color: "green",
    version: "Launch edition · updated September 2026",
  },
] as const;

export const findOriginal = (slug: string) => originals.find((item) => item.slug === slug);
