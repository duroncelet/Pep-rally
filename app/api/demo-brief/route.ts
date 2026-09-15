import demoBrief from "../../../Pep-Rally-Demo-Brief.md?raw";

export async function GET() {
  return new Response(demoBrief, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": 'attachment; filename="Pep-Rally-Demo-Brief.md"',
      "cache-control": "public, max-age=300",
    },
  });
}
