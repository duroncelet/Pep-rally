import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  placeLabel, mapsSearchUrl, webSearchUrl, groupSizeAdvice, categoryCards,
  suggestionFromEvent, unpickedSuggestions,
} from '../app/rally/bachelorette/planner.ts';
import { GET as geoLookup } from '../app/api/party-geo/route.ts';

test('place labels join name, region, and country, skipping empty parts', () => {
  assert.equal(placeLabel({ name: 'Palm Springs', region: 'California', country: 'United States' }), 'Palm Springs, California, United States');
  assert.equal(placeLabel({ name: 'Nashville', country: 'United States' }), 'Nashville, United States');
  assert.equal(placeLabel({ name: 'Paris' }), 'Paris');
});

test('group-size advice changes with headcount', () => {
  assert.equal(groupSizeAdvice(0).length, 0);
  assert.match(groupSizeAdvice(6).join(' '), /one rideshare XL/);
  assert.match(groupSizeAdvice(9).join(' '), /90 minutes/);
  assert.match(groupSizeAdvice(12).join(' '), /party bus/);
  assert.match(groupSizeAdvice(14).join(' '), /3 XLs/);
  assert.match(groupSizeAdvice(20).join(' '), /dinners at the house/);
  assert.notEqual(groupSizeAdvice(6).join(), groupSizeAdvice(20).join());
});

test('category cards link every idea to a real search for the trip place', () => {
  const cards = categoryCards('Palm Springs, California');
  const categories = cards.map((c) => c.category);
  for (const expected of ['Activities', 'Hire a pro', 'Group meals', 'Nightlife', 'What locals recommend']) assert.ok(categories.includes(expected), `missing ${expected}`);
  for (const card of cards) {
    assert.ok(card.links.length >= 3, `${card.category} needs at least 3 links`);
    for (const link of card.links) {
      const url = new URL(link.url);
      assert.equal(url.protocol, 'https:');
      assert.match(decodeURIComponent(link.url), /Palm Springs/);
    }
  }
  // No invented venues: every link is a search against a real provider.
  const hosts = new Set(cards.flatMap((c) => c.links.map((l) => new URL(l.url).hostname)));
  for (const host of hosts) assert.ok(['www.google.com', 'www.opentable.com', 'www.reddit.com'].includes(host), `unexpected host ${host}`);
});

test('search URL helpers encode the query', () => {
  assert.equal(mapsSearchUrl('wine tasting Napa, CA'), 'https://www.google.com/maps/search/wine%20tasting%20Napa%2C%20CA');
  assert.equal(webSearchUrl('private chef Austin'), 'https://www.google.com/search?q=private%20chef%20Austin');
});

test('Ticketmaster events become suggestions only with a real Ticketmaster link', () => {
  const good = suggestionFromEvent({ id: '1', name: 'Show', url: 'https://www.ticketmaster.com/event/1', date: '2027-03-06', time: '20:00', venue: 'The Hall' });
  assert.equal(good?.title, 'Show');
  assert.equal(good?.category, 'Live event');
  assert.equal(good?.source, 'Ticketmaster');
  assert.equal(good?.status, 'todo');
  assert.equal(good?.venue, 'The Hall');
  assert.equal(suggestionFromEvent({ id: '2', name: 'Fake', url: 'https://evil.example.com/event' }), null);
  assert.equal(suggestionFromEvent({ id: '3', name: 'No link', url: '' }), null);
  assert.equal(suggestionFromEvent({ id: '4', name: '', url: 'https://www.ticketmaster.com/event/4' }), null);
});

test('the unpicked shortlist keeps todo and skipped suggestions, never picked ones', () => {
  const items = [
    { id: 'a', title: 'A', category: 'Activities', url: 'https://example.com/a', source: 'x', status: 'todo' },
    { id: 'b', title: 'B', category: 'Activities', url: 'https://example.com/b', source: 'x', status: 'picked' },
    { id: 'c', title: 'C', category: 'Activities', url: 'https://example.com/c', source: 'x', status: 'skipped' },
  ];
  assert.deepEqual(unpickedSuggestions(items).map((s) => s.id), ['a', 'c']);
});

test('geo route and suggestions wiring exist in the workspace', async () => {
  const [geo, page, suggestions, events] = await Promise.all([
    readFile(new URL('../app/api/party-geo/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/rally/bachelorette/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/rally/bachelorette/Suggestions.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/party-events/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(geo, /geocoding-api\.open-meteo\.com/);
  assert.match(geo, /count=8/);
  assert.match(page, /GeoInput/);
  assert.match(page, /<Suggestions/);
  assert.match(page, /version: 7/);
  assert.match(page, /Suggestion shortlist/);
  assert.match(suggestions, /Check what’s on/);
  assert.match(suggestions, /Nothing is booked for you/);
  assert.match(events, /geoPoint/);
  assert.match(events, /arts & theatre/);
  assert.match(events, /sports/);
});

test('geo lookup labels same-name places distinctly (Austin, TX vs Austin, MN)', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ results: [
      { id: 1, name: 'Austin', admin1: 'Texas', country: 'United States', latitude: 30.27, longitude: -97.74 },
      { id: 2, name: 'Austin', admin1: 'Minnesota', country: 'United States', latitude: 43.67, longitude: -92.97 },
      { id: 3, name: 'Austin', country: 'United States', latitude: 40.0, longitude: -90.0 },
    ] });
    const response = await geoLookup(new Request('https://example.com/api/party-geo?q=Austin'));
    assert.equal(response.status, 200);
    const { places } = await response.json();
    assert.deepEqual(places.map((p) => p.label), [
      'Austin, Texas, United States',
      'Austin, Minnesota, United States',
      'Austin, United States',
    ]);
    assert.equal(new Set(places.map((p) => p.label)).size, 3);
  } finally {
    globalThis.fetch = original;
  }
});
