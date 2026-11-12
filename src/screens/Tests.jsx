import React, {useMemo, useState} from "react";
import {Icon} from "../components/icons";
import {PageHeader} from "../components/ui";
import {PAPER_REGISTRY, scoredCounts} from "../lib/papers";
import {loadHistory} from "../lib/persistence";

const yearOf = p => { const m = /^jee-(\d{4})-/.exec(p.id); return m ? m[1] : "Other"; };

function Filter({on, children, onClick}){
  return <button type="button" aria-pressed={on} className={"chip" + (on ? " chip-on" : "")} style={{cursor:"pointer", fontFamily:"inherit"}} onClick={onClick}>{children}</button>;
}

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
  const groups = years.filter(y=>year==="all" || y===year).map(y=>{
    const all = PAPER_REGISTRY.filter(p=>yearOf(p)===y);
    return {year:y, total:all.length, attempted:all.filter(p=>stats.has(p.id)).length,
      papers: all.filter(p=>show==="all" || (show==="done" ? stats.has(p.id) : !stats.has(p.id)))};
  }).filter(g=>g.papers.length);
  const pct = Math.round(done / PAPER_REGISTRY.length * 100);

  return (
    <div className="page" style={{maxWidth:920}}>
      <PageHeader icon="tests" title="Mock Tests" subtitle="Full 3-hour papers in the real CBT format, scored the NTA way."/>

      <div className="card" style={{padding:"16px 20px", marginBottom:16, display:"flex", alignItems:"center", gap:18, flexWrap:"wrap"}}>
        <div style={{flex:"1 1 240px"}}>
          <div style={{display:"flex", justifyContent:"space-between", fontSize:13.5, marginBottom:7}}>
            <strong>{done} of {PAPER_REGISTRY.length} papers attempted</strong><span className="num" style={{color:"var(--text-dim)"}}>{pct}%</span>
          </div>
          <div style={{height:8, background:"var(--border)", borderRadius:5, overflow:"hidden"}}><div style={{width:`${Math.max(pct, done ? 2 : 0)}%`, height:"100%", borderRadius:5, background:"linear-gradient(90deg, var(--brand), var(--brand-2))", transition:"width .8s var(--ease)"}}/></div>
        </div>
        {hasActive && <button className="btn btn-save" onClick={onResume}><Icon name="play" size={16}/> Resume test in progress</button>}
      </div>

      <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:10}}>
        <Filter on={year==="all"} onClick={()=>setYear("all")}>All years</Filter>
        {years.map(y=><Filter key={y} on={year===y} onClick={()=>setYear(y)}>{y}</Filter>)}
        <span style={{width:1, background:"var(--border)", margin:"2px 6px"}}/>
        <Filter on={show==="all"} onClick={()=>setShow("all")}>Everything</Filter>
        <Filter on={show==="todo"} onClick={()=>setShow("todo")}>Not attempted</Filter>
        <Filter on={show==="done"} onClick={()=>setShow("done")}>Attempted</Filter>
      </div>

      {groups.length===0 && <div className="card empty"><span className="icon-tile"><Icon name="search" size={22}/></span><h3>No papers match</h3><p>Try a different filter.</p></div>}
      {groups.map(g=>(
        <div key={g.year} style={{marginTop:22}}>
          <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:10}}>
            <h3 style={{margin:0, fontSize:17}}>JEE Main {g.year}</h3>
            <span style={{fontSize:12.5, color:"var(--text-faint)"}}>{g.attempted} of {g.total} attempted</span>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            {g.papers.map(p=>{
              const s = stats.get(p.id);
              return (
                <div key={p.id} className="card card-hover" style={{padding:"13px 16px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap"}}>
                  <span className="icon-tile sm" style={s ? {background:"color-mix(in srgb, var(--correct) 13%, var(--panel))", color:"var(--correct)", borderColor:"color-mix(in srgb, var(--correct) 25%, var(--border))"} : null}>
                    <Icon name={s ? "check-circle" : "tests"} size={18}/>
                  </span>
                  <div style={{flex:"1 1 200px", minWidth:0}}>
                    <div style={{fontWeight:700, fontSize:14.5}}>{p.shortName || p.name}</div>
                    <div style={{fontSize:12.5, color:"var(--text-faint)", marginTop:1}}>{(()=>{ const sc = scoredCounts(p).total; return sc!==p.questions.length ? `${p.questions.length} questions (answer ${sc}) · ${sc * 4} marks` : `${sc} questions · ${sc * 4} marks`; })()}</div>
                  </div>
                  {s ? (
                    <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
                      <span className="chip chip-soft num" title="Best score">Best {s.best}/{s.max}</span>
                      <span className="chip" title="Accuracy on the last attempt">{s.lastPct}% accuracy</span>
                      <span className="chip" title="Attempts">{s.n}x</span>
                    </div>
                  ) : <span className="chip">New</span>}
                  <button className={s ? "btn" : "btn btn-primary"} onClick={()=>onStartPaper(p.id)}>{s ? <><Icon name="refresh" size={15}/> Retake</> : <><Icon name="play" size={15}/> Start</>}</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
