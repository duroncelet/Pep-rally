"use client";
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { ItineraryArtifact } from '../../agentic/rally-runtime';
type Draft={session_id:string;version:number;revision_count:number;artifact:ItineraryArtifact;answers:Record<string,string>};
export default function SavedDraft({onApply}:{onApply:(artifact:ItineraryArtifact,answers:Record<string,string>)=>void}) {
  const {isSignedIn}=useUser(); const [draft,setDraft]=useState<Draft|null>(null);
  const [feedback,setFeedback]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [replace,setReplace]=useState(false);
  if(!isSignedIn) return null;
  async function request(revise=false) {
    if(busy) return; setBusy(true); setError('');
    try {
      const response=await fetch('/api/runs',revise?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'revise',id:draft?.session_id,version:draft?.version,feedback})}:undefined);
      const data=await response.json(); if(!response.ok) throw new Error(data.error || 'Please try again.');
      setDraft(data); setReplace(false); if(revise) setFeedback('');
    } catch(e) { setError(e instanceof Error?e.message:'Please try again.'); } finally {setBusy(false);}
  }
  return <details className="rally-content"><summary>Reopen or revise your saved starting plan</summary>
    <p>This is the original generated draft, separate from later workspace edits. Suggestions use planning templates, not live availability.</p>
    <button disabled={busy} onClick={()=>request()}>Load latest saved draft</button>
    {error && <p role="alert">{error}</p>}
    {draft && <><h3>{draft.artifact.title}</h3><p>{draft.artifact.summary}</p>
      <ul>{draft.artifact.days.flatMap(day=>day.items.map((item,i)=><li key={day.label+i}>{day.label}: {item.title}</li>))}</ul>
      <a href={`/api/runs?id=${encodeURIComponent(draft.session_id)}&format=markdown`}>Download this draft .md</a>
      <form onSubmit={e=>{e.preventDefault();request(true);}}><label>What should change?<textarea maxLength={2000} required value={feedback} onChange={e=>setFeedback(e.target.value)}/></label><p>{3-draft.revision_count} revisions remaining. Budget, food and slower-paced changes are supported; other requests are attached as a planning note.</p><button disabled={busy || draft.revision_count>=3}>Revise draft</button></form>
      <label><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/>Replace my current itinerary and trip setup with this draft. Download my current plan first if I want to keep those edits.</label>
      <button disabled={!replace || busy} onClick={()=>{onApply(draft.artifact,draft.answers);setReplace(false);}}>Use this draft</button>
    </>}
  </details>;
}
