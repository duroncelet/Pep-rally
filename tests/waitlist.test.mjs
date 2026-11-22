import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { DrizzleQueryError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { waitlistSignups } from "../db/schema.ts";

test("ships the homepage waitlist: band, public POST route, D1 storage", async () => {
  const migrationFiles = (await readdir(new URL("../drizzle", import.meta.url)))
    .filter((name) => name.startsWith("0014_") && name.endsWith(".sql"));
  assert.equal(migrationFiles.length, 1, `expected one 0014 migration, found ${migrationFiles.join(", ")}`);
  const [schema, migration, route, home, form, css] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL(`../drizzle/${migrationFiles[0]}`, import.meta.url), "utf8"),
    readFile(new URL("../app/api/waitlist/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/WaitlistForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  // Storage: D1 via Drizzle, one row per email and audience, source for future placements.
  assert.match(schema, /waitlistSignups = sqliteTable\("waitlist_signups"/);
  assert.match(schema, /uniqueIndex\("idx_waitlist_signups_email_audience"\)\.on\(table\.email, table\.audience\)/);
  assert.match(schema, /source: text\("source"\)\.notNull\(\)\.default\("homepage"\)/);
  assert.match(schema, /createdAt: integer\("created_at", \{ mode: "timestamp_ms" \}\)\.notNull\(\)/);
  assert.match(migration, /CREATE TABLE waitlist_signups/);
  assert.match(migration, /CREATE UNIQUE INDEX idx_waitlist_signups_email ON waitlist_signups\(email\)/);

  // Route: public (no sign-in — the repo's first signed-out POST), with the
  // same abuse guards as /api/support: same-origin check + body-size cap.
  assert.doesNotMatch(route, /getChatGPTUser/);
  assert.match(route, /request\.headers\.get\("origin"\) !== new URL\(request\.url\)\.origin/);
  assert.match(route, /status: 403/);
  assert.match(route, /raw\.length > 2000/);
  assert.match(route, /status: 413/);
  // Validation: trim + lowercase before insert; 422 on a bad address.
  assert.match(route, /body\.email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(route, /Enter a valid email address\./);
  assert.match(route, /status: 422/);
  // Duplicate unique-constraint failure -> 409, rendered as success by the UI.
  assert.match(route, /UNIQUE constraint failed/);
  assert.match(route, /You're already on the list\./);
  assert.match(route, /status: 409/);
  assert.match(route, /status: 201/);
  // Missing DB binding -> 503, same wording pattern as /api/support.
  assert.match(route, /The waitlist is unavailable\. Please retry later\./);
  assert.match(route, /status: 503/);

  // Creator signup sits beside the free publishing path. Buyer signup stays in the marketplace.
  const creators = home.match(/<section[^>]+id="creators">.*?<\/section>/s)?.[0];
  const marketplace = home.match(/<section[^>]+id="more-rallies">.*?<\/section>/s)?.[0];
  assert.match(creators, /href="\/build".*?<WaitlistForm audience="creator" \/>/s);
  assert.match(marketplace, /<WaitlistForm audience="buyer" \/>/);
  assert.equal((home.match(/<WaitlistForm /g) ?? []).length, 2);
  assert.match(form, /Paid Rallies aren’t on sale yet\./);
  assert.match(form, /Join the creator waitlist/);
  assert.match(form, /fetch\("\/api\/waitlist", \{\s*method: "POST"/);
  assert.match(form, /JSON\.stringify\(\{ email, source: "homepage", audience \}\)/);
  assert.match(form, /type="email"\s+required/);
  assert.match(form, /You're on the list\. You'll get first access when paid Rallies open, plus launch updates\./);
  assert.match(form, /You're already on the list\./);
  assert.match(form, /Something went wrong — try again in a minute\./);
  assert.match(route, /const audience = body\.audience \?\? "buyer"/);
  assert.match(route, /audience !== "buyer" && audience !== "creator"/);
  assert.match(route, /source,\s*audience,/);

  // Styling exists for the band, the success swap, and the inline error.
  assert.match(css, /\.waitlist-band \{/);
  assert.match(css, /\.waitlist-done \{/);
  assert.match(css, /\.waitlist-error \{/);
});

// Regression (Nov 12, 2026): Drizzle wraps every query error in
// DrizzleQueryError, whose message is only "Failed query: ..." — the
// "UNIQUE constraint failed" text lives on error.cause. The route used to
// check only error.message, so a duplicate signup returned 500 instead of
// 409. The route handlers can't run under node --test (they import the
// cloudflare:workers D1 binding), so this test proves the mechanism against
// the real migration + real drizzle, and that the route inspects the cause.
test("existing buyers can join the creator list once and duplicates surface on error.cause", async () => {
  const migrationFiles = (await readdir(new URL("../drizzle", import.meta.url)))
    .filter((name) => name.startsWith("0014_") && name.endsWith(".sql"));
  const migration = await readFile(new URL(`../drizzle/${migrationFiles[0]}`, import.meta.url), "utf8");
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(migration);
  sqlite.prepare("INSERT INTO waitlist_signups (id, email, created_at) VALUES (?, ?, ?)")
    .run("existing", "dup@example.com", 0);
  sqlite.exec(await readFile(new URL("../drizzle/0015_waitlist_audience.sql", import.meta.url), "utf8"));
  assert.equal(sqlite.prepare("SELECT audience FROM waitlist_signups WHERE id = 'existing'").get().audience, "buyer");
  // Minimal D1-compatible binding over node:sqlite: drizzle's D1 driver
  // only needs prepare() -> { bind, run, all }.
  const d1 = {
    prepare: (sql) => {
      let params = [];
      const stmt = {
        bind: (...args) => { params = args; return stmt; },
        run: () => { sqlite.prepare(sql).run(...params); return Promise.resolve({ success: true }); },
        all: () => Promise.resolve({ success: true, results: sqlite.prepare(sql).all(...params) }),
      };
      return stmt;
    },
  };
  const db = drizzle(d1, { schema: { waitlistSignups } });
  const row = (id) => ({ id, email: "dup@example.com", source: "homepage", createdAt: new Date() });
  await db.insert(waitlistSignups).values({ ...row("creator"), audience: "creator" });
  for (const audience of ["buyer", "creator"]) {
    await assert.rejects(db.insert(waitlistSignups).values({ ...row("repeat"), audience }), (error) => {
      assert.ok(error instanceof DrizzleQueryError);
      assert.doesNotMatch(error.message, /UNIQUE constraint failed/);
      assert.ok(error.cause instanceof Error);
      assert.match(error.cause.message, /UNIQUE constraint failed: waitlist_signups\.email, waitlist_signups\.audience/);
      return true;
    });
  }
  sqlite.close();
  const route = await readFile(new URL("../app/api/waitlist/route.ts", import.meta.url), "utf8");
  assert.match(route, /error\.cause instanceof Error/);
  assert.match(route, /causeText\.includes\("UNIQUE constraint failed"\)/);
});
