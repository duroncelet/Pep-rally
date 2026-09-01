export const originals = [
  {
    slug: "bachelorette-blueprint",
    title: "The Bachelorette Blueprint",
    eyebrow: "THE ONE-STOP PARTY PLANNER",
    image: "/rallies/bachelorette-pool.jpg",
    price: "Free",
    appHref: "/rally/bachelorette",
    blurb: "Plan the people, money, places, reservations, itinerary, décor, packing, and group updates—without running the weekend from twelve different apps.",
    included: ["Anonymous stay budget + lodging picker", "Guest list + RSVPs", "Budget + payment requests", "Itinerary + reservations", "Group updates + chat", "Décor + packing lists"],
    inputs: ["Destination and dates", "Guest list", "Everyone’s private comfort range", "Bride’s vibe and must-haves"],
    outputs: ["A realistic shared budget", "A stay shortlist", "A day-by-day itinerary", "Assignments, payment requests, and updates"],
    permissions: ["Your saved party plan", "Links you choose to open", "No bank or payment credentials stored by the Rally"],
    color: "coral",
    version: "Launch edition · updated August 2026",
  },
  {
    slug: "garden-planner",
    title: "The Little Garden Planner",
    eyebrow: "A FREE WEATHER-AWARE GARDEN PLAN",
    image: "/rallies/lush-garden.jpg",
    price: "Free",
    appHref: "/rally/garden",
    blurb: "Turn your actual space, sunlight, setup, location, and favorite crops into a garden plan you can use all season.",
    included: ["Rows, beds, pots, or indoor", "Visual growing layout", "Live seven-day weather", "Weather-aware care tasks", "Editable crop plan", "Garden journal"],
    inputs: ["Location", "Growing setup and dimensions", "Daily sunlight", "Crops you actually want to eat"],
    outputs: ["A visual growing layout", "Crop and spacing plan", "Weather-aware care list", "A living garden journal"],
    permissions: ["Approximate location for weather", "Your saved garden plan", "No precise location shared publicly"],
    color: "green",
    version: "Launch edition · updated August 2026",
  },
] as const;

export const findOriginal = (slug: string) => originals.find((item) => item.slug === slug);
