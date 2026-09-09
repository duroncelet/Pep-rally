import { findConcept, rallyConcepts } from "../../../catalog";
import RallyWorkspace from "./RallyWorkspace";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return rallyConcepts.map(({ slug }) => ({ slug })); }

export default async function MarketRallyPage({ params }: PageProps) {
  const concept = findConcept((await params).slug);
  if (!concept) return <main className="concept-missing"><h1>This Rally moved.</h1><a href="/#marketplace">Browse Rallies →</a></main>;
  return <RallyWorkspace concept={concept}/>;
}
