import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships a clear build-and-marketplace homepage", async () => {
  const [page, builder, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/build/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Pep Rally/);
  assert.match(page, /THE MARKETPLACE FOR EVERYDAY MINI-APPS/);
  assert.match(page, /Make money from what you built/);
  assert.match(page, /FOR PEOPLE SHOPPING/);
  assert.match(page, /FREE · READY TO USE/);
  assert.doesNotMatch(page, /Get the Blueprint · \$18|test checkout/i);
  assert.match(page, /The working app/);
  assert.match(page, /Keep the outcome/);
  assert.match(page, /bachelorette-pool\.jpg/);
  assert.match(page, /lush-garden\.jpg/);
  assert.doesNotMatch(page, /moat|royalty|marketplace fee|funded roadmap|launchpad|pilot cohort/i);
  assert.match(page, /SHOP THE MARKETPLACE/);
  assert.match(page, /Small apps\. Real outcomes/);
  assert.match(page, /Put it on the shelf/);
  assert.doesNotMatch(page, /starter-grid/);
  assert.match(page, /PEP RALLY FAQ/);
  assert.match(page, /href="#faq">FAQ/);
  assert.doesNotMatch(page + layout, /useful little app/i);
  assert.match(page, /Try a complete Rally/);
  assert.ok(page.indexOf('id="free"') < page.indexOf('id="marketplace"'));
  assert.ok(page.indexOf('id="marketplace"') < page.indexOf('id="creators"'));
  assert.match(builder, /MAKE A RALLY/);
  assert.match(builder, /Upload or link your mini-app/);
  assert.match(builder, /Publish to marketplace/);
  assert.match(builder, /MY RALLY STUDIO/);
  assert.match(builder, /Take payments/);
  assert.match(builder, /Send text messages/);
  assert.match(builder, /Use live weather/);
  assert.match(builder, /Available by request/);
  assert.match(css, /\.consumer-home/);
  assert.match(css, /\.product-grid/);
  assert.match(css, /\.build-workbench/);
});

test("includes durable review storage and deployable assets", async () => {
  const [schema, route, migration, creatorRoute, creatorMigration] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/marketplace/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_light_lucky_pierre.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/creator-apps/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0007_icy_yellowjacket.sql", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /rallyReviews/);
  assert.match(route, /Use or save this Rally before reviewing it/);
  assert.match(migration, /CREATE TABLE `rally_reviews`/);
  assert.match(route, /creatorApps/);
  assert.match(route, /published/);
  assert.match(creatorRoute, /export async function PATCH/);
  assert.match(creatorRoute, /publish/);
  assert.match(creatorMigration, /creator_name/);
  await Promise.all([
    access(new URL("../public/rallies/bachelorette-pool.jpg", import.meta.url)),
    access(new URL("../public/rallies/lush-garden.jpg", import.meta.url)),
    access(new URL("../public/downloads/Pep-Rally-Source.zip", import.meta.url)),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);
});

test("offers the product brief as a Markdown download", async () => {
  const route = await readFile(new URL("../app/api/product-brief/route.ts", import.meta.url), "utf8");
  assert.ok(route.includes("text/markdown"));
  assert.ok(route.includes('attachment; filename="Pep-Rally-Product-Brief.md"'));
  assert.match(route, /The product promise/);
});

test("ships a usable sign-in product and downloadable outcomes", async () => {
  const [home, demo, bachelorette, garden, workspace, helper, customization] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rally/bachelorette/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rally/garden/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rally/market/[slug]/RallyWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/download-markdown.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/customization-kit.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(home, /href="\/demo">Demo/);
  assert.match(home, /Sign in \/ My Rallies/);
  assert.match(home, /Why do I sign in/);
  assert.match(demo, /redirect\("\/"\)/);
  for (const source of [bachelorette, garden, workspace]) assert.match(source, /Customize this Rally \.md|Download customization prompts \.md/);
  for (const source of [bachelorette, garden, workspace]) assert.match(source, /Download my (plan|outcome) \.md/);
  assert.match(bachelorette, /Money snapshot/);
  assert.match(garden, /weather-aware actions/);
  assert.match(bachelorette, /bachelorette-pool\.jpg/);
  assert.match(garden, /lush-garden\.jpg/);
  assert.match(bachelorette + garden, /photo-rally-header/);
  assert.match(bachelorette + garden, /127\.0\.0\.1/);
  assert.match(helper, /URL\.createObjectURL/);
  for (const tool of ["ChatGPT", "Claude", "Gemini", "Codex", "Cursor", "Replit Agent"]) assert.match(customization, new RegExp(tool));
  assert.match(customization, /Pep Rally source ZIP/);
  assert.match(customization, /Not the executable app code by itself/);
  assert.match(customization, /Never paste API keys or payment credentials/);
});

test("offers a decision-ready product requirements document", async () => {
  const [prd, route] = await Promise.all([
    readFile(new URL("../Pep-Rally-PRD.md", import.meta.url), "utf8"),
    readFile(new URL("../app/api/prd/route.ts", import.meta.url), "utf8"),
  ]);

  for (const section of ["Executive summary", "Core journeys", "Minimum sellable beta", "Delivery and entitlement model", "Creator economics and milestones", "Success metrics", "Acceptance criteria for first real transaction", "Open decisions"]) assert.match(prd, new RegExp(section));
  assert.match(prd, /The app is the product/);
  assert.match(prd, /Completed buyer outcomes per week/);
  assert.match(route, /text\/markdown/);
  assert.match(route, /Pep-Rally-PRD-v0\.1\.md/);
});

test("offers a code-inclusive technical handoff", async () => {
  const route = await readFile(new URL("../app/api/technical-handoff/route.ts", import.meta.url), "utf8");
  assert.ok(route.includes("text/markdown"));
  assert.ok(route.includes('attachment; filename="Pep-Rally-Technical-Handoff.md"'));
  assert.match(route, /Stripe checkout/);
  assert.match(route, /Core outcome contract/);
  assert.match(route, /```tsx/);
});

test("ships both executable Rally workspaces", async () => {
  const [bachelorette, garden, weather, gardenHub, schema, migration] = await Promise.all([
    readFile(new URL("../app/rally/bachelorette/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rally/garden/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/garden-weather/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/garden-hub/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_calm_karen_page.sql", import.meta.url), "utf8"),
  ]);

  for (const feature of ["ANONYMOUS BUDGET PULSE", "Hotels", "Airbnb", "VRBO", "GROUP CHAT", "MONEY", "PLACES + RESERVATIONS", "DÉCOR + DETAILS", "PACKING + SAFETY"]) assert.match(bachelorette, new RegExp(feature.replace(/[+]/g, "\\+")));
  for (const feature of ["Rows / in-ground", "Raised beds", "Pots / containers", "LIVE WEATHER", "GARDEN JOURNAL"]) assert.match(garden, new RegExp(feature.replace(/[\/]/g, "\\/")));
  assert.match(weather, /api\.open-meteo\.com/);
  assert.match(weather, /geocoding-api\.open-meteo\.com/);
  assert.match(gardenHub, /gardenPlans/);
  assert.match(schema, /gardenPlans/);
  assert.match(migration, /CREATE TABLE `garden_plans`/);
  await Promise.all([
    access(new URL("../dist/server/index.js", import.meta.url)),
    access(new URL("../dist/client", import.meta.url)),
  ]);
});

test("keeps the public connection page consumer-safe while preserving secure connection infrastructure", async () => {
  const [page, route, builder, checkout, stripe, webhook, success, schema, migration] = await Promise.all([
    readFile(new URL("../app/connections/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/connections/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/build/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/checkout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/stripe.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/purchase/success/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_mute_vampiro.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /CONNECTIONS \+ PERMISSIONS/);
  for (const feature of ["Helpful tools", "YOU APPROVE THE FINAL STEP", "YOUR INFORMATION", "Payment requests"]) assert.match(page, new RegExp(feature));
  assert.doesNotMatch(page, /NEEDS ONE PRIVATE ACCOUNT|DEALS PEP RALLY SHOULD MAKE|private credential|ChatGPT plugin|OPENAI_API_KEY|STRIPE_SECRET_KEY/);
  assert.match(route, /STRIPE_SECRET_KEY/);
  assert.match(route, /OPENAI_API_KEY/);
  assert.match(route, /Boolean\(env\.DB\)/);
  assert.match(route, /Boolean\(env\.ASSETS\)/);
  assert.match(builder, /Everything around the mini-app, together/);
  assert.match(checkout, /isStripeTestMode/);
  assert.doesNotMatch(checkout, /test_succeeded/);
  assert.match(stripe, /payment_status/);
  assert.match(stripe, /onConflictDoNothing/);
  assert.match(webhook, /stripe-signature/);
  assert.match(success, /PAYMENT VERIFIED · ACCESS UNLOCKED/);
  assert.match(schema, /stripeSessionId/);
  assert.match(schema, /fulfilledAt/);
  assert.match(migration, /stripe_session_id/);
  assert.match(migration, /idx_purchases_stripe_session/);
});

test("ships marketplace discovery, product trust, libraries, analytics, and a concrete outcome standard", async () => {
  const [page, catalog, concept, product, reviewPanel, library, builder, creatorApi, schema, migration, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/discover/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/[slug]/ReviewPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/library/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/build/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/creator-apps/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0009_smooth_whistler.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Search by problem or person/);
  assert.match(page, /THE PEP RALLY BUYER PROMISE/);
  for (const promise of ["Try it first", "Know what connects", "You stay in control"]) assert.match(page, new RegExp(promise));
  assert.doesNotMatch(page, /Try the outcome|No mystery|Human say/);
  assert.match(page, /WHAT COUNTS AS A RALLY/);
  assert.match(page, /Open it\. Finish something\. Keep the result/);
  assert.match(page, /The working app/);
  assert.match(page, /Why do I sign in/);
  for (const idea of ["NCLEX Study Sprint", "Etsy Profit & Pricing Desk", "Flashcard Shop Studio", "Travel Proposal Studio", "Farmers Market Morning Board", "IEP Meeting Organizer"]) assert.match(catalog, new RegExp(idea.replace(/[&]/g, "\\&")));
  assert.match(catalog, /official 2026 NCLEX-RN test plan/);
  assert.match(concept, /PurchaseButton/);
  assert.match(concept, /Try the working preview/);
  assert.match(concept, /Build this Rally instead/);
  assert.doesNotMatch(concept, /Build this idea|Build the product you wish existed/);
  assert.match(product, /What you bring/);
  assert.match(product, /DATA \+ PERMISSIONS/);
  assert.match(product, /Pep Rally buyer promise/);
  assert.match(reviewPanel, /Reviews can only be left after someone saves and uses this Rally/);
  assert.match(library, /Every Rally you save or buy lives here as a working workspace/);
  assert.match(builder, /LISTING QUALITY CHECK/);
  assert.match(builder, /Starting with the/);
  assert.match(builder, /launch checks/);
  assert.match(creatorApi, /paid_and_unlocked/);
  assert.match(creatorApi, /Strengthen the outcome and maker story/);
  assert.doesNotMatch(page + product + builder + schema, /adapt|remix|lineage|parentSlug|parentTitle/i);
  assert.match(migration, /DROP COLUMN `parent_slug`/);
  assert.match(css, /\.idea-grid/);
  assert.match(css, /\.pdp-hero/);
  assert.match(css, /\.library-grid/);
});

test("turns marketplace previews into usable, purchase-gated Rally flows", async () => {
  const [home, catalog, workspace, results, customization, purchaseButton, checkout, stripe, library, accessRoute, ralliesRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/rally/market/[slug]/RallyWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rally-results.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/customization-kit.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/discover/[slug]/PurchaseButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/checkout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/stripe.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/library/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/rally-access/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/rallies/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(home, /PEP RALLY STARTERS · PREVIEW ONE/);
  assert.match(home, /href=\{`\/discover\/\$\{rally\.slug\}`\}/);
  assert.doesNotMatch(catalog, /status: "idea"/);
  assert.match(workspace, /Create my working result/);
  assert.match(workspace, /Save to My Rallies/);
  assert.match(workspace, /YOUR OUTCOME/);
  assert.match(workspace, /createWorkingResult/);
  assert.match(workspace, /WORKING PREVIEW COMPLETE/);
  assert.match(workspace, /access === "unlocked"/);
  for (const slug of ["nclex-study-sprint", "etsy-profit-pricing-desk", "travel-proposal-studio", "farmers-market-morning-board", "iep-meeting-organizer", "roommate-move-out-splitter", "care-circle-coordinator", "home-project-bid-compare"]) assert.match(results, new RegExp(slug));
  assert.match(customization, /Prompt 1 — Change it for my exact situation/);
  assert.match(customization, /Prompt 4 — Test the customer outcome/);
  assert.match(purchaseButton, /Get this Rally/);
  assert.match(checkout, /conceptSlug/);
  assert.match(checkout, /catalog:/);
  assert.match(stripe, /rally\/market/);
  assert.match(library, /catalog:/);
  assert.match(accessRoute, /paid_and_unlocked/);
  assert.match(ralliesRoute, /purchaseRequired/);
});
