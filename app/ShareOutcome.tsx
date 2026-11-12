"use client";
import { useEffect, useState } from "react";
import type { OutcomeDocument } from "./outcome-document";
import { latestOutcome, revokeOutcome, saveOutcome, type SavedOutcomeMeta } from "./save-outcome";
import { downloadOutcomePdf } from "./download-pdf";
import { packetEmailDraft } from "./email-packet";

// Part 1B, B2–B4 + D1: the workspace share block for a saved outcome. One
// link for the group: the organizer creates it (sign-in required), copies
// it, updates the same link as plans change, revokes it, or emails the PDF
// packet. The workspace itself stays private; only the saved snapshot
// renders at the link.
export default function ShareOutcome({ rallySlug, document, label, hint }: { rallySlug: string; document: OutcomeDocument; label: string; hint: string }) {
  const [meta, setMeta] = useState<SavedOutcomeMeta | null>(null);
  const [checked, setChecked] = useState(false);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => { setOrigin(location.origin); latestOutcome(rallySlug).then(setMeta).catch(() => setMeta(null)).finally(() => setChecked(true)); }, [rallySlug]);

  const stale = Boolean(meta?.isPublic && savedSnapshot && savedSnapshot !== JSON.stringify(document));

  async function share() {
    setBusy(true); setStatus("");
    try {
      const result = await saveOutcome({ id: meta?.id, rallySlug, title: document.title, document, isPublic: true });
      setMeta({ id: result.id, slug: result.slug, title: document.title, isPublic: true, updatedAt: new Date().toISOString() });
      setSavedSnapshot(JSON.stringify(document));
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

  async function revoke() {
    if (!meta) return;
    setBusy(true); setStatus("");
    try {
      await revokeOutcome(meta.id);
      setMeta(null); setSavedSnapshot(""); setConfirmingRevoke(false);
      setStatus("Link revoked. It no longer opens the page. Create a new link anytime.");
    } catch (error) { setStatus((error as Error).message); }
    finally { setBusy(false); }
  }

  async function emailPacket() {
    setEmailBusy(true); setStatus("");
    try {
      const draft = packetEmailDraft({ to: emailTo, title: document.title, shareUrl: meta?.isPublic ? `${origin}/s/${meta.slug}` : undefined });
      await downloadOutcomePdf(document);
      window.location.href = draft.mailto;
      setStatus(`Packet downloaded — attach ${draft.fileName} to the email draft.`);
    } catch (error) { setStatus((error as Error).message); }
    finally { setEmailBusy(false); }
  }

  return <section className="rally-content outcome-preview"><div className="workspace-intro"><div><h2>{label}</h2><p>{hint}</p></div></div>
    {!checked ? <p>Checking for a shared page…</p> : <>
      {meta?.isPublic && origin && <label>Your shared link<input readOnly value={`${origin}/s/${meta.slug}`} onFocus={(event) => event.target.select()} /></label>}
      <div className="rally-actions">
        {meta?.isPublic && <button onClick={copy}>Copy link</button>}
        <button className="primary" onClick={share} disabled={busy}>{busy ? "Saving…" : meta?.isPublic ? "Update shared page" : "Create shareable link"}</button>
        {meta?.isPublic && <button onClick={() => setConfirmingRevoke(true)} disabled={busy}>Revoke link</button>}
      </div>
      {confirmingRevoke && <p>Revoke this link? It will stop working immediately. <button onClick={revoke} disabled={busy}>Yes, revoke it</button> <button onClick={() => setConfirmingRevoke(false)} disabled={busy}>Keep it</button></p>}
      {stale && <p>Plans changed since the last share — update the link to refresh the page.</p>}
      <p>Anyone with the link can read the page. Your workspace stays private. Sign-in is required to create the link.</p>
      <label>Email the PDF<input type="email" value={emailTo} placeholder="name@example.com" onChange={(event) => setEmailTo(event.target.value)} /></label>
      <div className="rally-actions"><button onClick={emailPacket} disabled={emailBusy}>{emailBusy ? "Preparing…" : "Download + email PDF"}</button></div>
      <p>The packet downloads first — attach it to the email draft that opens.</p>
    </>}
    {status && <p role="status">{status}</p>}
  </section>;
}
