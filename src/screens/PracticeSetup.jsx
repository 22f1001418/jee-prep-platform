import {PageHeader} from "../components/ui";
import {Icon, SUBJECT_ICON} from "../components/icons";
import React, {useMemo, useState} from "react";
import {SUBJECTS} from "../lib/constants";
import {fmtShortDate} from "../lib/mistakes";
import {
  COUNT_CHOICES, answeredCount, attemptStats, buildPool, chapterAccuracy, chapterKey, clearSession, createSession, loadConfig, loadSession,
  poolContext, poolSizes, practiceLog, saveConfig, universeFacets,
} from "../lib/practice";

const SUBJECT_COLOR = {Mathematics:"#3f7cc4", Physics:"#e08a2c", Chemistry:"#2e9e5b"};
const POOLS = [
  ["all", "All questions", "Everything in the bank"],
  ["new", "Not attempted yet", "Questions you have never answered in a test or practice"],
  ["mistakes", "My Mistake Book", "Questions you missed and are still learning (does not change the revision schedule)"],
  ["starred", "Starred", "Questions you starred while reviewing"],
];

function Chip({on, onClick, children, color, title}){
  return (
    <button type="button" aria-pressed={on} title={title} onClick={onClick}
      style={{display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, padding:"5px 12px", borderRadius:16,
        border:`1.5px solid ${color || "var(--border-dark)"}`, background: on ? (color || "var(--navy)") : "transparent", color: on ? "#fff" : "var(--text)"}}>
      {children}
    </button>
  );
}
const sectionTitle = {fontSize:13, fontWeight:700, color:"var(--text-dim)", marginBottom:8};
const field = {padding:"7px 10px", fontSize:14, fontFamily:"inherit", border:"1.5px solid var(--border-dark)", borderRadius:6, background:"var(--panel)", color:"var(--text)"};

export function PracticeSetup({onStart, onResume, onOpenResults, onOpenMistakes, initial}){
  const [cfg, setCfg] = useState(()=>({...loadConfig(), ...(initial || {})}));
  const [weakFirst, setWeakFirst] = useState(false);
  const stats = useMemo(()=>attemptStats(), []);
  const ctx = useMemo(()=>poolContext(stats), [stats]);
  const sizes = useMemo(()=>poolSizes(ctx), [ctx]);
  const facets = useMemo(()=>universeFacets(), []);
  const log = useMemo(()=>practiceLog(), []);
  const [session, setSession] = useState(()=>loadSession());
  const pool = useMemo(()=>buildPool(cfg, ctx), [cfg, ctx]);
  const upd = patch => setCfg(c=>({...c, ...patch}));
  const toggle = (field, v) => setCfg(c=>{ const a = c[field] || []; return {...c, [field]: a.includes(v) ? a.filter(x=>x!==v) : [...a, v]}; });
  const count = Math.min(Number(cfg.count) || 0, pool.length);

  const shownSubjects = cfg.subjects.length ? SUBJECTS.filter(s=>cfg.subjects.includes(s)) : SUBJECTS;
  const chapterList = subject => {
    const rows = Object.entries(facets.chapters[subject] || {}).map(([chapter, n])=>({chapter, n, acc:chapterAccuracy(stats, subject, chapter)}));
    return weakFirst
      ? rows.sort((a, b)=>(a.acc ? a.acc.pct : 101) - (b.acc ? b.acc.pct : 101) || a.chapter.localeCompare(b.chapter))
      : rows.sort((a, b)=>a.chapter.localeCompare(b.chapter));
  };

  function start(){
    if(!pool.length) return;
    const c = {...cfg, count: Math.max(1, count)};
    saveConfig(c);
    onStart(createSession(c, pool));
  }
  const unfinished = session && !session.finished ? session : null;
  const lastDone = session && session.finished ? session : null;

  return (
    <div className="page" style={{maxWidth:860}}>
      <PageHeader icon="practice" title="Practice" subtitle={`Build your own set from all ${sizes.all.toLocaleString()} questions: one chapter, only numericals, only things you have not tried.`}/>

      {unfinished && (
        <div className="card" style={{padding:"14px 18px", marginBottom:16, borderLeft:"4px solid var(--answered)", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
          <div style={{flex:"1 1 240px", fontSize:14}}>
            <strong>Practice in progress</strong> · {answeredCount(unfinished)} of {unfinished.keys.length} answered
            <div style={{fontSize:12.5, color:"var(--text-faint)"}}>{unfinished.config.mode==="learn" ? "Learn mode" : "Test mode"}</div>
          </div>
          <button className="btn btn-save" onClick={onResume}>Resume</button>
          <button className="btn" onClick={()=>{ clearSession(); setSession(null); }}>Discard</button>
        </div>
      )}
      {lastDone && (
        <div className="card" style={{padding:"14px 18px", marginBottom:16, borderLeft:"4px solid var(--navy)", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
          <div style={{flex:"1 1 240px", fontSize:14}}>
            <strong>Last session</strong> · {lastDone.rows ? lastDone.rows.filter(r=>r.result==="correct").length : 0} of {lastDone.keys.length} correct
            <div style={{fontSize:12.5, color:"var(--text-faint)"}}>{fmtShortDate(lastDone.finishedAt || lastDone.startedAt)}</div>
          </div>
          <button className="btn" onClick={onOpenResults}>See results</button>
        </div>
      )}

      <div className="card" style={{padding:"18px 20px", marginBottom:16}}>
        <div style={sectionTitle}>Which questions?</div>
        <div role="radiogroup" aria-label="Question pool" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))", gap:8}}>
          {POOLS.map(([id, label, hint])=>{
            const on = cfg.pool===id; const n = sizes[id];
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={()=>upd({pool:id})} title={hint}
                style={{textAlign:"left", cursor:"pointer", fontFamily:"inherit", padding:"10px 12px", borderRadius:8, border:`1.5px solid ${on ? "var(--navy)" : "var(--border-dark)"}`,
                  background: on ? "rgba(63,124,196,.12)" : "transparent", color:"var(--text)"}}>
                <div style={{fontWeight:700, fontSize:14}}>{label}</div>
                <div style={{fontSize:12.5, color:"var(--text-faint)"}}>{n.toLocaleString()} question{n===1 ? "" : "s"}</div>
              </button>
            );
          })}
        </div>
        {cfg.pool==="mistakes" && sizes.mistakes===0 && <div style={{fontSize:13, color:"var(--text-dim)", marginTop:10}}>Nothing in your Mistake Book yet. <button className="btn" style={{padding:"2px 10px", fontSize:12.5}} onClick={onOpenMistakes}>Open it</button></div>}
      </div>

      <div className="card" style={{padding:"18px 20px", marginBottom:16}}>
        <div style={sectionTitle}>Subject</div>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:18}}>
          {SUBJECTS.map(s=><Chip key={s} on={cfg.subjects.includes(s)} color={SUBJECT_COLOR[s]} onClick={()=>toggle("subjects", s)}><Icon name={SUBJECT_ICON[s]} size={15}/> {s}</Chip>)}
          {cfg.subjects.length>0 && <button className="btn" style={{padding:"4px 10px", fontSize:12.5}} onClick={()=>upd({subjects:[]})}>Clear</button>}
        </div>

        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:8}}>
          <div style={{...sectionTitle, marginBottom:0}}>Chapters {cfg.chapters.length>0 && <span style={{fontWeight:400}}>· {cfg.chapters.length} selected</span>}</div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <label style={{fontSize:12.5, color:"var(--text-dim)", display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
              <input type="checkbox" checked={weakFirst} onChange={e=>setWeakFirst(e.target.checked)}/> Weakest first
            </label>
            {cfg.chapters.length>0 && <button className="btn" style={{padding:"4px 10px", fontSize:12.5}} onClick={()=>upd({chapters:[]})}>Clear</button>}
          </div>
        </div>
        <div style={{fontSize:12, color:"var(--text-faint)", marginBottom:10}}>Leave empty for every chapter. The % is your accuracy so far (tests and practice).</div>
        {shownSubjects.map(s=>(
          <div key={s} style={{marginBottom:12}}>
            <div style={{fontSize:12.5, fontWeight:700, color:SUBJECT_COLOR[s], marginBottom:6}}>{s}</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {chapterList(s).map(({chapter, n, acc})=>{
                const k = chapterKey(s, chapter); const on = cfg.chapters.includes(k);
                const dot = acc ? (acc.pct>=75 ? "#2e9e5b" : acc.pct>=50 ? "#d9a441" : "#d6433f") : null;
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={()=>toggle("chapters", k)}
                    title={acc ? `${acc.pct}% correct over ${acc.att} attempt${acc.att===1 ? "" : "s"}` : "Not attempted yet"}
                    style={{cursor:"pointer", fontFamily:"inherit", fontSize:12.5, padding:"4px 10px", borderRadius:14, display:"inline-flex", alignItems:"center", gap:6,
                      border:`1.5px solid ${on ? "var(--navy)" : "var(--border-dark)"}`, background: on ? "var(--navy)" : "transparent", color: on ? "#fff" : "var(--text)"}}>
                    {dot && <span style={{width:8, height:8, borderRadius:"50%", background:dot, flexShrink:0}}/>}
                    {chapter}<span style={{opacity:.65}}>{n}</span>{acc && <span style={{opacity:.8, fontWeight:700}}>{acc.pct}%</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{display:"flex", gap:28, flexWrap:"wrap", marginTop:14}}>
          <div>
            <div style={sectionTitle}>Type</div>
            <div style={{display:"flex", gap:8}}>
              {[["all","Both"],["MCQ","MCQ"],["NUM","Numerical"]].map(([v, l])=><Chip key={v} on={cfg.type===v} onClick={()=>upd({type:v})}>{l}</Chip>)}
            </div>
          </div>
          <div>
            <div style={sectionTitle}>Exam year</div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              {facets.years.map(y=><Chip key={y} on={cfg.years.includes(y)} onClick={()=>toggle("years", y)}>{y}</Chip>)}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{padding:"18px 20px", marginBottom:16}}>
        <div style={{display:"flex", gap:28, flexWrap:"wrap"}}>
          <div>
            <div style={sectionTitle}>How many?</div>
            <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
              {COUNT_CHOICES.map(n=><Chip key={n} on={Number(cfg.count)===n} onClick={()=>upd({count:n})}>{n}</Chip>)}
              <input type="number" min={1} max={200} aria-label="Custom number of questions" value={COUNT_CHOICES.includes(Number(cfg.count)) ? "" : cfg.count} placeholder="Other"
                onChange={e=>upd({count: e.target.value==="" ? 20 : Math.max(1, Math.min(200, Number(e.target.value)))})} style={{...field, width:80}}/>
            </div>
          </div>
          <div>
            <div style={sectionTitle}>Mode</div>
            <div style={{display:"flex", gap:8}}>
              <Chip on={cfg.mode==="learn"} onClick={()=>upd({mode:"learn"})} title="Check each answer straight away and see the correct one">Learn: check as you go</Chip>
              <Chip on={cfg.mode==="test"} onClick={()=>upd({mode:"test"})} title="Answer everything first; see the results at the end">Test: results at the end</Chip>
            </div>
          </div>
          <div>
            <div style={sectionTitle}>Timer</div>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <Chip on={!cfg.timerMin} onClick={()=>upd({timerMin:null})}>None</Chip>
              <Chip on={!!cfg.timerMin} onClick={()=>upd({timerMin: cfg.timerMin || Math.max(5, Math.round(count * 2))})}>Timed</Chip>
              {cfg.timerMin ? <><input type="number" min={1} max={300} aria-label="Minutes" value={cfg.timerMin} onChange={e=>upd({timerMin: Math.max(1, Math.min(300, Number(e.target.value) || 1))})} style={{...field, width:70}}/><span style={{fontSize:13, color:"var(--text-dim)"}}>min</span></> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="card sticky-action" style={{padding:"16px 20px", display:"flex", gap:14, alignItems:"center", flexWrap:"wrap", boxShadow:"0 4px 18px rgba(0,0,0,.12)"}}>
        <div style={{flex:"1 1 220px", fontSize:14}}>
          {pool.length===0
            ? <span style={{color:"var(--wrong)", fontWeight:600}}>No questions match these filters.</span>
            : <><strong>{pool.length.toLocaleString()}</strong> question{pool.length===1 ? "" : "s"} match. You will get <strong>{count}</strong>{cfg.timerMin ? <> in <strong>{cfg.timerMin} min</strong></> : null}.</>}
        </div>
        <button className="btn btn-primary" style={{padding:"11px 28px", fontSize:15}} disabled={pool.length===0} onClick={start}>Start practice</button>
      </div>

      {log.sessions.length>0 && (
        <div style={{marginTop:24}}>
          <div style={sectionTitle}>Recent sessions</div>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {log.sessions.slice(0, 6).map(s=>(
              <div key={s.id} className="card" style={{padding:"10px 14px", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", fontSize:13.5}}>
                <span style={{flex:"1 1 200px"}}>{s.label}<div style={{fontSize:12, color:"var(--text-faint)"}}>{fmtShortDate(s.at)} · {s.mode==="learn" ? "Learn" : "Test"}</div></span>
                <span className="mono" style={{fontWeight:700}}>{s.correct}/{s.n}</span>
                <span style={{color:"var(--text-dim)", width:70, textAlign:"right"}}>{s.correct + s.wrong ? Math.round(s.correct / (s.correct + s.wrong) * 100) : 0}% acc.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
