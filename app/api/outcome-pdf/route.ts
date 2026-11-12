import { renderOutcomePdf, validatePdfDocument } from '../../outcome-pdf.ts';

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 60000) return Response.json({ error: 'This plan is too large for a PDF.' }, { status: 413 });
  let doc: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('empty');
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 60000) { await reader.cancel(); return Response.json({ error: 'This plan is too large for a PDF.' }, { status: 413 }); }
      chunks.push(part.value);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    doc = JSON.parse(new TextDecoder().decode(body));
  } catch { return Response.json({ error: 'The plan could not be read.' }, { status: 400 }); }
  if (!validatePdfDocument(doc)) return Response.json({ error: 'This plan cannot be made into a PDF yet.' }, { status: 422 });
  try {
    const bytes = await renderOutcomePdf(doc);
    return new Response(bytes.slice().buffer, { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="pep-rally-plan.pdf"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch {
    return Response.json({ error: 'The PDF could not be created. Your plan is still on this page.' }, { status: 500 });
  }
}
