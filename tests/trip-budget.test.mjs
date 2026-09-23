import test from 'node:test';
import assert from 'node:assert/strict';
import { tripTotals } from '../app/rally/bachelorette/budget.ts';
test('spending estimates are not debts; unconfirmed participants still need lodging', () => {
  const guests = Array.from({length:8}, (_,i) => ({rsvp:i ? 'Maybe' : 'Yes',paid:0}));
  assert.deepEqual(tripTotals(guests,500,0), {participantCount:8,groupBudget:4000,collected:0,outstanding:0});
});
test('requested contributions exclude declined guests and preserve overpayments', () => {
  assert.deepEqual(tripTotals([{rsvp:'Yes',paid:300},{rsvp:'Maybe',paid:0},{rsvp:'No',paid:50}],500,100), {participantCount:2,groupBudget:1000,collected:300,outstanding:0});
});
