import type {OutcomeDocument} from './outcome-document';
export function encodeOutcome(doc:OutcomeDocument){
 const bytes=new TextEncoder().encode(JSON.stringify(doc));
 const encoded=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 if(encoded.length>16000)throw new Error('This plan is too large for a reliable link. Share the plan file instead.');
 return encoded;
}
export function decodeOutcome(encoded:string):OutcomeDocument {
 if(!encoded||encoded.length>16000||!/^[A-Za-z0-9_-]+$/.test(encoded))throw new Error('This shared plan link is invalid or too large. Ask the organizer for a new link or the plan file.');
 const raw=atob(encoded.replaceAll('-','+').replaceAll('_','/'));
 const doc=JSON.parse(new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));
 const text=(v:unknown)=>typeof v==='string'&&v.length<=10000;
 if(!doc||!text(doc.title)||!text(doc.subtitle)||!Array.isArray(doc.sections)||doc.sections.length>100)throw new Error('This plan cannot be opened.');
 for(const s of doc.sections){
  if(!s||!text(s.heading)||(s.paragraphs&&(!Array.isArray(s.paragraphs)||!s.paragraphs.every(text)))||(s.columns&&(!Array.isArray(s.columns)||!s.columns.every(text)))||(s.rows&&(!Array.isArray(s.rows)||!s.rows.every((r:unknown)=>Array.isArray(r)&&r.every(text))))||(s.grid&&(!Number.isInteger(s.grid.columns)||s.grid.columns<1||s.grid.columns>12||!Array.isArray(s.grid.cells)||s.grid.cells.length>144||!s.grid.cells.every(text))))throw new Error('This plan contains an unsupported section.');
 }
 return doc;
}
