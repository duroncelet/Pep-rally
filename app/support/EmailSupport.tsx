"use client";
import {useState} from 'react';
import {SUPPORT_EMAIL,supportEmailDraft} from '../support-email';
export default function EmailSupport(){
 const [email,setEmail]=useState(''),[message,setMessage]=useState(''),[status,setStatus]=useState('');
 function open(){try{const href=supportEmailDraft({email,rally:'',message});setStatus('Review the draft and press Send in your email app. Nothing has been sent by this page.');window.location.href=href;}catch(error){setStatus(error instanceof Error?error.message:'Check your details.');}}
 return <section className="rally-content"><h2>Email us—no sign-in needed.</h2><p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p><form onSubmit={e=>{e.preventDefault();open();}}><div className="setup-grid"><label className="full-field">Your reply email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="full-field">What happened? Include the Rally name or page URL.<textarea required minLength={12} maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)}/></label></div><button className="primary">Open email draft</button></form><p>This opens your email app; review and send the draft there. If no app opens, copy your message and email the address above.</p>{status&&<p role="status">{status}</p>}</section>;
}
