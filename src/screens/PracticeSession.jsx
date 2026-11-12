import {Icon} from "../components/icons";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {ExplainPanel} from "../components/Explain";
import {MistakeTagger} from "../components/MistakeTagger";
import {QuestionView} from "../components/QuestionView";
import {BarRow} from "../components/Charts";
import {fmtMinSec} from "../lib/constants";
import {answeredCount, buildPool, createSession, finishSession, loadSession, poolContext, questionByKey, saveSession, summarise} from "../lib/practice";
import {answerText, isAnswerCorrect} from "../lib/scoring";
import {paperTag} from "../lib/papers";

const SUBJECT_COLOR = {Mathematics:"#3f7cc4", Physics:"#e08a2c", Chemistry:"#2e9e5b"};
const MAX_GAP_SEC = 300;   // time away from the tab (more than 5 minutes) is not counted as thinking time

const fmtClock = sec => { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };

// ============================================================================
// Running a session
// ============================================================================
function Runner({initial, onFinished, onExit}){
  const [sess, setSess] = useState(initial);
  const sessRef = useRef(sess); sessRef.current = sess;
  const [now, setNow] = useState(Date.now());
  const [confirmFinish, setConfirmFinish] = useState(false);
  const lastTick = useRef(Date.now());
  const learn = sess.config.mode==="learn";
  const key = sess.keys[sess.pos];
  const info = questionByKey(key);
  const ans = sess.answers[key] || {};
  const checked = !!ans.checked;

  const commit = useCallback(patch => {
    setSess(s => { const n = typeof patch==="function" ? patch(s) : {...s, ...patch}; saveSession(n); return n; });
  }, []);
  // time spent on the question being shown
  const flushTime = useCallback(()=>{
    const t = Date.now(); const gap = Math.min(MAX_GAP_SEC, (t - lastTick.current) / 1000); lastTick.current = t;
    const s = sessRef.current; const k = s.keys[s.pos]; if(!k || (s.answers[k] && s.answers[k].checked)) return;
    commit(cur => ({...cur, answers:{...cur.answers, [k]:{...(cur.answers[k] || {}), secs:((cur.answers[k] || {}).secs || 0) + gap}}}));
  }, [commit]);
  useEffect(()=>{ const id = setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(id); }, []);
  useEffect(()=>{ const id = setInterval(flushTime, 5000); return ()=>clearInterval(id); }, [flushTime]);

  const finishedRef = useRef(false);
  const finish = useCallback(()=>{
    if(finishedRef.current) return;
    finishedRef.current = true;
    flushTime();
    const done = finishSession(sessRef.current);
    onFinished(done);
  }, [flushTime, onFinished]);

  // timer
  const remaining = sess.deadline ? Math.ceil((sess.deadline - now) / 1000) : null;
  useEffect(()=>{ if(remaining!==null && remaining<=0) finish(); }, [remaining, finish]);

  function setResp(v){ commit(s => ({...s, answers:{...s.answers, [key]:{...(s.answers[key] || {}), resp:v}}})); }
  function goto(i){ flushTime(); commit({pos: Math.max(0, Math.min(sess.keys.length - 1, i))}); setConfirmFinish(false); }
  function check(){
    if(String(ans.resp ?? "").trim()==="") return;
    flushTime();
    commit(s => ({...s, answers:{...s.answers, [key]:{...(s.answers[key] || {}), checked:true}}}));
  }
  function next(){
    if(sess.pos >= sess.keys.length - 1){ finish(); return; }
    goto(sess.pos + 1);
  }
  function skip(){ next(); }

  useEffect(()=>{
    function onKey(e){
      if(e.metaKey || e.ctrlKey || e.altKey) return;
      if(e.key==="Enter"){
        e.preventDefault();
        if(learn){ if(checked) next(); else check(); }
        else next();
      }
    }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  });

  if(!info){   // the paper/question is gone from this version: step over it
    return <div className="card" style={{padding:24}}>This question is no longer available. <button className="btn" onClick={next}>Skip</button></div>;
  }
  const {q, paper} = info;
  const ok = checked && isAnswerCorrect(q, ans.resp);
  const answered = answeredCount(sess);
  const unanswered = sess.keys.length - answered;

  return (
    <div style={{maxWidth:820, margin:"0 auto", padding:"20px 20px 60px"}}>
      <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:8, fontSize:13, color:"var(--text-dim)"}}>
        <button className="btn" onClick={onExit} style={{padding:"4px 10px", fontSize:12.5}}><Icon name="arrow-left" size={16}/> Leave (saved)</button>
        <span>Question {sess.pos + 1} of {sess.keys.length} · {learn ? "Learn" : "Test"} mode</span>
        {remaining!==null && <span className="mono" style={{marginLeft:"auto", fontWeight:700, fontSize:15, color: remaining<=60 ? "var(--wrong)" : "var(--text)"}}><Icon name="timer" size={16}/> {fmtClock(remaining)}</span>}
        <button className="btn" style={{marginLeft: remaining!==null ? 0 : "auto", padding:"4px 12px", fontSize:12.5}} onClick={()=>setConfirmFinish(true)}>Finish</button>
      </div>
      <div style={{height:6, background:"var(--border)", borderRadius:3, overflow:"hidden", marginBottom:14}}>
        <div style={{width:`${(sess.pos + (learn && checked ? 1 : 0)) / sess.keys.length * 100}%`, height:"100%", background:"var(--navy)", transition:"width .25s"}}/>
      </div>

      {confirmFinish && (
        <div role="alertdialog" className="card" style={{padding:"14px 18px", marginBottom:14, borderLeft:"4px solid var(--marked)", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
          <span style={{flex:"1 1 240px", fontSize:14}}>Finish now? {unanswered>0 ? `${unanswered} question${unanswered===1 ? " is" : "s are"} unanswered and will count as skipped.` : "Everything is answered."}</span>
          <button className="btn btn-primary" onClick={finish}>Yes, finish</button>
          <button className="btn" onClick={()=>setConfirmFinish(false)}>Keep going</button>
        </div>
      )}

      <div className="card" style={{padding:20, borderLeft:`4px solid ${SUBJECT_COLOR[q.subject] || "var(--navy)"}`}}>
        <div style={{fontSize:12, color:"var(--text-faint)", marginBottom:10}}>
          {q.subject} · {q.chapter} · {q.type==="NUM" ? "Numerical" : "MCQ"}
          {learn && checked ? ` · ${paperTag(paper)} Q${info.n}` : ""}
        </div>
        <QuestionView q={q} resp={ans.resp} onResp={setResp} reveal={learn && checked} disabled={learn && checked} autoFocus/>

        {learn && !checked && (
          <div style={{marginTop:16, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
            <button className="btn btn-primary" disabled={String(ans.resp ?? "").trim()===""} onClick={check}>Check answer</button>
            <button className="btn" onClick={skip}>Skip</button>
            <span style={{fontSize:12, color:"var(--text-faint)"}}>Enter to check · {q.type==="NUM" ? "" : "A–D or 1–4 to choose"}</span>
          </div>
        )}
        {learn && checked && (
          <div role="status" style={{marginTop:16, padding:"12px 14px", borderRadius:8, background: ok ? "rgba(46,158,91,.12)" : "rgba(214,67,63,.10)", border:`1px solid ${ok ? "var(--correct)" : "var(--wrong)"}`}}>
            <div style={{fontWeight:800, color: ok ? "var(--correct)" : "var(--wrong)", marginBottom:4, display:"flex", alignItems:"center", gap:6}}>{ok ? <><Icon name="check-circle" size={18}/> Correct</> : <><Icon name="x-circle" size={18}/> Not quite</>}</div>
            <div style={{fontSize:13.5}}>Correct answer: <strong className="mono">{answerText(q)}</strong></div>
            <div style={{marginTop:12}}><button className="btn btn-primary" onClick={next}>{sess.pos >= sess.keys.length - 1 ? "Finish" : <>Next <Icon name="arrow-right" size={16}/></>}</button> <span style={{fontSize:12, color:"var(--text-faint)", marginLeft:8}}>Enter</span></div>
          </div>
        )}
        {!learn && (
          <div style={{marginTop:16, display:"flex", gap:10, flexWrap:"wrap"}}>
            <button className="btn" disabled={sess.pos===0} onClick={()=>goto(sess.pos - 1)}><Icon name="arrow-left" size={16}/> Previous</button>
            <button className="btn" onClick={()=>setResp("")} disabled={String(ans.resp ?? "")===""}>Clear</button>
            <button className="btn btn-primary" onClick={next}>{sess.pos >= sess.keys.length - 1 ? "Finish" : <>Next <Icon name="arrow-right" size={16}/></>}</button>
          </div>
        )}
      </div>

      {!learn && (
        <div className="card" style={{padding:"14px 16px", marginTop:14}}>
          <div style={{fontSize:12.5, color:"var(--text-dim)", marginBottom:8}}>{answered} answered · {unanswered} left</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
            {sess.keys.map((k, i)=>{
              const a = sess.answers[k]; const has = a && String(a.resp ?? "").trim()!=="";
              return (
                <button key={k} onClick={()=>goto(i)} aria-label={`Question ${i + 1}${has ? ", answered" : ""}`}
                  style={{width:34, height:30, cursor:"pointer", fontFamily:"inherit", fontSize:12.5, fontWeight:700, borderRadius:6,
                    border:`1.5px solid ${i===sess.pos ? "var(--navy)" : "var(--border-dark)"}`, background: has ? "var(--answered)" : "transparent", color: has ? "#fff" : "var(--text)"}}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Results
// ============================================================================
function Results({session, onAgain, onSetup, onOpenMistakes}){
  const rows = session.rows || [];
  const sum = summarise(rows);
  const [tab, setTab] = useState(sum.wrong ? "wrong" : sum.skipped ? "skipped" : "all");
  const shown = rows.filter(r => tab==="all" ? true : tab==="wrong" ? r.result==="wrong" : tab==="skipped" ? r.result==="unattempted" : r.result==="correct");
  const pseudo = {attemptKey:`practice:${session.id}`};
  const tile = (label, value, color) => (
    <div className="card" style={{padding:"14px 16px", textAlign:"center", flex:"1 1 130px"}}>
      <div style={{fontSize:26, fontWeight:800, color: color || "var(--text)"}}>{value}</div>
      <div style={{fontSize:12.5, color:"var(--text-dim)"}}>{label}</div>
    </div>
  );
  const tabs = [["wrong", `Wrong (${sum.wrong})`], ["skipped", `Skipped (${sum.skipped})`], ["correct", `Correct (${sum.correct})`], ["all", `All (${sum.total})`]];
  return (
    <div style={{maxWidth:820, margin:"0 auto", padding:"24px 20px 60px"}}>
      <h2 style={{margin:"0 0 4px"}}>Practice results</h2>
      <p style={{margin:"0 0 16px", color:"var(--text-dim)", fontSize:14}}>{session.config.mode==="learn" ? "Learn mode" : "Test mode"} · {sum.total} questions · {fmtMinSec(sum.secs)} in total</p>
      <div style={{display:"flex", gap:12, flexWrap:"wrap", marginBottom:16}}>
        {tile("correct", `${sum.correct}/${sum.total}`, "var(--correct)")}
        {tile("accuracy", `${sum.accuracy}%`)}
        {tile("JEE-style marks", `${sum.marks}/${sum.maxMarks}`)}
        {tile("avg. time per answer", fmtMinSec(sum.avgSecs))}
      </div>
      {sum.wrong>0 && (
        <div className="card" style={{padding:"12px 16px", marginBottom:16, borderLeft:"4px solid var(--marked)", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", fontSize:14}}>
          <span style={{flex:"1 1 240px"}}><strong>{sum.wrong} wrong answer{sum.wrong===1 ? " was" : "s were"} added to your Mistake Book.</strong> Tag why you missed {sum.wrong===1 ? "it" : "them"} below.</span>
          <button className="btn" onClick={onOpenMistakes}>Open Mistake Book</button>
        </div>
      )}
      <div className="card" style={{padding:"16px 18px", marginBottom:16}}>
        <div style={{fontSize:13, fontWeight:700, color:"var(--text-dim)", marginBottom:12}}>By chapter (weakest first)</div>
        {sum.chapters.slice(0, 8).map(c => <BarRow key={c.subject + c.chapter} label={`${c.chapter} · ${c.subject}`} value={c.cor} max={Math.max(1, c.n)} color={SUBJECT_COLOR[c.subject]} displayValue={`${c.cor}/${c.n}`}/>)}
      </div>
      <div style={{display:"flex", gap:10, flexWrap:"wrap", marginBottom:18}}>
        <button className="btn btn-primary" onClick={onAgain}>Practise again (same filters)</button>
        <button className="btn" onClick={onSetup}>New practice</button>
      </div>

      <div role="tablist" style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:12}}>
        {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab===id} className={tab===id ? "btn btn-primary" : "btn"} onClick={()=>setTab(id)}>{label}</button>)}
      </div>
      {shown.length===0 && <div className="card" style={{padding:24, textAlign:"center", color:"var(--text-dim)"}}>Nothing here.</div>}
      <div style={{display:"flex", flexDirection:"column", gap:14}}>
        {shown.map(r => {
          const info = questionByKey(r.key); if(!info) return null;
          const color = r.result==="correct" ? "var(--correct)" : r.result==="wrong" ? "var(--wrong)" : "var(--unattempted)";
          return (
            <div key={r.key} className="card" style={{padding:18, borderLeft:`4px solid ${color}`}}>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--text-faint)", marginBottom:8, gap:8, flexWrap:"wrap"}}>
                <span>{r.subject} · {r.chapter} · {paperTag(info.paper)} Q{r.n}</span>
                <span>Time: {fmtMinSec(r.secs)}</span>
              </div>
              <QuestionView q={info.q} resp={r.resp} reveal disabled onResp={()=>{}}/>
              <div style={{display:"flex", gap:20, fontSize:13.5, marginTop:12, flexWrap:"wrap"}}>
                <span>Your answer: <strong className="mono">{r.resp ?? "—"}</strong></span>
                <span>Correct answer: <strong className="mono" style={{color:"var(--correct)"}}>{answerText(info.q)}</strong></span>
              </div>
              <ExplainPanel paperId={r.paperId} n={r.n}/>
              {(r.result==="wrong" || r.result==="unattempted") && <MistakeTagger state={pseudo} r={r}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Screen: shows the running session, or its results
// ============================================================================
export function PracticeSession({initial, onExit, onSetup, onOpenMistakes}){
  const [sess, setSess] = useState(()=>initial || loadSession());
  if(!sess) return <div style={{padding:40}}>No practice session. <button className="btn" onClick={onSetup}>Start one</button></div>;
  if(sess.finished){
    return <Results session={sess} onSetup={onSetup} onOpenMistakes={onOpenMistakes}
      onAgain={()=>{
        // same filters, a fresh random set; the pool is rebuilt from the saved config
        const pool = buildPool(sess.config, poolContext());
        if(!pool.length){ onSetup(); return; }
        const fresh = createSession(sess.config, pool); saveSession(fresh); setSess(fresh);
      }}/>;
  }
  return <Runner key={sess.id} initial={sess} onExit={onExit} onFinished={done=>setSess(done)}/>;
}
