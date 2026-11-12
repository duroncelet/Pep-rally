import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("ships the homepage waitlist: band, public POST route, D1 storage", async () => {
  const migrationFiles = (await readdir(new URL("../drizzle", import.meta.url)))
    .filter((name) => name.startsWith("0014_") && name.endsWith(".sql"));
  assert.equal(migrationFiles.length, 1, `expected one 0014 migration, found ${migrationFiles.join(", ")}`);
  const [schema, migration, route, home, css] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL(`../drizzle/${migrationFiles[0]}`, import.meta.url), "utf8"),
    readFile(new URL("../app/api/waitlist/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  // Storage: D1 via Drizzle, one row per email, source for future placements.
  assert.match(schema, /waitlistSignups = sqliteTable\("waitlist_signups"/);
  assert.match(schema, /uniqueIndex\("idx_waitlist_signups_email"\)\.on\(table\.email\)/);
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

  // Homepage: one compact band at the bottom of the marketplace section, at
  // the "paid access is not on sale yet" dead end. Email only, hidden
  // source="homepage" riding with the POST. No hero form, no popup.
  assert.ok(home.indexOf('className="waitlist-band"') > home.indexOf('id="more-rallies"'));
  assert.ok(home.indexOf('className="waitlist-band"') < home.indexOf('id="faq"'));
  assert.match(home, /Paid Rallies aren’t on sale yet\./);
  assert.match(home, /Leave your email for first access when they open, plus launch updates\./);
  assert.match(home, /fetch\("\/api\/waitlist", \{ method: "POST"/);
  assert.match(home, /source: "homepage"/);
  assert.match(home, /type="email" required/);
  assert.match(home, /You're on the list\. You'll get first access when paid Rallies open, plus launch updates\./);
  assert.match(home, /You're already on the list\./);
  assert.match(home, /Something went wrong — try again in a minute\./);
  assert.doesNotMatch(home, /waitlist-band.*waitlist-band/s);

  // Styling exists for the band, the success swap, and the inline error.
  assert.match(css, /\.waitlist-band \{/);
  assert.match(css, /\.waitlist-done \{/);
  assert.match(css, /\.waitlist-error \{/);
});
