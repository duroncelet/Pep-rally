import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { savedOutcomes } from "../../../db/schema";
import { isValidOutcomeSlug, publicOutcomeFromRow, rallyListingHref } from "../../saved-outcomes";
import { findSampleOutcome } from "../../sample-outcomes";
import type { OutcomeDocument } from "../../outcome-document";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

// Shared links are unguessable tokens, not public content: never index them.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const doc = await loadPublicOutcome((await params).slug);
  return { title: doc ? `${doc.doc.title} · Pep Rally` : "Shared plan · Pep Rally", robots: { index: false, follow: false } };
}

async function loadPublicOutcome(slug: string): Promise<{ doc: OutcomeDocument; rallySlug: string; isSample: boolean } | null> {
  // Built-in samples (Part 1B, B5) resolve without a database row. Their
  // reserved slugs can never collide with a generated slug.
  const sample = findSampleOutcome(slug);
  if (sample) return { doc: sample.document, rallySlug: sample.rallySlug, isSample: true };
  if (!isValidOutcomeSlug(slug)) return null;
  let row;
  try {
    [row] = await getDb().select().from(savedOutcomes).where(eq(savedOutcomes.slug, slug)).limit(1);
  } catch {
    return null;
  }
  const doc = publicOutcomeFromRow(row);
  if (!doc || !row) return null;
  return { doc, rallySlug: row.rallySlug, isSample: false };
}

function Unavailable() {
  return <main className="policy-page"><nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a></nav><header><small>SHARED PLAN</small><h1>This shared plan isn&apos;t available.</h1><p>The link may have been revoked, or the address may be mistyped. Ask the person who shared it for a new link.</p><p><a href="/">Back to Pep Rally →</a></p></header></main>;
}

export default async function SharedOutcomePage({ params }: PageProps) {
  const found = await loadPublicOutcome((await params).slug);
  // Missing and private links render identically: a private outcome never
  // leaks its existence to a signed-out visitor.
  if (!found) return <Unavailable />;
  const { doc, rallySlug, isSample } = found;
  return <main className="policy-page public-outcome-page"><nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href={rallyListingHref(rallySlug)}>Make your own →</a></div></nav>
    <header><small>{isSample ? "SAMPLE OUTCOME — A FINISHED EXAMPLE" : "SHARED WITH PEP RALLY"}</small><h1>{doc.title}</h1><p>{doc.subtitle}</p>{isSample ? <p className="sample-banner">This is a sample, not a real person&apos;s plan. Open the Rally to make your own with your details — the blank form is one step away.</p> : <p className="public-outcome-note">A read-only snapshot shared by its author. Anyone with this link can read it. It is not a live workspace, a booking, or a payment confirmation.</p>}</header>
    <div className="public-outcome-sections">{doc.sections.map((section) => <section key={section.heading}>
      <h2>{section.heading}</h2>
      {(section.paragraphs || []).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {section.rows && <table><thead>{section.columns && <tr>{section.columns.map((column) => <th key={column}>{column}</th>)}</tr>}</thead><tbody>{section.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>}
      {section.grid && <div className="public-outcome-grid" style={{ gridTemplateColumns: `repeat(${section.grid.columns},minmax(0,1fr))` }}>{section.grid.cells.map((cell, index) => <div key={index} className="public-outcome-cell"><b>{index + 1}</b> {cell || "Open"}</div>)}</div>}
    </section>)}</div>
    <footer><span>Made with Pep Rally</span><a href={rallyListingHref(rallySlug)}>Make your own →</a></footer>
  </main>;
}
