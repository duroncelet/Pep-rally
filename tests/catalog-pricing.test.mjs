import test from 'node:test';
import assert from 'node:assert/strict';
import { rallyConcepts, findConcept } from '../app/catalog.ts';
import { formatPrice } from '../app/format-price.ts';

// Price ruling, Nov 15, 2026: $10 flat per Rally. Every listed Rally is
// priced, so no listing renders "Price to be decided" and no checkout is
// blocked on a missing price. The legacy $9-$24 spread was placeholder
// values, not a designed tier.
test('every listed Rally is $10 flat', () => {
  assert.ok(rallyConcepts.length > 0, 'catalog should not be empty');
  for (const rally of rallyConcepts) {
    assert.equal(rally.priceCents, 1000, `${rally.slug} should be $10 (1000 cents)`);
  }
});

test('Festival Planner is priced (regression: it shipped unpriced)', () => {
  const festival = findConcept('festival-planner');
  assert.ok(festival, 'catalog is missing festival-planner');
  assert.equal(festival.priceCents, 1000);
  assert.equal(formatPrice(festival.priceCents), '$10.00');
});
