"use client";

import { useEffect, useMemo, useState } from "react";

type Guest = {id:string;name:string;contact:string;rsvp:"Yes"|"Maybe"|"No";paid:number;dietary:string};
type Task = {id:string;text:string;owner:string;done:boolean};
type Expense = {id:string;label:string;amount:number;paidBy:string};
type Event = {id:string;day:number;time:string;title:string;owner:string};

const names = ["Kelly","Avery","Jordan","Sam","Morgan","Taylor","Riley","Casey"];
const initialGuests:Guest[] = names.map((name,index)=>({id:`g${index}`,name,contact:index%2?`${name.toLowerCase()}@example.com`:`+1 555 010 ${1200+index}`,rsvp:"Yes",paid:index<3?450:index<6?150:0,dietary:index===2?"Vegetarian":""}));
const initialTasks:Task[] = [
  {id:"t1",text:"Confirm the house and cancellation policy",owner:"Kelly",done:true},
  {id:"t2",text:"Collect dietary and accessibility needs",owner:"Avery",done:false},
  {id:"t3",text:"Book Saturday dinner",owner:"Jordan",done:false},
  {id:"t4",text:"Share arrival plan with everyone",owner:"Sam",done:false},
];
const initialExpenses:Expense[] = [
  {id:"e1",label:"House",amount:1620,paidBy:"Kelly"},
  {id:"e2",label:"Groceries + drinks",amount:480,paidBy:"Avery"},
  {id:"e3",label:"Dinner deposit",amount:360,paidBy:"Jordan"},
  {id:"e4",label:"Activities",amount:540,paidBy:"Kelly"},
];
const initialEvents:Event[] = [
  {id:"v1",day:1,time:"4:00 PM",title:"Check-in + welcome drinks",owner:"Kelly"},
  {id:"v2",day:1,time:"7:30 PM",title:"Easy group dinner",owner:"Avery"},
  {id:"v3",day:2,time:"11:00 AM",title:"Pool morning + games",owner:"Jordan"},
  {id:"v4",day:2,time:"7:30 PM",title:"Celebration dinner",owner:"Sam"},
  {id:"v5",day:3,time:"10:30 AM",title:"Brunch + memory swap",owner:"Morgan"},
];

export default function BacheloretteRally() {
  const [tab,setTab] = useState<"overview"|"people"|"money"|"itinerary"|"tasks"|"packing"|"guest">("overview");
  const [guests,setGuests] = useState(initialGuests);
  const [tasks,setTasks] = useState(initialTasks);
  const [expenses,setExpenses] = useState(initialExpenses);
  const [events,setEvents] = useState(initialEvents);
  const [packing,setPacking] = useState(["Swimsuit","Dinner outfit","Sunscreen","Reusable water bottle","A note for the bride"]);
  const [perPerson,setPerPerson] = useState(450);
  const [paymentLink,setPaymentLink] = useState("https://buy.stripe.com/example");
  const [saved,setSaved] = useState(false);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{(async()=>{const response=await fetch("/api/party-hub");const data=await response.json();if(response.status===401&&data.signIn){window.location.href=data.signIn;return;}if(data.plan?.version===2){setGuests(data.plan.guests);setTasks(data.plan.tasks);setExpenses(data.plan.expenses);setEvents(data.plan.events);setPacking(data.plan.packing);setPerPerson(data.plan.perPerson);setPaymentLink(data.plan.paymentLink);}setLoading(false);})();},[]);
  const groupBudget=perPerson*guests.length;
  const collected=guests.reduce((sum,g)=>sum+Math.min(g.paid,perPerson),0);
  const expenseTotal=expenses.reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  const tasksDone=tasks.filter(t=>t.done).length;
  const rsvpCount=guests.filter(g=>g.rsvp==="Yes").length;
  const outstanding=Math.max(0,groupBudget-collected);
  const rallyUrl=typeof window!=="undefined"?`${window.location.origin}/rally/bachelorette`:"/rally/bachelorette";
  const message=`Palm Springs is happening 🎉 Your total share is $${perPerson}. Check your balance and the latest itinerary here: ${rallyUrl}`;
  const save=async()=>{const response=await fetch("/api/party-hub",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({version:2,guests,tasks,expenses,events,packing,perPerson,paymentLink})});if(response.ok){setSaved(true);setTimeout(()=>setSaved(false),1600);}};
  const nav=["overview","people","money","itinerary","tasks","packing","guest"] as const;

  if(loading) return <main className="rally-loading">Gathering your Rally…</main>;
  return <main className="rally-room">
    <header className="rally-header"><a href="/" className="brand"><span className="brand-mark">P</span>Pep Rally</a><div><small>BACHELORETTE BLUEPRINT · YOUR SAVED RALLY</small><h1>Palm Springs, handled.</h1><p>3 days · {guests.length} guests · ${groupBudget.toLocaleString()} working budget</p></div><button className="primary" onClick={save}>{saved?"Saved ✓":"Save Rally"}</button></header>
    <nav className="rally-nav">{nav.map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item==="guest"?"Guest view":item}</button>)}</nav>

    {tab==="overview"&&<section className="rally-content"><div className="rally-stats"><article><small>CONFIRMED</small><b>{rsvpCount}/{guests.length}</b><span>guests</span></article><article><small>COLLECTED</small><b>${collected.toLocaleString()}</b><span>${outstanding.toLocaleString()} remaining</span></article><article><small>TASKS</small><b>{tasksDone}/{tasks.length}</b><span>complete</span></article><article><small>PLANNED SPEND</small><b>${expenseTotal.toLocaleString()}</b><span>${Math.max(0,groupBudget-expenseTotal).toLocaleString()} cushion</span></article></div><div className="rally-grid"><article className="rally-card wide"><small>NEXT UP</small><h2>{events[0]?.title}</h2><p>Day {events[0]?.day} · {events[0]?.time} · Owner: {events[0]?.owner}</p><button onClick={()=>setTab("itinerary")}>Open itinerary →</button></article><article className="rally-card"><small>NEEDS ATTENTION</small><h3>{guests.filter(g=>g.paid<perPerson).length} balances outstanding</h3><p>{tasks.filter(t=>!t.done).length} open tasks</p><button onClick={()=>setTab("money")}>Review money →</button></article><article className="rally-card"><small>GROUP UPDATE</small><p>{message}</p><div className="rally-actions"><a href={`mailto:?subject=Palm Springs update&body=${encodeURIComponent(message)}`}>Email</a><a href={`sms:?&body=${encodeURIComponent(message)}`}>Text</a></div></article></div></section>}

    {tab==="people"&&<section className="rally-content"><div className="rally-title"><div><small>PEOPLE</small><h2>Everyone, accounted for.</h2></div><button onClick={()=>setGuests([...guests,{id:crypto.randomUUID(),name:"New guest",contact:"",rsvp:"Maybe",paid:0,dietary:""}])}>+ Add guest</button></div><div className="rally-table"><div className="rally-row labels"><span>Name</span><span>Contact</span><span>RSVP</span><span>Needs</span><span></span></div>{guests.map((g,i)=><div className="rally-row" key={g.id}><input value={g.name} onChange={e=>setGuests(guests.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/><input value={g.contact} onChange={e=>setGuests(guests.map((x,j)=>j===i?{...x,contact:e.target.value}:x))}/><select value={g.rsvp} onChange={e=>setGuests(guests.map((x,j)=>j===i?{...x,rsvp:e.target.value as Guest["rsvp"]}:x))}><option>Yes</option><option>Maybe</option><option>No</option></select><input placeholder="Dietary, access…" value={g.dietary} onChange={e=>setGuests(guests.map((x,j)=>j===i?{...x,dietary:e.target.value}:x))}/><button aria-label={`Remove ${g.name}`} onClick={()=>setGuests(guests.filter(x=>x.id!==g.id))}>×</button></div>)}</div></section>}

    {tab==="money"&&<section className="rally-content"><div className="rally-title"><div><small>MONEY</small><h2>Every dollar reconciles.</h2></div><label>Share per person <input type="number" min="0" value={perPerson} onChange={e=>setPerPerson(Number(e.target.value))}/></label></div><div className="money-strip"><span>Group budget <b>${groupBudget.toLocaleString()}</b></span><span>Collected <b>${collected.toLocaleString()}</b></span><span>Outstanding <b>${outstanding.toLocaleString()}</b></span><span>Planned expenses <b>${expenseTotal.toLocaleString()}</b></span></div><label className="payment-field">Shareable payment link<input value={paymentLink} onChange={e=>setPaymentLink(e.target.value)}/><small>Paste a real payment link. Pep Rally tracks the balances; it does not move money in this prototype.</small></label><div className="balance-list">{guests.map((g,i)=><article key={g.id}><div><b>{g.name}</b><small>${Math.max(0,perPerson-g.paid).toLocaleString()} remaining</small></div><label>Paid $<input type="number" min="0" max={perPerson} value={g.paid} onChange={e=>setGuests(guests.map((x,j)=>j===i?{...x,paid:Number(e.target.value)}:x))}/></label><div className="balance-meter"><i style={{width:`${Math.min(100,(g.paid/perPerson)*100)}%`}}/></div></article>)}</div><div className="rally-title compact"><div><small>EXPENSE PLAN</small><h3>What the group budget covers</h3></div><button onClick={()=>setExpenses([...expenses,{id:crypto.randomUUID(),label:"New expense",amount:0,paidBy:"Kelly"}])}>+ Add expense</button></div><div className="expense-list">{expenses.map((e,i)=><div key={e.id}><input value={e.label} onChange={x=>setExpenses(expenses.map((v,j)=>j===i?{...v,label:x.target.value}:v))}/><label>$ <input type="number" value={e.amount} onChange={x=>setExpenses(expenses.map((v,j)=>j===i?{...v,amount:Number(x.target.value)}:v))}/></label><select value={e.paidBy} onChange={x=>setExpenses(expenses.map((v,j)=>j===i?{...v,paidBy:x.target.value}:v))}>{guests.map(g=><option key={g.id}>{g.name}</option>)}</select><button onClick={()=>setExpenses(expenses.filter(v=>v.id!==e.id))}>×</button></div>)}</div></section>}

    {tab==="itinerary"&&<section className="rally-content"><div className="rally-title"><div><small>ITINERARY</small><h2>A plan with owners.</h2></div><button onClick={()=>setEvents([...events,{id:crypto.randomUUID(),day:1,time:"12:00 PM",title:"New plan",owner:"Kelly"}])}>+ Add plan</button></div><div className="event-list">{events.map((event,i)=><article key={event.id}><label>Day<input type="number" min="1" max="7" value={event.day} onChange={e=>setEvents(events.map((x,j)=>j===i?{...x,day:Number(e.target.value)}:x))}/></label><label>Time<input value={event.time} onChange={e=>setEvents(events.map((x,j)=>j===i?{...x,time:e.target.value}:x))}/></label><input className="event-name" value={event.title} onChange={e=>setEvents(events.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/><select value={event.owner} onChange={e=>setEvents(events.map((x,j)=>j===i?{...x,owner:e.target.value}:x))}>{guests.map(g=><option key={g.id}>{g.name}</option>)}</select><button onClick={()=>setEvents(events.filter(x=>x.id!==event.id))}>×</button></article>)}</div></section>}

    {tab==="tasks"&&<section className="rally-content"><div className="rally-title"><div><small>TASKS</small><h2>No invisible labor.</h2></div><button onClick={()=>setTasks([...tasks,{id:crypto.randomUUID(),text:"New task",owner:"Kelly",done:false}])}>+ Add task</button></div><div className="task-list">{tasks.map((task,i)=><article className={task.done?"done":""} key={task.id}><button className="check" onClick={()=>setTasks(tasks.map((x,j)=>j===i?{...x,done:!x.done}:x))}>{task.done?"✓":""}</button><input value={task.text} onChange={e=>setTasks(tasks.map((x,j)=>j===i?{...x,text:e.target.value}:x))}/><select value={task.owner} onChange={e=>setTasks(tasks.map((x,j)=>j===i?{...x,owner:e.target.value}:x))}>{guests.map(g=><option key={g.id}>{g.name}</option>)}</select><button onClick={()=>setTasks(tasks.filter(x=>x.id!==task.id))}>×</button></article>)}</div></section>}

    {tab==="packing"&&<section className="rally-content"><div className="rally-title"><div><small>PACKING</small><h2>The shared “don’t forget” list.</h2></div><button onClick={()=>setPacking([...packing,"New item"])}>+ Add item</button></div><div className="packing-list">{packing.map((item,i)=><article key={i}><span>□</span><input value={item} onChange={e=>setPacking(packing.map((x,j)=>j===i?e.target.value:x))}/><button onClick={()=>setPacking(packing.filter((_,j)=>j!==i))}>×</button></article>)}</div></section>}

    {tab==="guest"&&<section className="rally-content guest-view"><div className="guest-banner"><small>GUEST VIEW · READ-ONLY PREVIEW</small><h2>You&apos;re going to Palm Springs!</h2><p>Everything the group needs—without the organizer controls.</p></div><div className="rally-grid"><article className="rally-card wide"><small>YOUR WEEKEND</small>{events.map(event=><p key={event.id}><b>Day {event.day} · {event.time}</b><br/>{event.title}</p>)}</article><article className="rally-card"><small>YOUR SHARE</small><h3>${perPerson}</h3><a className="primary inline" href={paymentLink}>Open payment link</a></article><article className="rally-card"><small>BRING</small>{packing.map(item=><p key={item}>□ {item}</p>)}</article></div></section>}
  </main>;
}
