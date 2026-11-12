import React, {useMemo, useState} from "react";
import {PAPER_REGISTRY} from "../lib/papers";
import {loadHistory} from "../lib/persistence";

const yearOf = p => { const m = /^jee-(\d{4})-/.exec(p.id); return m ? m[1] : "Other"; };

// Mock Tests: every paper, with how you did on it, and a Start button on each row.
export function Tests({onStartPaper, onResume, hasActive}){
  const [year, setYear] = useState("all");
  const [show, setShow] = useState("all");   // all | todo | done
  const stats = useMemo(()=>{
    const m = new Map();
    loadHistory().forEach(h=>{
      const sn = h && h.snapshot; if(!sn || !sn.paperId) return;
      const e = m.get(sn.paperId) || {n:0, best:null, max:h.maxScore, lastPct:null, lastAt:0};
      e.n++; if(e.best===null || h.score > e.best){ e.best = h.score; e.max = h.maxScore; }
      if((sn.startedAt || 0) >= e.lastAt){ e.lastAt = sn.startedAt || 0; e.lastPct = Math.round(h.accuracy); }
      m.set(sn.paperId, e);
    });
    return m;
  }, []);
  const years = useMemo(()=>[...new Set(PAPER_REGISTRY.map(yearOf))], []);
  const done = PAPER_REGISTRY.filter(p=>stats.has(p.id)).length;
  const groups = years.filter(y=>year==="all" || y===year).map(y=>({
    year:y, papers: PAPER_REGISTRY.filter(p=>yearOf(p)===y && (show==="all" || (show==="done" ? stats.has(p.id) : !stats.has(p.id)))),
  })).filter(g=>g.papers.length);
  const chip = (on, label, onClick) => (
    <button type="button" aria-pressed={on} onClick={onClick}
      style={{cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, padding:"5px 13px", borderRadius:16,
        border:`1.5px solid ${on ? "var(--navy)" : "var(--border-dark)"}`, background: on ? "var(--navy)" : "transparent", color: on ? "#fff" : "var(--text)"}}>{label}</button>
  );
  return (
    <div style={{maxWidth:900, margin:"0 auto", padding:"24px 20px 60px"}}>
      <h2 style={{margin:"0 0 4px"}}>Mock Tests</h2>
      <p style={{margin:"0 0 16px", color:"var(--text-dim)", fontSize:14}}>Full 3-hour papers in the real CBT format. {done} of {PAPER_REGISTRY.length} attempted.</p>

      {hasActive && (
        <div className="card" style={{padding:"14px 18px", marginBottom:16, borderLeft:"4px solid var(--answered)", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
          <span style={{flex:"1 1 240px", fontSize:14}}><strong>You have a test in progress.</strong></span>
          <button className="btn btn-save" onClick={onResume}>Resume test</button>
        </div>
      )}

      <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:8}}>
        {chip(year==="all", "All years", ()=>setYear("all"))}
        {years.map(y=><React.Fragment key={y}>{chip(year===y, y, ()=>setYear(y))}</React.Fragment>)}
      </div>
      <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:18}}>
        {chip(show==="all", "Everything", ()=>setShow("all"))}
        {chip(show==="todo", "Not attempted", ()=>setShow("todo"))}
        {chip(show==="done", "Attempted", ()=>setShow("done"))}
      </div>

      {groups.length===0 && <div className="card" style={{padding:28, textAlign:"center", color:"var(--text-dim)"}}>No papers match.</div>}
      {groups.map(g=>(
        <div key={g.year} style={{marginBottom:22}}>
          <div style={{fontSize:13, fontWeight:800, letterSpacing:".06em", color:"var(--text-faint)", marginBottom:8}}>JEE MAIN {g.year}</div>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {g.papers.map(p=>{
              const s = stats.get(p.id);
              return (
                <div key={p.id} className="card" style={{padding:"12px 16px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 220px", minWidth:0}}>
                    <div style={{fontWeight:700, fontSize:14.5}}>{p.shortName || p.name}</div>
                    <div style={{fontSize:12.5, color:"var(--text-faint)", marginTop:2}}>
                      {p.questions.length} questions · {Math.round(p.questions.length * 4)} marks
                    </div>
                  </div>
                  {s ? (
                    <div style={{textAlign:"right", fontSize:12.5, color:"var(--text-dim)"}}>
                      <div>Best <strong className="mono" style={{color:"var(--text)"}}>{s.best}/{s.max}</strong></div>
                      <div>{s.n} attempt{s.n===1 ? "" : "s"} · last {s.lastPct}% accuracy</div>
                    </div>
                  ) : <span style={{fontSize:12.5, color:"var(--text-faint)"}}>Not attempted</span>}
                  <button className={s ? "btn" : "btn btn-primary"} onClick={()=>onStartPaper(p.id)}>{s ? "Retake" : "Start"}</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
