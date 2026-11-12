import {dueCount} from "../lib/mistakes";
import React, {useEffect, useMemo, useState} from "react";
import {ThemeToggle} from "../components/ThemeToggle";
import {PAPER_REGISTRY} from "../lib/papers";
import {loadHistory} from "../lib/persistence";

// ---------- JEE countdown (landing screen, top-left) ----------
// Next 22 January (local time) strictly after "now"; rolls to the following year automatically once it passes.
export function getNextExamDate(nowMs){
  let y = new Date(nowMs).getFullYear();
  let d = new Date(y, 0, 22, 0, 0, 0);
  if(d.getTime() <= nowMs) d = new Date(y + 1, 0, 22, 0, 0, 0);
  return d;
}
export function ExamCountdown(){
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{
    const id = setInterval(()=>setNow(Date.now()), 1000);
    return ()=>clearInterval(id);
  }, []);
  const examDate = getNextExamDate(now);
  const examYear = examDate.getFullYear();
  const diff = Math.max(0, Math.floor((examDate.getTime() - now)/1000));
  const d = Math.floor(diff/86400), h = Math.floor((diff%86400)/3600), m = Math.floor((diff%3600)/60), sec = diff%60;
  const p2 = n => String(n).padStart(2,"0");
  const units = [
    {v:String(d), l:"Days"},
    {v:p2(h), l:"Hours"},
    {v:p2(m), l:"Min"},
    {v:p2(sec), l:"Sec", accent:true},
  ];
  return (
    <React.Fragment>
      <style>{`
        .jee-cd{position:absolute; top:16px; left:16px; z-index:5; padding:12px 14px 14px; border-radius:14px;
          background:linear-gradient(145deg, color-mix(in srgb,var(--navy) 9%, var(--panel)), var(--panel));
          border:1px solid color-mix(in srgb,var(--navy) 22%, var(--border));
          box-shadow:0 4px 16px rgba(15,42,74,.10);}
        .jee-cd-head{display:flex; align-items:center; gap:7px; margin-bottom:9px;}
        .jee-cd-dot{width:7px; height:7px; border-radius:50%; background:var(--gold); box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 25%, transparent);}
        .jee-cd-title{font-size:11px; font-weight:800; letter-spacing:.08em; color:var(--navy); text-transform:uppercase;}
        .jee-cd-date{font-size:11px; color:var(--text-dim); margin-left:auto; font-weight:600;}
        .jee-cd-row{display:flex; gap:6px;}
        .jee-cd-box{min-width:48px; padding:7px 6px 6px; border-radius:9px; text-align:center;
          background:color-mix(in srgb,var(--navy) 10%, var(--panel)); border:1px solid color-mix(in srgb,var(--navy) 14%, var(--border));}
        .jee-cd-box.acc{background:color-mix(in srgb,var(--gold) 16%, var(--panel)); border-color:color-mix(in srgb,var(--gold) 40%, var(--border));}
        .jee-cd-num{font-size:20px; font-weight:800; line-height:1.1; color:var(--text); font-variant-numeric:tabular-nums;}
        .jee-cd-lbl{font-size:9.5px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--text-dim); margin-top:3px;}
        @media (max-width: 860px){
          .jee-cd{position:static; align-self:center; margin:0 0 24px;}
        }
      `}</style>
      <div className="jee-cd" title={"Time left until 22 January " + examYear}>
        <div className="jee-cd-head">
          <span className="jee-cd-dot"/>
          <span className="jee-cd-title">JEE Main {examYear}</span>
          <span className="jee-cd-date">22 Jan {examYear}</span>
        </div>
        <div className="jee-cd-row">
          {units.map(u=>(
            <div key={u.l} className={"jee-cd-box"+(u.accent?" acc":"")}>
              <div className="jee-cd-num">{u.v}</div>
              <div className="jee-cd-lbl">{u.l}</div>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

// ---------- Landing screen ----------
export function Landing({onDemoStart, onResume, hasActive, onViewHistory, onViewAllNotes, onViewMistakes, onViewPractice, selectedPaperId, onChoosePaper}){
  const due = useMemo(()=>dueCount(), []);
  // Paper list shows exactly 9 rows; anything beyond that scrolls.
  const paperListRef = React.useRef(null);
  React.useEffect(()=>{
    const fit = ()=>{
      const el = paperListRef.current; if(!el) return;
      const kids = el.children;
      if(kids.length <= 9){ el.style.maxHeight = ""; return; }
      el.style.maxHeight = (kids[8].getBoundingClientRect().bottom - el.getBoundingClientRect().top + el.scrollTop) + "px";
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("load", fit);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    return ()=>{ window.removeEventListener("resize", fit); window.removeEventListener("load", fit); };
  }, [PAPER_REGISTRY.length]);
  // Papers with at least one attempt in Test History get a small blue dot
  // next to their name in the picker, so it's visible at a glance which
  // exams have already been taken before starting a new one.
  const attemptedPaperIds = useMemo(()=>{
    const ids = new Set();
    loadHistory().forEach(h=>{ if(h.snapshot && h.snapshot.paperId) ids.add(h.snapshot.paperId); });
    return ids;
  }, []);
  return (
    <div style={{minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", position:"relative"}}>
      <ThemeToggle/>
      <ExamCountdown/>
      <div style={{maxWidth:640, width:"100%"}}>
        <div style={{textAlign:"center", marginBottom:40}}>
          <div style={{fontSize:13, fontWeight:700, letterSpacing:"0.04em", color:"var(--navy)", marginBottom:10}}>COMPUTER BASED TEST PLATFORM</div>
          <h1 style={{fontSize:34, fontWeight:800, margin:"0 0 10px", color:"var(--text)"}}>JEE CBT Test Platform</h1>
          <p style={{fontSize:16, color:"var(--text-dim)", margin:0}}>Pick a paper and take a full, timed, scored mock test</p>
        </div>

        <div className="card" style={{padding:"18px 20px", marginBottom:22}}>
          <div style={{fontSize:13, fontWeight:700, marginBottom:12, color:"var(--text-dim)"}}>Choose a paper to practice</div>
          <div ref={paperListRef} className="paper-list" onMouseEnter={()=>paperListRef.current && paperListRef.current.classList.add("sb-on")} onMouseLeave={()=>paperListRef.current && paperListRef.current.classList.remove("sb-on")} style={{display:"flex", flexDirection:"column", gap:10, overflowY:"auto", paddingRight:8}}>
            {PAPER_REGISTRY.map((p,i)=>{
              // thin line where the exam year changes (list is newest first)
              const yr = m=>{ const x = /^jee-(\d{4})-/.exec(m.id); return x ? x[1] : ""; };
              const newYear = i>0 && yr(p)!==yr(PAPER_REGISTRY[i-1]);
              return (
              <label key={p.id} style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, ...(newYear ? {borderTop:"1px solid var(--border-dark)", paddingTop:10} : null)}}>
                <input type="radio" name="paper" checked={selectedPaperId===p.id} onChange={()=>onChoosePaper(p.id)} />
                {p.name}
                {attemptedPaperIds.has(p.id) && (
                  <span title="You've attempted this exam before" style={{
                    width:7, height:7, borderRadius:"50%", background:"var(--navy)", flexShrink:0, marginLeft:"auto"
                  }}/>
                )}
              </label>
              );
            })}
          </div>
        </div>

        <div style={{display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginBottom:8}}>
          <button className="btn btn-primary" onClick={onDemoStart}>Start Mock Test</button>
          {hasActive && <button className="btn btn-save" onClick={onResume}>Resume In-Progress Test</button>}
          <button className="btn" onClick={onViewHistory}>View Test History</button>
          <button className="btn" onClick={onViewPractice}>Practice</button>
          <button className="btn" onClick={onViewAllNotes}>All Notes</button>
          <button className="btn" onClick={onViewMistakes} style={due>0 ? {borderColor:"var(--wrong)"} : null}>
            Mistake Book{due>0 && <span style={{marginLeft:8, background:"var(--wrong)", color:"#fff", borderRadius:10, padding:"1px 8px", fontSize:12, fontWeight:700}}>{due} due</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

