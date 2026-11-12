"use client";
import {useEffect,useState} from 'react';
import {decodeOutcome} from '../share-document';
import type {OutcomeDocument} from '../outcome-document';
import OutcomePreview from '../OutcomePreview';
export default function SharedPlan(){
 const [doc,setDoc]=useState<OutcomeDocument|null>(null);const [error,setError]=useState('');
 useEffect(()=>{try{setDoc(decodeOutcome(location.hash.slice(1)));}catch(e){setError(e instanceof Error?e.message:'This plan could not open.');}},[]);
 return <main className="policy-page"><nav><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a></nav>{doc?<><header><h1>{doc.title}</h1><p>{doc.subtitle}</p><p>A read-only snapshot shared by its author. Anyone with this link can read it. It is not a live workspace or a booking confirmation.</p></header><OutcomePreview document={doc} label="Your shared plan" privacy="Open the preview to read, download or print." initialOpen/></>:<p role="status">{error||'Opening shared plan…'}</p>}</main>;
}
