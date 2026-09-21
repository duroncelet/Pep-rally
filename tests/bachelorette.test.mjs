import test from 'node:test';
import assert from 'node:assert/strict';
import { splitBill, settleBills, destinationFor, validTripDates } from '../app/rally/bachelorette/destinations.ts';

test('bill shares preserve every cent and ignore duplicate participants', () => {
  assert.deepEqual(splitBill(10, ['a','b','c','a']), [{id:'a',cents:334},{id:'b',cents:333},{id:'c',cents:333}]);
  assert.throws(() => splitBill(10, []));
  assert.throws(() => splitBill(-1, ['a']));
  assert.throws(() => splitBill(NaN, ['a']));
});
test('repayments net multiple payers and permit treating the bride', () => {
  assert.deepEqual(settleBills([{id:'1',title:'Dinner',amount:90,paidBy:'a',participants:['a','b','c']},{id:'2',title:'Ride',amount:30,paidBy:'b',participants:['a','b','c']}]), [{from:'b',to:'a',cents:1000},{from:'c',to:'a',cents:4000}]);
  assert.deepEqual(settleBills([{id:'1',title:'Treat',amount:60,paidBy:'bride',participants:['a','b']}]), [{from:'a',to:'bride',cents:3000},{from:'b',to:'bride',cents:3000}]);
});
test('trip dates reject impossible, reversed and unbounded ranges', () => {
  assert.equal(validTripDates('2026-10-09','2026-10-11'), true);
  for (const [a,b] of [['2026-02-30','2026-03-01'],['2026-10-11','2026-10-09'],['2026-01-01','2026-12-31'],['','']]) assert.equal(validTripDates(a,b), false);
});
test('city aliases resolve without matching unrelated places', () => {
  assert.equal(destinationFor('NOLA')?.name, 'New Orleans');
  assert.equal(destinationFor('Nash')?.name, 'Nashville');
  assert.equal(destinationFor('Palm Springs, CA')?.state, 'CA');
  assert.equal(destinationFor('Austinville'), undefined);
});
