"use client";
import { useEffect, useState } from "react";
import type { OutcomeDocument } from "./outcome-document";
import { latestOutcome, saveOutcome, type SavedOutcomeMeta } from "./save-outcome";

// Part 1B, B2–B4: the workspace share block for a saved outcome. One link for
// the group: the organizer creates it (sign-in required), copies it, and
// updates the same link as plans change. The workspace itself stays private;
// only the saved snapshot renders at the link. Revoking the link and
// emailing the packet arrive with D1.
export default function ShareOutcome({ rallySlug, document, label, hint }: { rallySlug: string; document: OutcomeDocument; label: string; hint: string }) {
  const [meta, setMeta] = useState<SavedOutcomeMeta | null>(null);
  const [checked, setChecked] = useState(false);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  // The page title is the shared page's heading. It defaults to the outcome
  // title; the owner can rename it — for a travel adviser, this is what
  // brands the proposal link as theirs.
  const [pageTitle, setPageTitle] = useState(document.title);
  const [titleTouched, setTitleTouched] = useState(false);

  useEffect(() => { setOrigin(location.origin); latestOutcome(rallySlug).then(setMeta).catch(() => setMeta(null)).finally(() => setChecked(true)); }, [rallySlug]);
  useEffect(() => { if (!titleTouched) setPageTitle(document.title); }, [document.title, titleTouched]);

  const sharedDocument = { ...document, title: pageTitle.trim() || document.title };
  const stale = Boolean(meta?.isPublic && savedSnapshot && savedSnapshot !== JSON.stringify(sharedDocument));

  async function share() {
    setBusy(true); setStatus("");
    try {
      const result = await saveOutcome({ id: meta?.id, rallySlug, title: sharedDocument.title, document: sharedDocument, isPublic: true });
      setMeta({ id: result.id, slug: result.slug, title: sharedDocument.title, isPublic: true, updatedAt: new Date().toISOString() });
      setSavedSnapshot(JSON.stringify(sharedDocument));
      setStatus(meta?.isPublic ? "Shared page updated. Anyone with the link sees the latest plan." : "Shareable link created. Anyone with the link can read the page.");
    } catch (error) { setStatus((error as Error).message); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!meta) return;
    const value = `${origin}/s/${meta.slug}`;
    try { await navigator.clipboard.writeText(value); setStatus("Link copied. Paste it into the group chat."); }
    catch { setStatus(`Copy the link above: ${value}`); }
  }

  return <section className="rally-content outcome-preview"><div className="workspace-intro"><div><h2>{label}</h2><p>{hint}</p></div></div>
    {!checked ? <p>Checking for a shared page…</p> : <>
      <label>Page title<input value={pageTitle} maxLength={160} onChange={(event) => { setPageTitle(event.target.value); setTitleTouched(true); }} /></label>
      {meta?.isPublic && origin && <label>Your shared link<input readOnly value={`${origin}/s/${meta.slug}`} onFocus={(event) => event.target.select()} /></label>}
      <div className="rally-actions">
        {meta?.isPublic && <button onClick={copy}>Copy link</button>}
        <button className="primary" onClick={share} disabled={busy}>{busy ? "Saving…" : meta?.isPublic ? "Update shared page" : "Create shareable link"}</button>
      </div>
      {stale && <p>Plans changed since the last share — update the link to refresh the page.</p>}
      <p>Anyone with the link can read the page. Your workspace stays private. Sign-in is required to create the link.</p>
    </>}
    {status && <p role="status">{status}</p>}
  </section>;
}
