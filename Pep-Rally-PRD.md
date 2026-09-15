# Pep Rally Product Requirements Document

**Version:** 0.1  
**Status:** Working draft for founder and early product review  
**Last updated:** September 2026  
**Product stage:** Private prototype → first sellable beta

## 1. Executive summary

Pep Rally is a two-sided marketplace for small, working apps made by people who understand a specific everyday problem.

A customer does not buy a prompt, PDF, template, Markdown file, or folder of code. The customer gets a usable mini-app, a private workspace, and the result the app helps them finish. Exports such as Markdown, PDF, calendar, CSV, messages, links, and payment requests make that result portable.

A creator can build a Rally inside Pep Rally or bring an existing mini-app. Pep Rally supplies the difficult commercial and operational layer: listing, preview, identity, hosting, checkout, access, storage, selected connectors, reviews, analytics, updates, customer support, and payouts.

The initial product advantage is curated creator supply and outcome quality—not generic AI app generation. The Bachelorette Blueprint and Little Garden Planner are free reference implementations that teach creators and customers what a complete Rally feels like.

## 2. Product promise

**Someone solved it. Now you can use it.**

Every Rally must help a specific person finish a recognizable job:

1. Bring real context.
2. Receive a useful first result.
3. Review and change it.
4. Save the workspace.
5. Use or export the finished outcome.

## 3. Problem

### For customers

People repeatedly solve small, specific problems with a messy combination of group chats, notes, spreadsheets, search results, PDFs, calculators, and general AI prompts. Full software products are often too broad, while static templates still require the customer to assemble the answer.

Customers need a trustworthy place to discover a focused tool, understand exactly what it does, try it, pay once, and finish the job without installing code or configuring services.

### For creators

People with firsthand expertise already make useful prototypes for themselves, their students, clients, communities, or followers. Many stop before selling because the last mile is difficult: hosting, accounts, payments, storage, APIs, usage limits, customer access, support, and distribution.

Creators need a path from “this worked for me” to “someone else can safely try, buy, and keep it.”

### Why now

AI-assisted building is increasing the supply of small apps faster than infrastructure, quality standards, and distribution are improving. The marketplace opportunity is to make these products legible and commercially usable—not merely easier to generate.

## 4. Target users

### Initial creator profile

A domain expert, practitioner, educator, service provider, or technically curious consumer who:

- Has already solved a repeated problem for themselves or others.
- Can explain the inputs, decisions, and finished outcome.
- Has a prototype, workflow, spreadsheet, guide, prompt system, or audience.
- Does not want to become an infrastructure or payments expert.

Strong early groups include nursing educators and study-guide creators, Etsy sellers, travel advisers, teachers, event organizers, gardeners and growers, caregivers, and local service professionals.

### Initial customer profile

A person with a concrete job to finish who:

- Can recognize the promised outcome from the listing.
- Values a faster or better result enough to pay a small one-time fee.
- Wants guidance and execution, not a blank template.
- Prefers a focused app over learning a larger general-purpose tool.

### Marketplace wedge

Pep Rally remains category-broad, but supply acquisition should be community-specific. Recruit creators from one focused group at a time, prove completed outcomes and sales, then repeat the playbook in the next group.

## 5. Product decisions already made

1. **The app is the product.** A Rally must be usable in the browser and produce a finished result.
2. **Exports support the outcome.** Markdown, PDF, CSV, calendar, and links are useful takeaways, not the primary SKU.
3. **The storefront leads with buying.** Creator acquisition works better when makers can see a credible place to earn.
4. **Creators may build or bring.** Pep Rally supports both an assisted builder and externally built mini-apps.
5. **Free Originals are examples.** Bachelorette and Garden are case studies and acquisition tools, not the definition of Pep Rally.
6. **No remix economy in the first release.** Focus on original products, clear ownership, and direct creator economics.
7. **Trust is part of the product.** Listings disclose inputs, outputs, permissions, maker identity, support, updates, and real usage.
8. **Humans approve consequential actions.** Messages, payments, purchases, bookings, health-related choices, and similar decisions remain reviewable.
9. **The proposed marketplace split is 80/20.** The creator receives 80% before outside processing costs; final economics must be validated before launch.

## 6. What counts as a Rally

A Rally is a hosted interactive product with six required parts:

| Part | Requirement |
|---|---|
| Promise | One sentence describing the finished customer outcome |
| Inputs | The minimum real information needed to create a useful result |
| First result | Useful output appears without requiring a long setup process |
| Review | Assumptions and important choices can be checked or changed |
| Persistence | Progress and the finished result can be saved and reopened |
| Portability or action | The result can be exported, shared, or used to take the next real-world step |

A Rally fails the standard if it is only a landing page, idea description, chat wrapper with no durable result, static download with no execution, or dashboard that begins empty and never helps finish the promised job.

## 7. Core journeys

### Buyer journey

1. Arrive at the marketplace and browse or search by problem, person, or outcome.
2. Open a listing and understand the promise, maker, price, required inputs, permissions, finished result, support, and update history.
3. Try a meaningful preview with example or limited personal inputs.
4. Purchase through hosted checkout.
5. Return to Pep Rally with ownership verified and the Rally unlocked.
6. Enter real context and receive a useful first result.
7. Review, edit, save, and export or act on the outcome.
8. Find the Rally and saved workspace in My Rallies.
9. Leave a verified review after meaningful use.

### Creator journey

1. Choose “Build here” or “Bring an app.”
2. Define the person, situation, current workaround, required inputs, human decisions, and promised outcome.
3. Build the first useful loop or submit a working URL/code project.
4. Select only the capabilities the outcome needs: payments, files, live data, AI, messaging drafts, calendars, maps, or other connections.
5. Complete listing details, ownership assertions, data disclosures, support, pricing, and refund expectations.
6. Pass automated checks and human marketplace review.
7. Publish free or paid access.
8. Monitor visits, preview starts, completed outcomes, sales, refunds, reviews, and failure reports.
9. Publish updates without breaking buyers’ saved work.

## 8. Minimum sellable beta

### P0: required before the first real paid creator Rally

#### Marketplace and listings

- Search and browse by problem, audience, category, and price.
- Distinguish Pep Rally Originals, creator-made Rallies, and clearly labeled concepts.
- Full listing with outcome, screenshots or demo, maker, price, inputs, outputs, permissions, sources, update date, support, and refund terms.
- Real usage and review numbers only.

#### Preview and outcome

- A preview demonstrates the actual product behavior, not boilerplate cards.
- The buyer can reach a representative first useful result.
- The full Rally supports save, reopen, and at least one relevant export or action.
- Mobile use works for the primary journey.

#### Accounts and entitlements

- Pep Rally-owned buyer and creator accounts.
- Purchase creates a durable entitlement tied to the buyer account.
- Paid Rally routes and data reject users without ownership.
- My Rallies includes purchased, free, and saved products.
- Creators cannot access buyers’ private workspace data unless explicitly required and disclosed.

#### Payments and payouts

- Stripe Checkout in test mode, then live mode.
- Verified webhook fulfillment and idempotent purchase records.
- Stripe Connect onboarding for creator identity and payouts.
- Platform fee, processing fee, refund, chargeback, tax, and payout timing shown clearly.
- Admin ability to refund, pause a listing, and hold a payout during a dispute.

#### Creator publishing

- Build-inside specification flow that produces a genuinely functional first loop, or a bring-your-own-app review path.
- Isolated hosting boundary for creator code, with resource limits and no shared secret exposure.
- Version history, review status, publish/unpublish, rollback, and buyer compatibility notes.
- File ownership, acceptable-use, and intellectual-property attestations.

#### Trust and operations

- Marketplace review checklist and rejection reasons.
- Report product, request support, and request refund flows.
- Privacy policy, creator terms, buyer terms, prohibited content, and data-retention rules.
- Logging, error monitoring, rate limits, backups, and cost controls.
- Clear handling for broken connectors or unavailable outside services.

### P1: important after the first paid transaction works

- Creator analytics funnel and cohort reporting.
- Improvement requests and creator replies.
- Product update notifications and release notes.
- Promo codes, gifting, and bundles.
- Category collections and editorial merchandising.
- Standard connector packs with reusable consent and error states.
- Creator storefronts and follow buttons.
- Lightweight buyer sharing or collaboration where the Rally requires it.

### Not in the first release

- A fully autonomous general-purpose app builder.
- A blockchain or token-based ownership system.
- Open publishing without review.
- Unlimited free compute or storage.
- In-app execution of arbitrary creator code without isolation.
- Automatic consequential messages, bookings, or payments without human confirmation.
- Complex derivative-product or remix royalties.
- Native iOS, Android, or desktop applications.

## 9. Delivery and entitlement model

### What the buyer owns

After purchase, the buyer receives:

- Account-level access to the purchased Rally.
- A private workspace containing their inputs and saved state.
- The right to reopen the Rally while Pep Rally supports it, subject to disclosed terms.
- The exports and outputs promised in the listing.
- Updates included by the creator under the listing’s update policy.

The buyer does not automatically receive the creator’s source code, API credentials, private datasets, or redistribution rights.

### If a Rally is removed

- New sales stop immediately.
- Existing buyers keep access during a defined continuity period when safe and technically possible.
- Buyers can export their outcome and data.
- Pep Rally communicates whether the product is paused, replaced, refunded, or permanently retired.

## 10. Connector and capability model

Pep Rally should offer capabilities as understandable building blocks rather than expose raw API configuration to novice creators.

| Capability | Customer experience | Creator experience | Human boundary |
|---|---|---|---|
| Checkout | Secure hosted payment | Choose price and see net proceeds | Customer confirms payment |
| Creator payouts | Clear marketplace seller | Complete managed onboarding | Platform may hold disputed payouts |
| Files | Upload and retrieve private material | Declare types, size, and retention | Sensitive data restrictions apply |
| Weather/live data | Current sourced information | Choose approved provider | Failure shows stale/unavailable state |
| Email/text | Review a prepared message | Configure templates and consent | User sends or explicitly authorizes |
| Maps/reservations | Compare and open provider | Configure approved handoffs | User verifies availability and books |
| Calendar | Download or add events | Define event schema | User confirms calendar write |
| AI | Draft, organize, compare, or transform | Select bounded task and budget | Important claims and actions are reviewable |

Each capability must define its source of truth, freshness, permission, failure behavior, usage cost, and customer disclosure. A connector is not labeled live until it is callable and tested in the production environment.

## 11. Creator economics and milestones

The proposed default split is 80% to the creator and 20% to Pep Rally before outside processing costs. This must be validated against support, refunds, infrastructure, AI usage, tax, and payment costs.

Proposed milestone program:

| Level | Qualification | Unlock |
|---|---|---|
| Published | Pass review and publish first Rally | Listing, basic hosting, usage dashboard |
| Used | 25 completed customer outcomes and acceptable reliability | Additional monthly hosting/storage allowance |
| Proven | $500 cumulative GMV, low refund rate, and strong reviews | AI/API credits and richer analytics |
| Breakout | $2,500 monthly GMV with sustained quality | Higher limits, prioritized support, partner capability credits |

Thresholds are starting hypotheses. Unlocks must be capped, non-transferable, economically sustainable, and based on completed outcomes—not page views alone.

## 12. Quality and marketplace review

Every Rally must pass:

1. **Outcome review:** the promise is specific and achievable.
2. **Functional review:** representative inputs reach the promised result.
3. **Awkward-case review:** empty, invalid, partial, and edge-case inputs behave safely.
4. **Data review:** collection, storage, sharing, and retention match disclosures.
5. **Connection review:** outside sources and actions work and fail understandably.
6. **Content review:** the creator owns or may use the material.
7. **Commercial review:** price, support, updates, and refund expectations are clear.
8. **Safety review:** high-stakes outputs include appropriate limits and human decisions.

Pep Rally may pause products that are broken, misleading, unsafe, infringing, abandoned, or generating excessive disputes.

## 13. Reference implementations

### Bachelorette Blueprint

**Person:** an organizer coordinating a group trip.  
**Outcome:** a group-aligned, budget-aware weekend plan people can act on.  
**Inputs:** destination, dates, vibe, guest needs, contribution comfort, lodging, places, costs, and responsibilities.  
**First result:** a working budget, lodging ceiling, itinerary, task plan, and group update.  
**Portable result:** downloadable Markdown plan, message drafts, provider links, maps, and calendar handoff.  
**Human decisions:** guests choose contributions; organizer approves requests, reservations, purchases, and messages.

### Little Garden Planner

**Person:** a home gardener with a specific space and location.  
**Outcome:** a maintainable layout and current week of garden actions.  
**Inputs:** location, rows/beds/pots, dimensions, sun, watering, experience, goals, and crops.  
**First result:** prioritized crops, layout, and weather-aware care guidance.  
**Portable result:** downloadable Markdown plan and persistent journal.  
**Human decisions:** gardener confirms local planting, soil, pest, and safety guidance.

## 14. Success metrics

### North-star metric

**Completed buyer outcomes per week:** the number of unique buyer workspaces that reach a Rally-defined finish event, excluding creator tests and repeated refreshes.

This is stronger than visits, generated apps, or gross listings because it measures whether the marketplace delivered useful work.

### Beta metrics

| Area | Metric | Initial target |
|---|---|---:|
| Supply | Reviewed creator Rallies published | 20 in the first focused cohort |
| Activation | Listing visitors who start a meaningful preview | 25%+ |
| Outcome | Preview starters who reach a first useful result | 50%+ |
| Commerce | Qualified listing visitors who purchase | 5%+ |
| Use | Buyers who complete the core outcome within 7 days | 60%+ |
| Quality | Paid-order refund rate | Under 8% |
| Reliability | Outcome attempts completed without blocking failure | 98%+ |
| Creator value | Creators with at least one completed buyer outcome | 50%+ |
| Retention | Buyers returning to a saved Rally within 30 days | Track by Rally type before setting target |

All targets are hypotheses for the beta, not public claims. Segment them by free versus paid, category, creator, price, and new versus returning customer.

## 15. Instrumentation events

- Marketplace viewed
- Search or category selected
- Listing viewed
- Preview started
- Required input completed
- First useful result created
- Checkout started
- Purchase verified
- Rally opened after purchase
- Workspace saved
- Outcome completed
- Export or external action used
- Review submitted
- Refund or support request created
- Creator submitted, approved, published, updated, paused
- Connector succeeded, failed, or required reauthorization

Each Rally must define its own `outcome_completed` condition during review.

## 16. Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Low-quality AI wrappers flood supply | Buyers lose trust | Curated review, outcome standard, real previews, creator identity |
| Marketplace has no initial liquidity | Neither side sees value | Recruit focused creator cohorts and merchandise free Originals |
| Buyers cannot tell ideas from products | Creates false expectations | Separate shelves and unmistakable working/preview/concept labels |
| Creator apps break or disappear | Buyers lose purchased access | Managed hosting or uptime requirements, versioning, continuity policy |
| AI/API costs exceed revenue | Breaks unit economics | Usage budgets, per-Rally caps, caching, milestone-based credits |
| Unsafe or misleading advice | Customer harm and platform risk | Category restrictions, disclosures, human review points, reporting |
| Payments/payout complexity delays launch | No credible marketplace transaction | Use Stripe Checkout + Connect; keep money movement out of Rally code |
| Creators do not bring distribution | Supply without demand | Choose creators with communities; provide shareable previews and attribution |
| Platform becomes too broad to explain | Weak positioning | Keep one universal outcome standard and recruit category by category |

## 17. Launch sequence

### Phase 0: private proof

- Demonstrate two free reference Rallies end to end.
- Recruit 5–10 creators with already-built or strongly specified tools.
- Observe whether customers understand “app → outcome → export.”
- Test listing language, preview depth, and willingness to pay.

### Phase 1: concierge paid beta

- Launch 10–20 reviewed Rallies in one or two creator communities.
- Operate creator review, listing production, support, and refunds manually.
- Complete the first real purchase, entitlement, outcome, review, and payout loops.
- Measure cost and support burden for each completed outcome.

### Phase 2: repeatable creator onboarding

- Productize review, versioning, analytics, connector packs, and milestone credits.
- Expand one community at a time using the proven recruitment and merchandising playbook.
- Add public accounts and sharing only after trust and entitlement systems are stable.

## 18. Acceptance criteria for first real transaction

A first paid Rally is launch-ready only when:

- A new customer can understand the promise and required inputs without founder explanation.
- The working preview resembles the purchased product and reaches a useful sample result.
- Checkout succeeds and a verified payment creates exactly one entitlement.
- An unauthorized account cannot access the full product or another customer’s workspace.
- The buyer reaches, saves, reopens, and exports the promised outcome.
- The buyer can request support, report a problem, and understand refund terms.
- The creator can see the sale and expected net proceeds.
- The payout path, platform fee, processing fee, refund, and chargeback treatment are documented.
- A broken connector has a useful fallback and does not silently produce false output.
- Pep Rally can pause the product without losing the buyer’s exportable data.

## 19. Open decisions

1. Is Pep Rally the merchant of record, or does each creator sell through a connected account?
2. What default refund window best fits low-cost digital apps with immediate access?
3. Which one or two creator communities should form the first concierge beta?
4. Which creator code formats will Pep Rally host first, and what isolation model is required?
5. How much of the build-inside flow is generated automatically versus assembled from reviewed capability blocks?
6. What is the minimum preview that protects creator value while proving the outcome?
7. Which categories require domain-expert review or should remain prohibited at launch?
8. What continuity promise can Pep Rally economically make if a creator stops maintaining a product?
9. Should the first paid products use one-time pricing only, or may a Rally charge a subscription for recurring data and operating costs?

## 20. Immediate next steps

1. Use the private demo to collect five reactions specifically about what the buyer believes they receive.
2. Choose one creator cohort for the concierge beta.
3. Recruit five candidate creators with existing useful prototypes or repeatable workflows.
4. Select one low-risk paid Rally and turn its generic preview into a domain-specific working loop.
5. Configure Stripe test credentials and complete the purchase/entitlement test.
6. Decide the payout and refund model before accepting real money.
7. Write the first creator review checklist and buyer terms in plain language.
8. Measure completed outcomes from the free Bachelorette and Garden Rallies.

---

## Working product thesis

The world will not lack tiny AI apps. It will lack trusted places where a person can discover the right one, see that it works, pay safely, keep the outcome, and know who stands behind it. Pep Rally wins by making creators legible, useful, and commercially complete.
