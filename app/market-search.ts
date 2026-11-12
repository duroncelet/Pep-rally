export type SearchableRally = { title: string; category: string; keywords: string };
export function matchesRally(item: SearchableRally, query: string, category: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${item.title} ${item.category} ${item.keywords}`.toLowerCase();
  return (category === 'All' || item.category === category) && words.every(word => text.includes(word));
}
