"use client";
import { formatPrice } from "../../format-price";
import {useEffect,useState,useRef} from 'react';
export default function PurchaseButton({slug,priceCents}:{slug:string;priceCents:number}){
 const [ready,setReady]=useState({enabled:false,mode:'off'});const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');const requestId=useRef('');
 useEffect(()=>{fetch('/api/checkout/status?slug='+encodeURIComponent(slug)).then(r=>r.ok?r.json():null).then(d=>{if(d)setReady(d);}).catch(()=>{});},[slug]);
 async function buy(){if(busy)return;setBusy(true);setStatus('Opening secure checkout…');try{
  if(!requestId.current)requestId.current=crypto.randomUUID();
  const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestId.current},body:JSON.stringify({conceptSlug:slug})});const d=await r.json();
  if(r.status===401&&d.signIn){location.href=d.signIn;return;}
  if(r.ok&&d.url){location.href=d.url;return;}
  if(r.status===409)requestId.current='';
  setStatus(d.error||'Checkout could not open. Please retry.');
 }catch{setStatus('Connection interrupted. Retry to resume this checkout.');}finally{setBusy(false);}}
 return <div className="concept-buy"><a className="primary" href={`/rally/market/${slug}`}>Try the free preview →</a>{ready.enabled?<><button className="primary" disabled={busy} onClick={buy}>{busy?'Opening…':`${ready.mode==='test'?'Test checkout':'Buy this Rally'} · ${formatPrice(priceCents)}`}</button><small>{ready.mode==='test'?'Sandbox only. No real money moves.':'One-time payment. Access and downloads for this Rally.'}</small></>:<small>Paid access is not on sale yet. Planned price: {formatPrice(priceCents)}.</small>}{status&&<p role="status">{status}</p>}<a href="/policies">Policies</a> · <a href="/support">Support</a></div>;
}
