import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships a clear consumer storefront", async () => {
  const [page, sell, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sell/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Pep Rally/);
  assert.match(page, /Plan the thing/);
  assert.match(page, /WHAT YOU’RE BUYING/);
  assert.match(page, /A workspace/);
  assert.match(page, /Not another PDF/);
  assert.match(page, /bachelorette-pool\.jpg/);
  assert.match(page, /lush-garden\.jpg/);
  assert.doesNotMatch(page, /moat|creator|royalty|marketplace fee|funded roadmap|launchpad|pilot cohort/i);
  assert.match(sell, /SELL A PLANNER/);
  assert.match(css, /\.consumer-home/);
  assert.match(css, /\.product-grid/);
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

  for (const feature of ["GROUP CHAT", "MONEY", "PLACES + RESERVATIONS", "DÉCOR + DETAILS", "PACKING + SAFETY"]) assert.match(bachelorette, new RegExp(feature.replace(/[+]/g, "\\+")));
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
