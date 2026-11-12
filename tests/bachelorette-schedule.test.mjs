import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseTimeToMinutes, isDowntimeTitle, analyzeDay, analyzeItinerary } from '../app/rally/bachelorette/schedule.ts';
import { defaultOrderList, localShoppingLinks } from '../app/rally/bachelorette/shopping.ts';

test('time parsing handles 12-hour, 24-hour, and untimed entries', () => {
  assert.equal(parseTimeToMinutes('7:30 PM'), 1170);
  assert.equal(parseTimeToMinutes('7:30PM'), 1170);
  assert.equal(parseTimeToMinutes('9 AM'), 540);
  assert.equal(parseTimeToMinutes('12:00 AM'), 0);
  assert.equal(parseTimeToMinutes('12:00 PM'), 720);
  assert.equal(parseTimeToMinutes('19:30'), 1170);
  assert.equal(parseTimeToMinutes('Time TBD'), null);
  assert.equal(parseTimeToMinutes('Flexible'), null);
  assert.equal(parseTimeToMinutes(''), null);
  assert.equal(parseTimeToMinutes('25:00'), null);
  assert.equal(parseTimeToMinutes('13:00 PM'), null);
});

test('downtime detection recognizes slow blocks', () => {
  assert.equal(isDowntimeTitle('Pool morning'), true);
  assert.equal(isDowntimeTitle('Slow brunch + departures'), true);
  assert.equal(isDowntimeTitle('Recovery breakfast'), true);
  assert.equal(isDowntimeTitle('Wine tasting'), false);
  assert.equal(isDowntimeTitle('Club night'), false);
});

test('a packed day warns, and optional events do not count as main activities', () => {
  const packed = [
    { day: 2, time: '10:00 AM', title: 'Brunch' },
    { day: 2, time: '1:00 PM', title: 'Wine tasting' },
    { day: 2, time: '4:00 PM', title: 'Boat rental' },
    { day: 2, time: '8:00 PM', title: 'Dinner' },
  ];
  // Brunch is downtime, so 3 main activities remain: tasting, boat, dinner.
  assert.ok(analyzeDay(packed, 2).some((w) => w.kind === 'packed'));
  const withOptional = packed.map((e) => e.title === 'Boat rental' ? { ...e, required: 'optional' } : e);
  assert.ok(!analyzeDay(withOptional, 2).some((w) => w.kind === 'packed'));
  assert.equal(analyzeDay([], 1).length, 0);
});

test('tight gaps and early starts warn with travel-time and 9am guidance', () => {
  const tight = [
    { day: 1, time: '6:00 PM', title: 'Dinner' },
    { day: 1, time: '6:30 PM', title: 'Rooftop cocktails' },
  ];
  const warnings = analyzeDay(tight, 1);
  assert.ok(warnings.some((w) => w.kind === 'tight-gap'));
  assert.match(warnings.find((w) => w.kind === 'tight-gap').message, /travel time/);
  const early = [{ day: 3, time: '9:00 AM', title: 'Brunch' }, { day: 3, time: '12:00 PM', title: 'Departures' }];
  assert.ok(analyzeDay(early, 3).some((w) => w.kind === 'early-start'));
  const late = [{ day: 3, time: '10:30 AM', title: 'Brunch' }, { day: 3, time: '1:00 PM', title: 'Departures' }];
  assert.ok(!analyzeDay(late, 3).some((w) => w.kind === 'early-start'));
});

test('a day with no downtime or optional block gets the breather warning', () => {
  const busy = [
    { day: 2, time: '11:00 AM', title: 'Wine tasting' },
    { day: 2, time: '3:00 PM', title: 'Cooking class' },
  ];
  assert.ok(analyzeDay(busy, 2).some((w) => w.kind === 'no-downtime'));
  const breathing = [...busy, { day: 2, time: '5:00 PM', title: 'Pool afternoon', required: 'optional' }];
  assert.ok(!analyzeDay(breathing, 2).some((w) => w.kind === 'no-downtime'));
  assert.equal(analyzeItinerary(busy).length, 1);
  assert.equal(analyzeItinerary(breathing).length, 0);
});

test('the Amazon order list is firsthand-curated, per-guest aware, and search-linked', () => {
  const list = defaultOrderList(14);
  assert.ok(list.length >= 10);
  assert.ok(list.some((i) => /Tie-dye/.test(i.label)));
  assert.ok(list.some((i) => /TAPE\/SCISSORS/.test(i.note)));
  assert.ok(list.some((i) => /LIFESAVER/.test(i.note)));
  for (const item of list) {
    const url = new URL(item.url);
    assert.equal(url.hostname, 'www.amazon.com');
    assert.ok(url.pathname.startsWith('/s'));
    assert.equal(item.ordered, false);
    assert.equal(item.qty, item.perGuest ? 14 : 1);
  }
  assert.equal(defaultOrderList(0).find((i) => i.perGuest).qty, 1);
});

test('local shopping links point at live map searches for the trip place', () => {
  const links = localShoppingLinks('Nashville, TN');
  assert.equal(links.length, 3);
  assert.match(links.map((l) => l.label).join(' '), /Liquor store/);
  assert.match(links.map((l) => l.label).join(' '), /Party supply/);
  for (const link of links) {
    assert.equal(new URL(link.url).hostname, 'www.google.com');
    assert.match(decodeURIComponent(link.url), /Nashville/);
  }
});

test('guardrails, house hub, planner mode, and order list are wired in the workspace', async () => {
  const page = await readFile(new URL('../app/rally/bachelorette/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /Schedule check/);
  assert.match(page, /Must-do or optional/);
  assert.match(page, /House hub/);
  assert.match(page, /Who is planning this trip/);
  assert.match(page, /What the group signed up for/);
  assert.match(page, /What the bride envisions/);
  assert.match(page, /<OrderList/);
  assert.match(page, /localShoppingLinks/);
  assert.match(page, /version: 7/);
});
