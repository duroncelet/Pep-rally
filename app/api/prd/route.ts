import prd from "../../../Pep-Rally-PRD.md?raw";

export async function GET() {
  return new Response(prd, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": 'attachment; filename="Pep-Rally-PRD-v0.1.md"',
      "cache-control": "public, max-age=300",
    },
  });
}
