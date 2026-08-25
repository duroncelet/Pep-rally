import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the Pep Rally marketplace experience", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Pep Rally/);
  assert.match(page, /Executable full workspace/);
  assert.match(page, /bachelorette-pool\.jpg/);
  assert.match(page, /lush-garden\.jpg/);
  assert.match(page, /saved run/);
  assert.match(page, /verified review/);
  assert.match(page, /BUILT ON THIS RALLY/);
  assert.match(page, /70%/);
  assert.match(page, /10%/);
  assert.match(page, /20%/);
  assert.match(css, /\.marketplace-trust/);
  assert.match(css, /\.rally-lineage/);
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
