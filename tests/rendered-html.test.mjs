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
  assert.match(page, /BUILD, TEST \+ SELL EVERYDAY MINI-APPS/);
  assert.match(page, /Build or upload a Rally/);
  assert.match(page, /THE OUTCOME/);
  assert.match(page, /FREE CASE STUDIES/);
  assert.doesNotMatch(page, /Get the Blueprint · \$18|test checkout/i);
  assert.match(page, /A usable mini-app/);
  assert.match(page, /Not just a file/);
  assert.match(page, /bachelorette-pool\.jpg/);
  assert.match(page, /lush-garden\.jpg/);
  assert.doesNotMatch(page, /moat|creator|royalty|marketplace fee|funded roadmap|launchpad|pilot cohort/i);
  assert.match(page, /Upload what you made/);
  assert.match(page, /THE PEP RALLY CONNECTION LAYER/);
  assert.match(page, /PEP RALLY FAQ/);
  assert.match(page, /They are free case studies and marketing examples/);
  assert.match(builder, /BUILD INSIDE PEP RALLY/);
  assert.match(builder, /Take payments/);
  assert.match(builder, /Send text messages/);
  assert.match(builder, /Use live weather/);
  assert.match(builder, /Partner access needed/);
  assert.match(css, /\.consumer-home/);
  assert.match(css, /\.product-grid/);
  assert.match(css, /\.build-workbench/);
});

test("includes durable review storage and deployable assets", async () => {
  const [schema, route, migration] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/marketplace/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_light_lucky_pierre.sql", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /rallyReviews/);
  assert.match(route, /Use or save this Rally before reviewing it/);
  assert.match(migration, /CREATE TABLE `rally_reviews`/);
  await Promise.all([
    access(new URL("../public/rallies/bachelorette-pool.jpg", import.meta.url)),
    access(new URL("../public/rallies/lush-garden.jpg", import.meta.url)),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);
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
  assert.match(builder, /See what is genuinely connected today/);
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
