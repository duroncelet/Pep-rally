import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  unpaidPayers, depositShares, depositStatus, suggestedDeposit,
  sharedCostPayers, perPersonQuote, pollTally, pollWinner,
  roomWarnings, unassignedGuests,
} from '../app/rally/bachelorette/money.ts';

const deposit = { id: 'd1', label: 'House deposit', total: 1000, dueDate: '2027-02-01', payerIds: ['a', 'b', 'c'], paidIds: ['a'] };

test('deposit shares preserve every cent across payers', () => {
  assert.deepEqual(depositShares({ ...deposit, total: 10, payerIds: ['a', 'b', 'c'] }), [
    { id: 'a', cents: 334 }, { id: 'b', cents: 333 }, { id: 'c', cents: 333 },
  ]);
  assert.deepEqual(depositShares({ ...deposit, payerIds: [] }), []);
  assert.deepEqual(unpaidPayers(deposit), ['b', 'c']);
});

test('deposit status tracks collection, due-soon, and overdue', () => {
  assert.equal(depositStatus({ ...deposit, paidIds: ['a', 'b', 'c'] }, '2027-01-15'), 'collected');
  assert.equal(depositStatus(deposit, '2027-01-15'), 'upcoming');
  assert.equal(depositStatus(deposit, '2027-01-26'), 'due-soon');
  assert.equal(depositStatus(deposit, '2027-02-02'), 'overdue');
  assert.equal(depositStatus({ ...deposit, dueDate: '' }, '2027-01-15'), 'no-due-date');
});

test('suggested deposit defaults to 40% of the total, inside the 33–50% range', () => {
  assert.equal(suggestedDeposit(4000), 1600);
  assert.equal(suggestedDeposit(4000, 0.33), 1320);
  assert.equal(suggestedDeposit(4000, 0.5), 2000);
  assert.equal(suggestedDeposit(0), 0);
});

test('the bride-share rule sets who pays shared costs', () => {
  const guests = ['bride', 'a', 'b'];
  assert.deepEqual(sharedCostPayers('group-covers', guests, 'bride'), ['a', 'b']);
  assert.deepEqual(sharedCostPayers('bride-pays-travel', guests, 'bride'), ['a', 'b']);
  assert.deepEqual(sharedCostPayers('bride-pays-own', guests, 'bride'), ['bride', 'a', 'b']);
  // No bride matched in the guest list: nobody is excluded.
  assert.deepEqual(sharedCostPayers('group-covers', guests, null), guests);
  assert.equal(perPersonQuote(900, 3), 300);
  assert.equal(perPersonQuote(1000, 3), 333.34);
  assert.equal(perPersonQuote(100, 0), 0);
});

test('date polling picks the majority weekend, ties break earliest', () => {
  const poll = {
    options: [
      { id: 'o1', start: '2027-03-05', end: '2027-03-07', label: 'March 5' },
      { id: 'o2', start: '2027-03-12', end: '2027-03-14', label: 'March 12' },
    ],
    votes: { o1: ['a', 'b'], o2: ['a', 'b', 'c'] },
  };
  assert.equal(pollWinner(poll)?.id, 'o2');
  assert.deepEqual(pollTally(poll).map((t) => t.count), [2, 3]);
  const tied = { ...poll, votes: { o1: ['a', 'b'], o2: ['c', 'd'] } };
  assert.equal(pollWinner(tied)?.id, 'o1');
  assert.equal(pollWinner({ options: poll.options, votes: {} }), null);
  assert.equal(pollWinner({ options: [], votes: {} }), null);
});

test('room warnings flag crowding and unassigned guests', () => {
  const room = { id: 'r1', label: 'Small room', beds: 1, note: '', occupantIds: ['a', 'b', 'c'] };
  assert.ok(roomWarnings(room).some((w) => /3 people for 1 bed/.test(w)));
  assert.equal(roomWarnings({ ...room, occupantIds: ['a', 'b'] }).length, 0);
  assert.ok(roomWarnings({ ...room, beds: 0, occupantIds: [] }).some((w) => /no beds/.test(w)));
  assert.deepEqual(unassignedGuests([room], ['a', 'b', 'c', 'd']), ['d']);
});

test('deposits, date polling, bride-share rule, and rooms are wired in the workspace', async () => {
  const page = await readFile(new URL('../app/rally/bachelorette/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /<Deposits/);
  assert.match(page, /<DatePoll/);
  assert.match(page, /<RoomPlan/);
  assert.match(page, /No deposit is fully collected yet/);
  assert.match(page, /## Deposits/);
  assert.match(page, /## Rooms/);
  assert.match(page, /Bride-share rule/);
  assert.match(page, /version: 7/);
});
