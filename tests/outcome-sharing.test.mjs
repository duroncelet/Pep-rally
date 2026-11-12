import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DrizzleQueryError } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { savedOutcomes } from '../db/schema.ts';
import { validateOutcomeDocument } from '../app/outcome-document.ts';
import { OUTCOME_RALLY_SLUGS, isValidOutcomeSlug, newOutcomeSlug, publicOutcomeFromRow, rallyListingHref, validateSaveOutcomeBody } from '../app/saved-outcomes.ts';

// Part 1B, step B1: persistence + public route for saved outcomes. The route
// handlers themselves cannot run under node --test (they import the
// cloudflare:workers D1 binding and Clerk, like every other D1 route in the
// repo); the rules they enforce live in pure modules tested here, and the
// SQL layer is tested against the real migration file.
const doc = { title: "Ari's Bachelorette", subtitle: 'Palm Springs - May 1 to May 3', sections: [
  { heading: 'The weekend', columns: ['Day', 'Time', 'Plan'], rows: [['Friday', '5 PM', 'Pool welcome']] },
  { heading: 'Packing list', paragraphs: ['Swimsuit', 'Comfortable shoes'] },
  { heading: 'Bed 1', paragraphs: ['Raised bed'], grid: { columns: 2, cells: ['Tomatoes', 'Lettuce', 'Open', 'Open'] } },
] };

test('outcome documents validate with the same bounds as the PDF packet', () => {
  assert.equal(validateOutcomeDocument(doc), true);
  assert.equal(validateOutcomeDocument({ ...doc, title: '' }), false);
  assert.equal(validateOutcomeDocument({ ...doc, title: 'x'.repeat(161) }), false);
  assert.equal(validateOutcomeDocument({ ...doc, subtitle: 'x'.repeat(501) }), false);
  assert.equal(validateOutcomeDocument({ ...doc, sections: [] }), true);
  assert.equal(validateOutcomeDocument({ ...doc, sections: Array.from({ length: 41 }, () => ({ heading: 'S' })) }), false);
  assert.equal(validateOutcomeDocument({ ...doc, sections: [{ heading: 'Bad', paragraphs: 'not-an-array' }] }), false);
  assert.equal(validateOutcomeDocument({ ...doc, sections: [{ heading: 'Bad', rows: [['a'], 'b'] }] }), false);
  assert.equal(validateOutcomeDocument({ ...doc, sections: [{ heading: 'Bad', grid: { columns: 0, cells: [] } }] }), false);
  assert.equal(validateOutcomeDocument({ ...doc, sections: [{ heading: 'Bad', grid: { columns: 13, cells: [] } }] }), false);
  assert.equal(validateOutcomeDocument({ ...doc, sections: [{ heading: 'Bad', grid: { columns: 2, cells: ['x'.repeat(81)] } }] }), false);
  assert.equal(validateOutcomeDocument({ ...doc, sections: [{ heading: 'Huge', paragraphs: ['x'.repeat(40001)] }] }), false);
});

test('slugs are 12 unguessable URL-safe characters', () => {
  const seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const slug = newOutcomeSlug();
    assert.equal(slug.length, 12);
    assert.equal(isValidOutcomeSlug(slug), true);
    assert.ok(!seen.has(slug));
    seen.add(slug);
  }
  assert.equal(isValidOutcomeSlug('ABCDEF123456'), false);
  assert.equal(isValidOutcomeSlug('short'), false);
  assert.equal(isValidOutcomeSlug('has space 12'), false);
  assert.equal(isValidOutcomeSlug(42), false);
});

test('a stored row renders publicly only when the owner opted in and the document is valid', () => {
  assert.deepEqual(publicOutcomeFromRow({ document: JSON.stringify(doc), isPublic: 1 }), doc);
  assert.equal(publicOutcomeFromRow({ document: JSON.stringify(doc), isPublic: 0 }), null);
  assert.equal(publicOutcomeFromRow({ document: JSON.stringify(doc), isPublic: 2 }), null);
  assert.equal(publicOutcomeFromRow(null), null);
  assert.equal(publicOutcomeFromRow(undefined), null);
  assert.equal(publicOutcomeFromRow({ document: 'not json', isPublic: 1 }), null);
  assert.equal(publicOutcomeFromRow({ document: JSON.stringify({ ...doc, title: '' }), isPublic: 1 }), null);
});

test('save bodies validate the Rally, title, document, and sharing flag', () => {
  const good = { rallySlug: 'bachelorette-blueprint', title: 'Our weekend', document: doc };
  const checked = validateSaveOutcomeBody(good);
  assert.equal(checked.ok, true);
  assert.equal(checked.value.isPublic, false);
  assert.equal(validateSaveOutcomeBody({ ...good, id: 'abc', isPublic: true }).value.id, 'abc');
  assert.equal(validateSaveOutcomeBody({ ...good, rallySlug: 'not-a-rally' }).ok, false);
  assert.equal(validateSaveOutcomeBody({ ...good, rallySlug: 'nclex-study-sprint' }).ok, false);
  assert.equal(validateSaveOutcomeBody({ ...good, rallySlug: 'care-circle-coordinator' }).ok, false);
  assert.equal(validateSaveOutcomeBody({ ...good, rallySlug: 'flashcard-shop-studio' }).ok, false);
  assert.equal(validateSaveOutcomeBody({ ...good, title: '' }).ok, false);
  assert.equal(validateSaveOutcomeBody({ ...good, title: 'x'.repeat(161) }).ok, false);
  assert.equal(validateSaveOutcomeBody({ ...good, document: { ...doc, title: '' } }).ok, false);
  assert.equal(validateSaveOutcomeBody({ ...good, isPublic: 'yes' }).ok, false);
  assert.equal(validateSaveOutcomeBody(null).ok, false);
  assert.ok(OUTCOME_RALLY_SLUGS.has('garden-planner'));
  assert.ok(OUTCOME_RALLY_SLUGS.has('iep-meeting-organizer'));
});

test('public pages link back to the right listing', () => {
  assert.equal(rallyListingHref('bachelorette-blueprint'), '/shop/bachelorette-blueprint');
  assert.equal(rallyListingHref('garden-planner'), '/shop/garden-planner');
  assert.equal(rallyListingHref('iep-meeting-organizer'), '/discover/iep-meeting-organizer');
  assert.equal(rallyListingHref('nope'), '/');
});

test('migration 0013 creates the table; the public lookup returns only opted-in rows', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
  const insert = db.prepare('INSERT INTO saved_outcomes (id, owner_user_id, rally_slug, title, document, slug, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  insert.run('id-public', 'user-1', 'bachelorette-blueprint', 'Public weekend', JSON.stringify(doc), 'abcdefgh2345', 1, now, now);
  insert.run('id-private', 'user-1', 'bachelorette-blueprint', 'Private weekend', JSON.stringify(doc), 'bcdefghj3456', 0, now, now + 1);
  const bySlug = db.prepare('SELECT * FROM saved_outcomes WHERE slug = ? AND is_public = 1');
  assert.equal(bySlug.get('abcdefgh2345').id, 'id-public');
  assert.equal(bySlug.get('bcdefghj3456'), undefined);
  assert.equal(bySlug.get('zzzzzzzzzzzz'), undefined);
  // The slug is unique: a second row with the same token is refused.
  assert.throws(() => insert.run('id-dup', 'user-2', 'garden-planner', 'Dup', '{}', 'abcdefgh2345', 1, now, now));
  // The owner's latest outcome for a Rally is the most recently updated row.
  const latest = db.prepare('SELECT id FROM saved_outcomes WHERE owner_user_id = ? AND rally_slug = ? ORDER BY updated_at DESC LIMIT 1');
  assert.equal(latest.get('user-1', 'bachelorette-blueprint').id, 'id-private');
  assert.equal(latest.get('user-2', 'bachelorette-blueprint'), undefined);
  db.close();
});

// Regression (Nov 12, 2026): the POST /api/outcomes slug-collision retry
// checked only error.message for UNIQUE, but Drizzle wraps every query
// error in DrizzleQueryError, whose message is only "Failed query: ..." —
// the UNIQUE text lives on error.cause. The retry was dead code: a
// collision threw instead of retrying. The route handler can't run under
// node --test (it imports the cloudflare:workers D1 binding and Clerk), so
// this test proves the mechanism against the real migration + real drizzle,
// and that the route inspects the cause chain before deciding to retry.
test('a slug collision surfaces UNIQUE on error.cause, and the retry checks the cause', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
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
  const db = drizzle(d1, { schema: { savedOutcomes } });
  const now = new Date();
  const row = (id) => ({ id, ownerUserId: 'user-1', rallySlug: 'garden-planner', title: 'Plan', document: '{}', slug: 'abcdefgh2345', isPublic: 0, createdAt: now, updatedAt: now });
  await db.insert(savedOutcomes).values(row('first'));
  await assert.rejects(db.insert(savedOutcomes).values(row('second')), (error) => {
    assert.ok(error instanceof DrizzleQueryError);
    assert.doesNotMatch(error.message, /UNIQUE/i);
    assert.ok(error.cause instanceof Error);
    assert.match(error.cause.message, /UNIQUE constraint failed: saved_outcomes\.slug/);
    return true;
  });
  const route = readFileSync(new URL('../app/api/outcomes/route.ts', import.meta.url), 'utf8');
  assert.match(route, /error\.cause instanceof Error/);
  assert.match(route, /\/UNIQUE\/i\.test\(text\)/);
});
