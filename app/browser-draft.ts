"use client";
import {useEffect,useState} from 'react';
const prefix='pep-rally-recovery:';
export function readBrowserDraft(key:string,owner:string,serverUpdated?:string|number) {
  try {
    const raw=localStorage.getItem(prefix+key+':'+owner);
    if(!raw)return null;
    const draft=JSON.parse(raw);
    if(!draft.updated || Date.now()-draft.updated>30*86400000)return null;
    if(serverUpdated && new Date(serverUpdated).getTime()>=draft.updated)return null;
    return draft.plan;
  } catch {return null;}
}
export function useBrowserDraft(key:string,owner:string,plan:unknown,enabled:boolean) {
  const [status,setStatus]=useState('');
  const serialized=JSON.stringify(plan);
  useEffect(()=>{
    if(!enabled||!owner)return;
    const persist=()=>{try{localStorage.setItem(prefix+key+':'+owner,JSON.stringify({updated:Date.now(),plan:JSON.parse(serialized)}));setStatus('Draft backed up on this browser.');}catch{setStatus('Browser backup unavailable. Download a copy or save to your account.');}};
    const timer=setTimeout(persist,300);
    window.addEventListener('pagehide',persist);
    return()=>{clearTimeout(timer);window.removeEventListener('pagehide',persist);};
  },[key,owner,serialized,enabled]);
  return {status,clear:()=>{try{localStorage.removeItem(prefix+key+':'+owner);setStatus('Browser backup removed. Your open work is unchanged.');}catch{setStatus('Could not remove this browser backup.');}}};
}
