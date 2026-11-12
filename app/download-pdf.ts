import type { OutcomeDocument } from './outcome-document';
import { safeFileName } from './download-markdown';

export async function downloadOutcomePdf(doc: OutcomeDocument) {
  const response = await fetch('/api/outcome-pdf', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'The PDF could not be created.');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeFileName(doc.title)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
