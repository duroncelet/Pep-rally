"use client";
import {settleBills,type SharedBill} from './destinations';
type Guest={id:string;name:string;paid:number};
export default function MoneySummary({guests,bills,planned,fundHolder,onFundHolder}:{guests:Guest[];bills:SharedBill[];planned:number;fundHolder:string;onFundHolder:(id:string)=>void}){
 const actual=bills.reduce((sum,b)=>sum+Math.round(b.amount*100),0);
 const validHolder=guests.some(g=>g.id===fundHolder);
 const transfers=validHolder?guests.filter(g=>g.id!==fundHolder&&g.paid>0).map(g=>({from:g.id,to:fundHolder,cents:Math.round(g.paid*100)})):[];
 const repayments=settleBills(bills,transfers);
 const name=(id:string)=>guests.find(g=>g.id===id)?.name||'Former guest';
 const money=(n:number)=>(n/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
 return <article className="trip-card"><h3>The money picture</h3><p>Planned: {money(Math.round(planned*100))} · Actually spent: {money(actual)} · Difference: {money(Math.round(planned*100)-actual)}</p><label>Who holds the recorded group contributions?<select value={fundHolder} onChange={e=>onFundHolder(e.target.value)}><option value="">Do not reconcile contributions yet</option>{guests.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><p>Choose the recipient only if every recorded contribution was sent to them. Bills paid from that fund must name this person as payer. Their own contribution is not a transfer to themselves.</p>{validHolder?<><h4>After recorded contributions</h4><p>The repayment list below includes {transfers.length} recorded contribution transfers.</p>{!repayments.length&&<p>Recorded bills and contributions balance.</p>}<p>Unused contributions appear as refunds owed by the fund holder. Review after entering all bills; these figures are not new payment requests.</p></>:<p>Bill-only repayments appear below. Select the fund holder to avoid requesting money someone has already contributed.</p>}<small>Only confirmed, manually recorded transfers belong here. Pep Rally cannot verify bank activity.</small></article>;
}
