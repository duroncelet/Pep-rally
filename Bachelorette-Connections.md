# Bachelorette planner — connections and verification

Updated September 21, 2026. Production: https://peprally.fun/rally/bachelorette

## What is connected

- Weather: server-side National Weather Service forecasts for Palm Springs, Nashville, New Orleans, Austin and Chicago. No customer credential required. Responses cached for 15 minutes. Dates outside the forecast window show an explicit limitation, not substitute weather. Provider failures include an official forecast link.
- OpenTable: external reservation search with city, requested date/time and party size. Guests must verify those fields and complete the booking with the provider. Large-party inquiries include deposit, cancellation, dietary, accessibility and all-in pricing questions.
- Ticketmaster: server-side Discovery API route with city and local trip-date filters, five-minute response cache and a 12-second timeout. It needs `TICKETMASTER_API_KEY` in the Cloudflare worker secret store. Never put the key in a public client variable or Git. Without it, the UI explains the limitation and offers external search. Ticket sales remain on Ticketmaster.
- Money: organizer-owned PayPal.Me, Cash App or Venmo links; no automatic payment confirmation. The paid-bill ledger calculates equal shares per selected participant in integer cents, nets multiple payers and suggests repayments. It is separate from trip-fund contributions and budget estimates. No automatic settlement tracking.

## Required owner actions

1. Register a Ticketmaster developer application and add its API key as the worker secret `TICKETMASTER_API_KEY`. Re-test a known concert date and city, empty results and invalid-key behavior. No key has been created or purchased by this build.
2. Apply to OpenTable's partner program if embedded availability/reservations are desired. This release does not claim API access or confirmed tables.
3. Do not use Pep Rally's marketplace Stripe merchant account to collect money on behalf of trip organizers. Organizer payment routing needs a separately designed, reviewed flow. The party UI no longer offers platform-created Stripe links.

## Planning coverage

Bride preferences and boundaries; dates; guest RSVPs; dietary/accessibility needs; private budget conversations; lodging comparisons and cancellation terms; itinerary; group dinner inquiry; concerts; weather and backup activities; optional outfits; packing; responsibilities; safe transportation; bill repayments; Markdown plan export. Workspace saving includes the paid-bill ledger. Draft itinerary can be applied to the editable itinerary rather than remaining a separate preview.

## Still limited

- Organizer workspace, not synchronized multi-user group chat. Budget amounts are visible in the workspace and should not be represented as a private remote survey.
- Guest drafts remain in the current browser visit. Download before leaving; account saving requires sign-in.
- Destination content is researched inspiration, not live inventory, a price quote or a venue recommendation guarantee.
- No booking, outbound email/text, money transfer or purchase is executed automatically.

## Research sources

- Palm Springs: https://www.visitgreaterpalmsprings.com/weddings/bachelorette-parties/
- Nashville: https://www.visitmusiccity.com/nashville-businesses/pontoon-saloon/7654
- New Orleans: https://www.neworleans.com/weddings/blog/post/the-perfect-itinerary-for-your-new-orleans-bachelorette-party/
- Austin: https://www.austintexas.org/austin-insider-blog/blog/post/bachelorette-weekend/
- Chicago: https://www.choosechicago.com/blog/dining/4-hip-fun-flirty-chicago-bachelorette-party-ideas/
- NWS: https://www.weather.gov/documentation/services-web-api
- Ticketmaster: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- OpenTable: https://docs.opentable.com/ and https://www.opentable.com/restaurant-solutions/api-partners/faqs/

## Release checks

Production build plus 15 automated tests, including bill remainder allocation, net settlements, invalid amounts, destination aliases and impossible/reversed dates. Browser checks and live API checks should supplement source-level regression tests. TypeScript also reports existing missing Cloudflare/raw-import declaration types outside these changes; the production build remains the executable release check.
