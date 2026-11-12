import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { renderOutcomePdf, validatePdfDocument } from '../app/outcome-pdf.ts';
import { POST } from '../app/api/outcome-pdf/route.ts';

const bachelorette = { title: "Ari's Bachelorette", subtitle: 'Palm Springs - May 1 to May 3', sections: [
  { heading: 'The weekend', columns: ['Day', 'Time', 'Plan', 'Status'], rows: [['Friday', '5 PM', 'Pool welcome', 'Idea'], ['Saturday', '7 PM', 'Group dinner', 'Shortlisted']] },
  { heading: 'Budget and contributions', paragraphs: ['Working group budget: $2,400.00', 'Requested contributions remaining: $400.00'] },
  { heading: 'Bill split suggestions', paragraphs: ['Dana pays Lee $60.00 USD'] },
  { heading: 'Packing list', paragraphs: ['Swimsuit', 'Comfortable shoes'] },
] };
const garden = { title: 'My garden', subtitle: 'Portland - 2 plots', sections: [
  { heading: 'Season plan', paragraphs: ['Selected crops: Tomatoes, Lettuce. Sun: 6-8 hours.'] },
  { heading: 'Bed 1', paragraphs: ['Raised bed - 8 x 4 ft'], grid: { columns: 2, cells: ['Tomatoes', 'Lettuce', 'Open', 'Open'] } },
  { heading: 'My planting calendar', paragraphs: ['Last frost: 2027-04-10', 'Tomatoes: outdoor target 2027-05-10'] },
] };

test('both free Rally packets are real multipage-capable PDF files', async () => {
  for (const doc of [bachelorette, garden]) {
    assert.equal(validatePdfDocument(doc), true);
    const bytes = await renderOutcomePdf(doc, new Date('2026-11-11T12:00:00Z'));
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
    const loaded = await PDFDocument.load(bytes);
    assert.ok(loaded.getPageCount() >= 1);
    assert.equal(loaded.getTitle(), doc.title);
  }
});

test('rejects invalid or oversized outcome data', () => {
  assert.equal(validatePdfDocument({ ...garden, sections: [{ heading: 'Bad', rows: {} }] }), false);
  assert.equal(validatePdfDocument({ ...garden, sections: [{ heading: 'Huge', paragraphs: ['x'.repeat(41000)] }] }), false);
  assert.equal(validatePdfDocument({ ...garden, sections: [{ heading: 'Bad', grid: { columns: 0, cells: [] } }] }), false);
});

test('PDF route returns a downloadable private PDF and no raw stack trace for bad input', async () => {
  const response = await POST(new Request('https://example.test/api/outcome-pdf', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(garden) }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(response.headers.get('content-disposition'), /attachment/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(new TextDecoder().decode((await response.arrayBuffer()).slice(0, 5)), '%PDF-');
  const bad = await POST(new Request('https://example.test/api/outcome-pdf', { method: 'POST', body: JSON.stringify({ title: 'x', subtitle: '', sections: [{ heading: 'Bad', paragraphs: {} }] }) }));
  assert.equal(bad.status, 422);
});
