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
  assert.match(page, /Sell something you made/);
  assert.match(page, /WHAT THE CUSTOMER GETS/);
  assert.match(page, /FREE PEP RALLY ORIGINALS/);
  assert.doesNotMatch(page, /Get the Blueprint · \$18|test checkout/i);
  assert.match(page, /The working app/);
  assert.match(page, /Their saved result/);
  assert.match(page, /bachelorette-pool\.jpg/);
  assert.match(page, /lush-garden\.jpg/);
  assert.doesNotMatch(page, /moat|royalty|marketplace fee|funded roadmap|launchpad|pilot cohort/i);
  assert.match(page, /THE MARKETPLACE/);
  assert.match(page, /Small apps\. Real outcomes/);
  assert.match(page, /THE SHELF IS OPEN/);
  assert.doesNotMatch(page, /starter-grid/);
  assert.match(page, /PEP RALLY FAQ/);
  assert.match(page, /href="#faq">FAQ/);
  assert.doesNotMatch(page + layout, /useful little app/i);
  assert.match(page, /free Pep Rally Originals/);
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
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);
});

test("offers the product brief as a Markdown download", async () => {
  const route = await readFile(new URL("../app/api/product-brief/route.ts", import.meta.url), "utf8");
  assert.ok(route.includes("text/markdown"));
  assert.ok(route.includes('attachment; filename="Pep-Rally-Product-Brief.md"'));
  assert.match(route, /The product promise/);
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

test("shows honest, testable connection readiness", async () => {
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

  for (const feature of ["WORKING NOW", "NEEDS ONE PRIVATE ACCOUNT", "DEALS PEP RALLY SHOULD MAKE", "No pretend connections", "Weather lookup", "Private file storage", "Calendar file"]) assert.match(page, new RegExp(feature));
  assert.match(page, /ChatGPT plugin can help operate a provider/);
  assert.match(route, /STRIPE_SECRET_KEY/);
  assert.match(route, /OPENAI_API_KEY/);
  assert.match(route, /Boolean\(env\.DB\)/);
  assert.match(route, /Boolean\(env\.ASSETS\)/);
  assert.match(builder, /Everything around the mini-app, together/);
  assert.match(page, /Pay → verify → save → unlock/);
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
  assert.match(page, /WHAT COUNTS AS A RALLY/);
  assert.match(page, /Open it\. Finish something\. Keep the result/);
  assert.match(page, /The working app/);
  assert.match(page, /Why does this prototype use ChatGPT sign-in/);
  for (const idea of ["NCLEX Study Sprint", "Etsy Profit & Pricing Desk", "Flashcard Shop Studio", "Travel Proposal Studio", "Farmers Market Morning Board", "IEP Meeting Organizer"]) assert.match(catalog, new RegExp(idea.replace(/[&]/g, "\\&")));
  assert.match(catalog, /official 2026 NCLEX-RN test plan/);
  assert.match(concept, /This is a researched product direction, not a finished listing/);
  assert.match(concept, /Build this idea/);
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
