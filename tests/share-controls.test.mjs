import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { packetEmailDraft } from '../app/email-packet.ts';
import { publicOutcomeFromRow } from '../app/saved-outcomes.ts';

// Part 1B, step D1: share controls — copy link, revoke link, email the PDF.
// Copy link is a browser clipboard action (not unit-testable); the revocation
// rule and the email draft are tested here. The DELETE handler itself cannot
// run under node --test (Clerk + D1 binding), like every other D1 route;
// the SQL it runs is tested against the real migration file.
const doc = { title: "Ari's Bachelorette", subtitle: 'Palm Springs - May 1 to May 3', sections: [
  { heading: 'The weekend', columns: ['Day', 'Time', 'Plan'], rows: [['Friday', '5 PM', 'Pool welcome']] },
] };

test('revoking deletes the row, so the link stops working at once — and only the owner can revoke it', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0013_saved_outcomes.sql', import.meta.url), 'utf8'));
  const insert = db.prepare('INSERT INTO saved_outcomes (id, owner_user_id, rally_slug, title, document, slug, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  insert.run('rev-1', 'user-1', 'bachelorette-blueprint', doc.title, JSON.stringify(doc), 'revokepub123', 1, now, now);
  insert.run('rev-2', 'user-1', 'bachelorette-blueprint', doc.title, JSON.stringify(doc), 'revokeprv123', 1, now, now);
  const bySlug = db.prepare('SELECT document, is_public AS isPublic FROM saved_outcomes WHERE slug = ?');
  assert.deepEqual(publicOutcomeFromRow(bySlug.get('revokepub123')), doc);
  // The DELETE handler's ownership check: a different owner finds nothing.
  const owned = db.prepare('SELECT id FROM saved_outcomes WHERE id = ? AND owner_user_id = ?');
  assert.equal(owned.get('rev-1', 'user-2'), undefined);
  assert.equal(owned.get('rev-1', 'user-1').id, 'rev-1');
  // The DELETE handler's delete: the row is gone, the link is dead.
  const del = db.prepare('DELETE FROM saved_outcomes WHERE id = ?');
  del.run('rev-1');
  assert.equal(bySlug.get('revokepub123'), undefined);
  assert.equal(publicOutcomeFromRow(bySlug.get('revokepub123')), null);
  // The other outcome is untouched.
  assert.deepEqual(publicOutcomeFromRow(bySlug.get('revokeprv123')), doc);
  db.close();
});

test('the email draft addresses the packet to one recipient, with the share link when public', () => {
  const draft = packetEmailDraft({ to: 'dana@example.com', title: "Ari's Bachelorette", shareUrl: 'https://peprally.fun/s/abcdefgh2345' });
  assert.equal(draft.fileName, 'ari-s-bachelorette.pdf');
  const url = new URL(draft.mailto);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'dana@example.com');
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
  assert.equal(url.searchParams.get('subject'), "Your Ari's Bachelorette packet");
  const body = url.searchParams.get('body');
  assert.ok(body.includes("I'm sharing the packet for Ari's Bachelorette. Download the PDF, then attach it to this email."));
  assert.ok(!body.includes("is attached"), "the draft must not claim the PDF is attached — the buyer attaches it manually");
  assert.ok(body.includes('https://peprally.fun/s/abcdefgh2345'));
  const noLink = packetEmailDraft({ to: 'dana@example.com', title: "Ari's Bachelorette" });
  assert.ok(!new URL(noLink.mailto).searchParams.get('body').includes('read it online'));
});

test('the email draft rejects malformed recipients and header injection', () => {
  for (const to of ['', 'not-email', 'a@b', 'a@b.com\nBcc:bad@b.com', 'a'.repeat(250) + '@x.com']) {
    assert.throws(() => packetEmailDraft({ to, title: 'Weekend' }), undefined, `accepted bad recipient: ${to}`);
  }
  assert.throws(() => packetEmailDraft({ to: 'dana@example.com', title: '' }));
  assert.throws(() => packetEmailDraft({ to: 'dana@example.com', title: 'x'.repeat(161) }));
});
