export type OutcomeSection = {heading:string;paragraphs?:string[];rows?:string[][];columns?:string[];grid?:{columns:number;cells:string[]};};
export type OutcomeDocument={title:string;subtitle:string;sections:OutcomeSection[]};

// Bounds shared by persistence (Part 1B, B1) and the PDF packet (PR #12):
// a saved outcome must always be renderable as a packet. This is the single
// validator; app/outcome-pdf.ts re-exports it as validatePdfDocument.
export function validateOutcomeDocument(value: unknown): value is OutcomeDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<OutcomeDocument>;
  if (typeof doc.title !== 'string' || !doc.title.trim() || doc.title.length > 160 || typeof doc.subtitle !== 'string' || doc.subtitle.length > 500 || !Array.isArray(doc.sections) || doc.sections.length > 40) return false;
  let chars = doc.title.length + doc.subtitle.length;
  for (const section of doc.sections as OutcomeSection[]) {
    if (!section || typeof section.heading !== 'string' || section.heading.length > 160) return false;
    if (section.paragraphs !== undefined && !Array.isArray(section.paragraphs)) return false;
    if (section.columns !== undefined && !Array.isArray(section.columns)) return false;
    if (section.rows !== undefined && (!Array.isArray(section.rows) || section.rows.some(row => !Array.isArray(row)))) return false;
    if (section.grid !== undefined && (!section.grid || !Array.isArray(section.grid.cells) || section.grid.cells.some(cell => typeof cell !== 'string' || cell.length > 80))) return false;
    const strings = [section.heading, ...(section.paragraphs || []), ...(section.columns || []), ...(section.rows || []).flat(), ...(section.grid?.cells || [])];
    if (strings.some(item => typeof item !== 'string')) return false;
    chars += strings.reduce((sum, item) => sum + item.length, 0);
    if ((section.paragraphs?.length || 0) > 200 || (section.rows?.length || 0) > 200 || (section.grid?.cells.length || 0) > 300 || (section.grid && (!Number.isInteger(section.grid.columns) || section.grid.columns < 1 || section.grid.columns > 12))) return false;
  }
  return chars <= 40000;
}
export const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function outcomeHtml(doc:OutcomeDocument){
 const e=escapeHtml;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(doc.title)}</title><style>body{font:16px/1.6 system-ui;color:#24233d;background:#fffaf0;margin:0}main{max-width:850px;margin:auto;padding:32px}h1{font: bold 42px Georgia}h2{font: bold 26px Georgia}section{margin:24px 0;padding:20px;border:1px solid #24233d;border-radius:16px;background:white}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px;border-bottom:1px solid #ddd;overflow-wrap:anywhere}p{white-space:pre-wrap;overflow-wrap:anywhere}.grid{display:grid;gap:5px}.cell{border:1px solid #718366;background:#edf4dc;min-height:60px;padding:8px;overflow-wrap:anywhere;font-size:12px}footer{font-size:12px}@media(max-width:550px){main{padding:16px}h1{font-size:30px}td,th{font-size:12px;padding:4px}.cell{padding:3px;font-size:10px}}@media print{body{background:white}main{max-width:none;padding:0}section{break-inside:avoid}h1{font-size:30px}}</style></head><body><main><small>MADE WITH PEP RALLY</small><h1>${e(doc.title)}</h1><p>${e(doc.subtitle)}</p>${doc.sections.map(s=>`<section><h2>${e(s.heading)}</h2>${(s.paragraphs||[]).map(p=>`<p>${e(p)}</p>`).join('')}${s.rows?`<table>${s.columns?`<thead><tr>${s.columns.map(c=>`<th>${e(c)}</th>`).join('')}</tr></thead>`:''}<tbody>${s.rows.map(row=>`<tr>${row.map(c=>`<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:''}${s.grid?`<div class="grid" style="grid-template-columns:repeat(${Math.max(1,Math.min(12,Math.floor(s.grid.columns)))},minmax(0,1fr))">${s.grid.cells.map((c,i)=>`<div class="cell">${i+1}. ${e(c||'Open')}</div>`).join('')}</div>`:''}</section>`).join('')}<footer>A read-only snapshot, not a live booking or payment confirmation. Created ${e(new Date().toLocaleDateString())}. Open this file in a browser to read or print it. Keep private copies safe.</footer></main></body></html>`;
}
