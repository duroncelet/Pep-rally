"use client";

import { useEffect, useState } from "react";

type SavedRally = { id: string; title: string; summary: string; toolSlug: string; updatedAt: string | number; inputs?: { accessUrl?: string } };

export default function LibraryPage() {
  const [rallies, setRallies] = useState<SavedRally[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  async function refresh() {
    const response = await fetch("/api/rallies");
    const data = await response.json();
    if (response.status === 401 && data.signIn) { window.location.href = data.signIn; return; }
    setRallies(data.rallies ?? []); setName(data.user?.name ?? ""); setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function remove(id: string) {
    await fetch(`/api/rallies?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setRallies((current) => current.filter((item) => item.id !== id));
  }

  function accessUrl(item: SavedRally) {
    if (item.inputs?.accessUrl) return item.inputs.accessUrl;
    if (item.toolSlug === "garden-planner") return "/rally/garden";
    if (item.toolSlug === "bachelorette-blueprint") return "/rally/bachelorette";
    return "/#marketplace";
  }

  return <main className="library-page"><nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><a href="/#marketplace">Shop</a><a href="/build">Sell your Rally</a></div></nav><header><small>MY RALLIES</small><h1>{name ? `${name.split(" ")[0]}’s Rally library.` : "Your Rally library."}</h1><p>Every Rally you save or buy lives here as a working workspace—with your progress, access, and future updates together.</p></header>{loading ? <section className="library-loading">Opening your library…</section> : rallies.length ? <section className="library-grid">{rallies.map((item) => <article key={item.id}><div><small>SAVED WORKSPACE</small><span>Updates included</span></div><h2>{item.title}</h2><p>{item.summary}</p><small>Last used {new Date(item.updatedAt).toLocaleDateString()}</small><div><a className="primary" href={accessUrl(item)}>Open Rally →</a><button onClick={() => remove(item.id)}>Remove</button></div></article>)}</section> : <section className="library-empty"><span>PR</span><h2>Your shelf is ready.</h2><p>Try a free Pep Rally Original or choose something from the marketplace. Once you save your first workspace, it will stay here.</p><a className="primary" href="/#marketplace">Find a Rally →</a></section>}<section className="library-promise"><span><b>The working app</b>Open the Rally itself—not a setup file.</span><span><b>Your saved progress</b>Return to the plan, notes, or result you created.</span><span><b>Product updates</b>Keep access to improvements from the maker.</span><span><b>Help when needed</b>See the maker’s support and marketplace protection.</span></section></main>;
}
