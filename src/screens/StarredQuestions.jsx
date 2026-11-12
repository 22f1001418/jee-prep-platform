import React, {useState} from "react";
import {DiagramSVG} from "../components/DiagramSVG";
import {TeX} from "../components/TeX";
import {PAPER_REGISTRY} from "../lib/papers";
import {answerText, isOptionCorrect} from "../lib/scoring";
import {SubjectChapterTree, buildSubjChapterTree, orderSubjects} from "./AllNotes";
import {loadStarQ, starQKey, toggleStarQ} from "./ProfileScreen";

export function StarredQuestionsScreen({onBack}){
  const [items] = useState(()=>loadStarQ()); // snapshot at open, so an un-starred card stays until you leave (easy undo)
  const [keys, setKeys] = useState(()=>new Set(loadStarQ().map(x=>starQKey(x.paperId, x.n))));
  const [revealed, setRevealed] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [chap, setChap] = useState(null);   // Filter menu: Subject -> Chapter ({subject, chapter|null}) or null for everything
  function flip(it){
    const next = toggleStarQ(it.paperId, it.n);
    setKeys(new Set(next.map(x=>starQKey(x.paperId, x.n))));
  }
  const groups = PAPER_REGISTRY.map(pp=>({
    paper: pp,
    qs: items.filter(x=>x.paperId===pp.id).map(x=>({it:x, q:pp.questions.find(q=>q.n===x.n)})).filter(x=>x.q).sort((a,b)=>a.q.n-b.q.n),
  })).filter(g=>g.qs.length>0);
  // Subject -> Chapter filter: the menu counts every question on this page; the list and the heading follow the choice.
  const tree = buildSubjChapterTree(groups.flatMap(g=>g.qs.map(x=>x.q)));
  const subjOrder = orderSubjects(tree);
  const inChap = q => !chap || (q.subject===chap.subject && (chap.chapter==null || q.chapter===chap.chapter));
  const shownGroups = !chap ? groups : groups.map(g=>({...g, qs:g.qs.filter(x=>inChap(x.q))})).filter(g=>g.qs.length>0);
  const shownCount = !chap ? keys.size : shownGroups.reduce((n,g)=>n+g.qs.filter(x=>keys.has(starQKey(x.it.paperId, x.it.n))).length, 0);
  return (
    <div style={{minHeight:"100vh", padding:"28px 20px"}}>
      <div style={{maxWidth:820, margin:"0 auto"}}>
        <button className="btn" onClick={onBack} style={{marginBottom:16}}>← Back</button>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap"}}>
          <h2 style={{margin:"0 0 16px"}}>Starred Questions ({shownCount})</h2>
          <div style={{position:"relative", marginBottom:16}}>
            <button className="btn" onClick={()=>setFilterOpen(o=>!o)} aria-haspopup="true" aria-expanded={filterOpen}>
              Filter ▾
            </button>
            {filterOpen && (
              <React.Fragment>
                <div onClick={()=>setFilterOpen(false)} style={{position:"fixed", inset:0, zIndex:20}}/>
                <div className="card" style={{position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:21, width:300, padding:8, boxShadow:"0 8px 24px rgba(0,0,0,0.18)"}}>
                  <div style={{fontSize:11.5, fontWeight:700, letterSpacing:.4, color:"var(--text-faint)", textTransform:"uppercase", padding:"6px 10px"}}>Show questions</div>
                  <button className={"btn"+(!chap ? " hist-sel" : "")} onClick={()=>{ setChap(null); setFilterOpen(false); }}
                    style={{display:"block", width:"100%", textAlign:"left", border:"none", background: !chap ? undefined : "transparent", padding:"10px", fontWeight:400}}>
                    All starred questions
                  </button>
                  <div style={{borderTop:"1px solid var(--border)", margin:"8px 0 6px"}}/>
                  <SubjectChapterTree tree={tree} subjOrder={subjOrder} chap={chap} noun="question" onChoose={c=>{ setChap(c); setFilterOpen(false); }}/>
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
        <p style={{fontSize:13.5, color:"var(--text-dim)", marginTop:-6, marginBottom:20}}>
          Questions you starred while solving, from every paper you've opened.
        </p>
        {chap && (
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:16, flexWrap:"wrap", fontSize:13}}>
            <span style={{color:"var(--text-dim)"}}>Showing:</span>
            <span style={{background:"var(--steel)", color:"#fff", borderRadius:14, padding:"3px 6px 3px 12px", display:"inline-flex", alignItems:"center", gap:6, fontWeight:600}}>
              {chap.subject}{chap.chapter ? " \u2192 " + chap.chapter : ""}
              <button onClick={()=>setChap(null)} aria-label="Clear subject and chapter filter" title="Clear this filter"
                style={{background:"rgba(255,255,255,0.22)", border:"none", color:"#fff", borderRadius:"50%", width:20, height:20, lineHeight:"18px", padding:0, cursor:"pointer", fontSize:13}}>{"\u00D7"}</button>
            </span>
          </div>
        )}
        {groups.length===0 && (
          <div className="card" style={{padding:30, textAlign:"center", color:"var(--text-dim)"}}>
            No starred questions yet. While solving a test, tap "☆ Star" next to the question number.
          </div>
        )}
        <div style={{display:"flex", flexDirection:"column", gap:22}}>
          {shownGroups.map(g=>(
            <div key={g.paper.id}>
              <div style={{fontWeight:700, fontSize:15, marginBottom:10}}>{g.paper.name}</div>
              <div style={{display:"flex", flexDirection:"column", gap:14}}>
                {g.qs.map(({it,q})=>{
                  const k = starQKey(it.paperId, it.n);
                  const on = keys.has(k);
                  const show = !!revealed[k];
                  return (
                    <div key={k} className="card" style={{padding:"14px 18px"}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, fontSize:12.5, color:"var(--text-faint)", marginBottom:10}}>
                        <span><strong style={{color:"var(--text)"}}>Q{q.n}</strong> · {q.subject} · {q.chapter}</span>
                        <button onClick={()=>flip(it)} aria-pressed={on} aria-label={on ? "Remove star" : "Star this question"} title={on ? "Remove star" : "Star this question"}
                          style={{background:"none", border:"none", padding:0, fontSize:20, lineHeight:1, cursor:"pointer", color: on ? "#f5c518" : "var(--text-faint)"}}>
                          {on ? "★" : "☆"}
                        </button>
                      </div>
                      <div style={{marginBottom:10, fontSize:15}}><TeX>{q.text}</TeX></div>
                      {q.svg && <div style={{marginBottom:10}}><DiagramSVG id={q.svg}/></div>}
                      {q.options && (
                        <div style={{display:"grid", gridTemplateColumns:q.options.some(o=>o.text.length>70) ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))", gap:6, fontSize:13.5, marginBottom:10}}>
                          {q.options.map(o=>{
                            const isCorrect = show && isOptionCorrect(q, o.id);
                            return (
                              <div key={o.id} style={{color: isCorrect ? "var(--correct)" : "var(--text-dim)", fontWeight: isCorrect ? 700 : 400, minWidth:0, overflowWrap:"break-word", display:"flex", alignItems:"center", columnGap:5, flexWrap:"wrap"}}>
                                <span>({o.id})</span> <span style={{minWidth:0}}><TeX>{o.text}</TeX></span>{isCorrect ? <span>(correct)</span> : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <button className="btn" style={{padding:"4px 12px", fontSize:12.5}} onClick={()=>setRevealed(r=>({...r, [k]: !r[k]}))}>
                        {show ? "Hide answer" : "Show answer"}
                      </button>
                      {show && q.type==="NUM" && (
                        <span style={{marginLeft:12, fontSize:13.5}}>Correct answer: <strong className="mono" style={{color:"var(--correct)"}}>{answerText(q)}</strong></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Shown if full screen is left while the exam is running (e.g. long-press Esc, or F11 on a browser that does not allow locking it).
// The exam is covered until full screen is back; the timer keeps running, like a real exam.
