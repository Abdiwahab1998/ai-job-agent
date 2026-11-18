import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BriefcaseBusiness, FileSearch, Mail, ShieldCheck, Search, Sparkles } from 'lucide-react';
import './style.css';

type Job = {id:string;title:string;company:string;location:string;description:string;url:string};
type Analysis = {coverage:number;matched:string[];missing:string[];note:string};
type Draft = {subject:string;body:string;sent:boolean};
async function post<T>(path:string, payload:unknown):Promise<T> {
  const response = await fetch(path, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Något gick fel');
  return data as T;
}
function App(){
  const [query,setQuery]=useState('systemutvecklare');
  const [location,setLocation]=useState('Göteborg');
  const [jobs,setJobs]=useState<Job[]>([]);
  const [selected,setSelected]=useState<Job|null>(null);
  const [cv,setCv]=useState('');
  const [analysis,setAnalysis]=useState<Analysis|null>(null);
  const [name,setName]=useState('');
  const [draft,setDraft]=useState<Draft|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function findJobs(){
    setLoading(true);setError('');setSelected(null);setAnalysis(null);setDraft(null);
    try{const r=await fetch(`/api/jobs?${new URLSearchParams({query,location})}`);const d=await r.json();if(!r.ok)throw new Error(d.error);setJobs(d.jobs ?? []);}catch(e){setError(String(e instanceof Error?e.message:e));}finally{setLoading(false);}
  }
  async function analyze(){if(!selected)return;setLoading(true);setError('');try{setAnalysis(await post('/api/analyze',{cv,description:selected.description}));}catch(e){setError(String(e instanceof Error?e.message:e));}finally{setLoading(false);}}
  async function makeDraft(){if(!selected)return;setLoading(true);setError('');try{setDraft(await post('/api/email-draft',{name,title:selected.title,company:selected.company}));}catch(e){setError(String(e instanceof Error?e.message:e));}finally{setLoading(false);}}
  return <div className="app"><header><div className="logo"><Sparkles size={23}/> AI Job Agent <span>PROTOTYP</span></div><div className="subtitle">Din framtida automatiska jobbassistent</div></header>
    <main><section className="hero"><div className="eyebrow"><ShieldCheck size={16}/> Säkert utvecklingsläge – ingenting skickas</div><h1>Hitta jobb. Matcha ditt CV.<br/><em>Automatisera nästa steg.</em></h1><p>Första fungerande versionen med riktiga svenska jobbannonser, enkel CV-matchning och mejlutkast. Automatisk ansökan byggs i nästa etapp.</p></section>
    <section className="card"><h2><Search size={19}/> Hitta lediga jobb</h2><div className="inputs"><label>Yrke eller sökord<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Ort<input value={location} onChange={e=>setLocation(e.target.value)}/></label><button disabled={loading} onClick={findJobs}>{loading?'Arbetar...':'Sök jobb'}</button></div><div className="jobs">{jobs.map(j=><button key={j.id} className={`job ${selected?.id===j.id?'active':''}`} onClick={()=>{setSelected(j);setAnalysis(null);setDraft(null)}}><strong>{j.title}</strong><span>{j.company} · {j.location}</span></button>)}</div>{jobs.length>0&&<small>Källa: Arbetsförmedlingen JobSearch. Klicka på ett jobb för att analysera det.</small>}</section>
    {selected&&<section className="card"><h2><BriefcaseBusiness size={19}/> Vald tjänst</h2><h3>{selected.title}</h3><p>{selected.company} · {selected.location}</p><div className="description">{selected.description.slice(0,1800)}{selected.description.length>1800?'…':''}</div><h2><FileSearch size={19}/> CV-matchning</h2><label>Klistra in texten från ditt CV<textarea rows={7} value={cv} onChange={e=>setCv(e.target.value)} placeholder="Ditt verkliga CV-innehåll..."/></label><button disabled={loading||cv.trim().length<30||selected.description.length<20} onClick={analyze}>Analysera CV</button>{analysis&&<div className="result"><strong>Ordöverlappning: {analysis.coverage}%</strong><p>{analysis.note}</p><div><b>Hittade termer:</b> {analysis.matched.join(', ')||'Inga'}</div><div><b>Termer att granska:</b> {analysis.missing.join(', ')||'Inga'}</div></div>}
    <h2><Mail size={19}/> Utkast till rekryterarmejl</h2><p>Skapa ett mejlutkast efter att en ansökan verkligen har skickats. Detta skickar inget.</p><label>Ditt namn<input value={name} onChange={e=>setName(e.target.value)} placeholder="Förnamn Efternamn"/></label><button disabled={loading||name.trim().length<2} onClick={makeDraft}>Skapa mejlutkast</button>{draft&&<div className="result"><strong>{draft.subject}</strong><pre>{draft.body}</pre><small>Status: Inte skickat</small></div>}</section>}
    {error&&<div className="error" role="alert">{error}</div>}
    <footer>AI Job Agent • Steg 1 av utvecklingen • Ingen automatisk ansökan eller mejlsändning ännu</footer></main></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
