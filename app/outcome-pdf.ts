import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { OutcomeDocument, OutcomeSection } from './outcome-document';
import { validateOutcomeDocument } from './outcome-document.ts';

const navy = rgb(0.12, 0.14, 0.25);
const coral = rgb(0.94, 0.35, 0.31);
const cream = rgb(1, 0.98, 0.94);
const pale = rgb(1, 0.83, 0.36);
const muted = rgb(0.39, 0.41, 0.45);
const pageWidth = 612;
const pageHeight = 792;
const margin = 49;
const contentWidth = pageWidth - margin * 2;

// Standard PDF fonts cannot encode several punctuation marks. Replace only
// unsupported characters; never omit user-entered content silently.
function printable(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"').replace(/\u2026/g, '...')
    .replace(/\u00b7/g, ' | ').replace(/\u00d7/g, 'x').replace(/\u00b0/g, ' degrees')
    .replace(/\u2610/g, '[ ]').replace(/\u2611/g, '[x]').replace(/\u2713/g, 'done')
    .replace(/[^\x20-\x7E\n]/g, '?');
}

// The PDF packet and saved-outcome persistence share one validator: the
// two were byte-identical twins, and outcome-document.ts is now the
// single home. This alias keeps the PDF-side import name stable.
export const validatePdfDocument = validateOutcomeDocument;

export async function renderOutcomePdf(doc: OutcomeDocument, createdAt = new Date()): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const display = await pdf.embedFont(StandardFonts.TimesRomanBold);
  let page!: PDFPage;
  let y!: number;
  let pageNumber = 0;
  const date = createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  function addPage() {
    page = pdf.addPage([pageWidth, pageHeight]); pageNumber++;
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: cream });
    page.drawRectangle({ x: 0, y: pageHeight - 13, width: pageWidth, height: 13, color: pale });
    page.drawText('PEP RALLY', { x: margin, y: pageHeight - 43, font: bold, size: 9, color: coral });
    page.drawLine({ start: { x: margin, y: 42 }, end: { x: pageWidth - margin, y: 42 }, thickness: 1, color: navy });
    page.drawText(`${printable(doc.title).slice(0, 53)}  |  ${date}`, { x: margin, y: 27, font: regular, size: 8, color: muted });
    page.drawText(`${pageNumber}`, { x: pageWidth - margin - 10, y: 27, font: bold, size: 8, color: navy });
    y = pageHeight - 72;
  }
  function need(height: number) { if (y - height < 63) addPage(); }
  function lines(text: string, font: PDFFont, size: number, width = contentWidth): string[] {
    const result: string[] = [];
    for (const paragraph of printable(text).split('\n')) {
      let current = '';
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        // A pasted URL or unbroken word must wrap as well.
        const pieces: string[] = [];
        let piece = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(piece + char, size) > width && piece) { pieces.push(piece); piece = ''; }
          piece += char;
        }
        if (piece) pieces.push(piece);
        for (const part of pieces) {
          const next = current ? `${current} ${part}` : part;
          if (font.widthOfTextAtSize(next, size) > width && current) { result.push(current); current = part; }
          else current = next;
        }
      }
      result.push(current);
    }
    return result;
  }
  function write(text: string, font = regular, size = 10, color = navy, indent = 0, lineHeight = 15) {
    for (const line of lines(text, font, size, contentWidth - indent)) {
      need(lineHeight);
      if (line) page.drawText(line, { x: margin + indent, y, font, size, color });
      y -= lineHeight;
    }
  }
  addPage();
  y -= 30;
  write('YOUR FINISHED PLAN', bold, 10, coral, 0, 22);
  y -= 18;
  write(doc.title, display, 34, navy, 0, 42);
  y -= 8;
  write(doc.subtitle, regular, 13, navy, 0, 21);
  y -= 30;
  page.drawRectangle({ x: margin, y: y - 8, width: contentWidth, height: 7, color: pale });
  y -= 38;
  write('A practical plan to keep and share. Verify important details before acting.', regular, 10, muted);
  y -= 28;
  for (const section of doc.sections) {
    const headingLines = lines(section.heading, bold, 12, contentWidth - 24);
    const headingHeight = Math.max(30, headingLines.length * 17 + 13);
    need(headingHeight + 26);
    page.drawRectangle({ x: margin, y: y + 24 - headingHeight, width: contentWidth, height: headingHeight, color: navy });
    headingLines.forEach((line, index) => page.drawText(line, { x: margin + 12, y: y + 3 - index * 17, font: bold, size: 12, color: cream }));
    y -= headingHeight + 13;
    for (const paragraph of section.paragraphs || []) { write(paragraph); y -= 6; }
    if (section.rows) {
      if (section.columns?.length) { write(section.columns.join('  |  '), bold, 9, coral, 0, 13); y -= 3; }
      for (const row of section.rows) {
        write(row.join('  |  '), regular, 9, navy, 0, 13);
        y -= 4;
      }
    }
    if (section.grid) {
      const columns = section.grid.columns;
      const width = contentWidth / columns;
      write(`Layout: ${columns} columns, read left to right`, bold, 9, coral, 0, 16);
      for (let start = 0; start < section.grid.cells.length; start += columns) {
        const row = section.grid.cells.slice(start, start + columns);
        const cellLines = row.map(cell => lines(cell || 'Open', regular, 8, width - 13));
        const height = Math.max(34, ...cellLines.map(item => item.length * 11 + 11));
        need(height + 2);
        row.forEach((_, index) => {
          const x = margin + index * width;
          page.drawRectangle({ x, y: y - height + 11, width, height, color: index % 2 ? cream : rgb(1, 1, 1), borderColor: muted, borderWidth: 0.5 });
          cellLines[index].forEach((line, lineIndex) => page.drawText(line, { x: x + 6, y: y - lineIndex * 11, font: regular, size: 8, color: navy }));
        });
        y -= height + 2;
      }
    }
    y -= 16;
  }
  pdf.setTitle(doc.title);
  pdf.setAuthor('Pep Rally');
  pdf.setSubject('Personal Rally outcome packet');
  return pdf.save();
}
