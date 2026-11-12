import React, {useEffect, useMemo, useState} from "react";
import {CauseChips, RuleInput} from "../components/MistakeTagger";
import {BarRow} from "../components/Charts";
import {DiagramSVG} from "../components/DiagramSVG";
import {QuestionView} from "../components/QuestionView";
import {TeX} from "../components/TeX";
import {SUBJECTS} from "../lib/constants";
import {
  CAUSES, CAUSE_BY_ID, INTERVAL_DAYS, attemptRows, bookSummary, causeCounts, dueItems, dueLabel, fmtShortDate, latestCause, latestHit,
  loadMistakes, recordReview, removeMistakes, setCause, setRule, setStatus, upcomingByDay, upcomingItems, useMistakes,
} from "../lib/mistakes";
import {getPaper, paperMissing} from "../lib/papers";
import {loadHistory} from "../lib/persistence";
import {answerText, isAnswerCorrect, isOptionCorrect} from "../lib/scoring";

const SESSION_CAP = 25;
const SUBJECT_COLOR = {Mathematics:"#3f7cc4", Physics:"#e08a2c", Chemistry:"#2e9e5b"};

function questionOf(it){
  if(paperMissing(it.paperId)) return null;
  return getPaper(it.paperId).questions.find(q=>q.n===it.n) || null;
}
const usable = it => !!it && !!questionOf(it);

// ============================================================================
// Revision session: one question at a time, graded automatically against the answer key
// ============================================================================
function Session({keys, onDone}){
  const [queue, setQueue] = useState(keys);
  const [pos, setPos] = useState(0);
  const [resp, setResp] = useState("");
  const [fb, setFb] = useState(null);                 // {ok, info, retry}
  const [retried, setRetried] = useState(()=>new Set());
  const [outcomes, setOutcomes] = useState([]);       // first-attempt result per question: {key, ok}
  const finished = pos >= queue.length;
  const all = loadMistakes();
  const it = finished ? null : all[queue[pos]];
  const q = it ? questionOf(it) : null;

  function submit(){
    if(!it || !q || fb) return;
    if(resp==="" || String(resp).trim()==="") return;
    const ok = isAnswerCorrect(q, resp);
    const retry = retried.has(it.key);
    let info = null;
    if(!retry){
      info = recordReview(it.key, ok);
      setOutcomes(o=>[...o, {key:it.key, ok}]);
      if(!ok){ setRetried(s=>new Set(s).add(it.key)); setQueue(qq=>[...qq, it.key]); }   // one more go at the end of this session
    }
    setFb({ok, info, retry});
  }
  function next(){ setFb(null); setResp(""); setPos(p=>p+1); }

  useEffect(()=>{
    function onKey(e){
      if(e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || "";
      const typing = tag==="INPUT" || tag==="TEXTAREA";
      if(fb){ if(e.key==="Enter" || (!typing && e.key==="ArrowRight")){ e.preventDefault(); next(); } return; }
      if(!q) return;
      if(e.key==="Enter"){ e.preventDefault(); submit(); return; }
    }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  });

  if(finished){
    const ok = outcomes.filter(o=>o.ok).length, bad = outcomes.length - ok;
    const sum = bookSummary();
    return (
      <div className="card" style={{padding:28, textAlign:"center"}}>
        <h2 style={{marginTop:0}}>Session complete</h2>
        <div style={{display:"flex", justifyContent:"center", gap:28, margin:"14px 0 18px"}}>
          <div><div style={{fontSize:30, fontWeight:800, color:"var(--correct)"}}>{ok}</div><div style={{fontSize:12.5, color:"var(--text-dim)"}}>remembered</div></div>
          <div><div style={{fontSize:30, fontWeight:800, color:"var(--wrong)"}}>{bad}</div><div style={{fontSize:12.5, color:"var(--text-dim)"}}>missed again</div></div>
        </div>
        <div style={{fontSize:13.5, color:"var(--text-dim)", marginBottom:18}}>
          {sum.due>0 ? `${sum.due} more question${sum.due===1 ? " is" : "s are"} still due.` : "Nothing else is due right now."}
          {sum.nextDue ? ` Next review: ${fmtShortDate(sum.nextDue)}.` : ""}
        </div>
        <button className="btn btn-primary" onClick={onDone}>Back to Mistake Book</button>
      </div>
    );
  }
  if(!it || !q){   // the paper or question is gone from this version: skip it
    return <div className="card" style={{padding:24}}>This question is no longer available. <button className="btn" onClick={next}>Skip</button></div>;
  }

  const paper = getPaper(it.paperId);
  const isNum = q.type==="NUM" || !q.options;
  const cause = latestCause(it);
  const done = pos + (fb ? 1 : 0);
  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, fontSize:13, color:"var(--text-dim)"}}>
        <span>Question {Math.min(pos + 1, queue.length)} of {queue.length}{retried.has(it.key) && fb===null && outcomes.some(o=>o.key===it.key) ? " · second try" : ""}</span>
        <button className="btn" onClick={onDone} style={{padding:"4px 10px", fontSize:12.5}}>End session</button>
      </div>
      <div style={{height:6, background:"var(--border)", borderRadius:3, overflow:"hidden", marginBottom:14}}>
        <div style={{width:`${done/queue.length*100}%`, height:"100%", background:"var(--navy)", transition:"width .25s"}}/>
      </div>
      <div className="card" style={{padding:20, borderLeft:`4px solid ${SUBJECT_COLOR[it.subject] || "var(--navy)"}`}}>
        <div style={{fontSize:12, color:"var(--text-faint)", marginBottom:10}}>
          {it.subject} · {it.chapter} · {paper.shortName || paper.name} · Q{it.n}{it.lapses>0 ? ` · slipped ${it.lapses}×` : ""}
        </div>
        <QuestionView q={q} resp={resp} onResp={setResp} reveal={!!fb} disabled={!!fb} autoFocus/>

        {!fb && (
          <div style={{marginTop:16, display:"flex", alignItems:"center", gap:12}}>
            <button className="btn btn-primary" disabled={String(resp).trim()===""} onClick={submit}>Check answer</button>
            <span style={{fontSize:12, color:"var(--text-faint)"}}>Enter to check{!isNum ? " · A–D or 1–4 to choose" : ""}</span>
          </div>
        )}

        {fb && (
          <div role="status" style={{marginTop:16, padding:"12px 14px", borderRadius:8, background: fb.ok ? "rgba(46,158,91,.12)" : "rgba(214,67,63,.10)", border:`1px solid ${fb.ok ? "var(--correct)" : "var(--wrong)"}`}}>
            <div style={{fontWeight:800, color: fb.ok ? "var(--correct)" : "var(--wrong)", marginBottom:4}}>{fb.ok ? "✓ Correct" : "✗ Not quite"}</div>
            <div style={{fontSize:13.5}}>Correct answer: <strong className="mono">{answerText(q)}</strong></div>
            {fb.info && (
              <div style={{fontSize:13, color:"var(--text-dim)", marginTop:4}}>
                {fb.info.mastered ? "Mastered. It leaves your queue (it stays in the log)."
                  : (fb.ok && fb.info.early) ? `Practised early, so the schedule is unchanged (next review in ${fb.info.nextDays} day${fb.info.nextDays===1 ? "" : "s"}).`
                  : fb.ok ? `Next review in ${fb.info.nextDays} day${fb.info.nextDays===1 ? "" : "s"}.`
                  : "Back to the start of the ladder: review again tomorrow. You will also see it once more at the end of this session."}
              </div>
            )}
            {fb.retry && <div style={{fontSize:13, color:"var(--text-dim)", marginTop:4}}>Second try: it does not change the schedule.</div>}
            {(cause || it.rule) && (
              <div style={{fontSize:13, marginTop:8}}>
                {cause && <span style={{fontWeight:700, color:CAUSE_BY_ID[cause].color}}>{CAUSE_BY_ID[cause].label}. </span>}
                {it.rule && <span>Your rule: <em>{it.rule}</em></span>}
              </div>
            )}
            <div style={{marginTop:12}}><button className="btn btn-primary" onClick={next}>{pos + 1 >= queue.length ? "Finish" : "Next →"}</button> <span style={{fontSize:12, color:"var(--text-faint)", marginLeft:8}}>Enter</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Revise tab
// ============================================================================
function ReviseTab({onStart}){
  const sum = bookSummary();
  const due = dueItems().filter(usable);
  const days = upcomingByDay(7);
  const tile = (label, value, color) => (
    <div className="card" style={{padding:"14px 16px", textAlign:"center", flex:"1 1 120px"}}>
      <div style={{fontSize:28, fontWeight:800, color: color || "var(--text)"}}>{value}</div>
      <div style={{fontSize:12.5, color:"var(--text-dim)"}}>{label}</div>
    </div>
  );
  const dayLabel = i => { const d = new Date(Date.now() + (i + 1) * 86400000); return i===0 ? "Tomorrow" : d.toLocaleDateString(undefined, {weekday:"short"}); };
  const maxDay = Math.max(1, ...days);
  const soonest = upcomingItems().filter(usable).slice(0, 10).map(i=>i.key);
  return (
    <div>
      <div style={{display:"flex", gap:12, flexWrap:"wrap", marginBottom:16}}>
        {tile("due today", sum.due, sum.due>0 ? "var(--wrong)" : "var(--correct)")}
        {tile("coming this week", sum.week)}
        {tile("still learning", sum.active)}
        {tile("mastered", sum.mastered, "var(--correct)")}
      </div>
      <div className="card" style={{padding:20, marginBottom:16, textAlign:"center"}}>
        {due.length>0 ? (
          <>
            <div style={{fontSize:15, marginBottom:12}}>You have <strong>{due.length}</strong> question{due.length===1 ? "" : "s"} to revise{due.length>SESSION_CAP ? ` (${SESSION_CAP} per session, oldest first)` : ""}.</div>
            <button className="btn btn-primary" style={{padding:"11px 26px", fontSize:15}} onClick={()=>onStart(due.slice(0, SESSION_CAP).map(i=>i.key))}>Start revision</button>
          </>
        ) : sum.total===0 ? (
          <div style={{color:"var(--text-dim)", fontSize:14, lineHeight:1.55}}>
            Your Mistake Book is empty. Every wrong answer from a finished test is added automatically.<br/>
            Take a test, then open <strong>Review Wrong Questions</strong> and tag why you missed each one.
          </div>
        ) : (
          <>
            <div style={{fontSize:15, marginBottom:6}}>Nothing is due. 🎉</div>
            <div style={{fontSize:13, color:"var(--text-dim)", marginBottom:12}}>{sum.nextDue ? `Next review: ${fmtShortDate(sum.nextDue)}.` : "Everything here is mastered."}</div>
            {soonest.length>0 && <button className="btn" onClick={()=>onStart(soonest)}>Practise the next {soonest.length} anyway</button>}
          </>
        )}
      </div>
      {sum.active>0 && (
        <div className="card" style={{padding:"16px 18px"}}>
          <div style={{fontSize:13, fontWeight:700, color:"var(--text-dim)", marginBottom:10}}>Coming up</div>
          <div style={{display:"flex", gap:8, alignItems:"flex-end", height:90}}>
            {days.map((n, i)=>(
              <div key={i} style={{flex:1, textAlign:"center", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:"100%"}}>
                <div style={{fontSize:12, fontWeight:700, marginBottom:3}}>{n || ""}</div>
                <div style={{height: n ? Math.max(6, n/maxDay*52) : 3, background: n ? "var(--navy)" : "var(--border)", borderRadius:3}}/>
                <div style={{fontSize:11, color:"var(--text-faint)", marginTop:4}}>{dayLabel(i)}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12, color:"var(--text-faint)", marginTop:10}}>
            Each question comes back after {INTERVAL_DAYS.join(", ")} days as long as you keep getting it right. Get it wrong and it starts again from tomorrow.
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Log tab
// ============================================================================
function MistakeRow({it, onPractise}){
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const q = questionOf(it);
  const paper = paperMissing(it.paperId) ? null : getPaper(it.paperId);
  const hit = latestHit(it); const cause = hit ? hit.cause : null;
  return (
    <div className="card" style={{padding:"12px 14px", borderLeft:`4px solid ${SUBJECT_COLOR[it.subject] || "var(--navy)"}`}}>
      <div onClick={()=>setOpen(o=>!o)} role="button" tabIndex={0} aria-expanded={open}
        onKeyDown={e=>{ if(e.key==="Enter" || e.key===" "){ e.preventDefault(); setOpen(o=>!o); } }}
        style={{display:"flex", gap:10, alignItems:"center", cursor:"pointer", flexWrap:"wrap"}}>
        <div style={{flex:"1 1 260px", minWidth:0}}>
          <div style={{fontWeight:700, fontSize:14}}>{it.chapter} <span style={{fontWeight:400, color:"var(--text-faint)"}}>· {it.subject} · Q{it.n} · {paper ? (paper.shortName || paper.name) : it.paperId}</span></div>
          <div style={{fontSize:12, color:"var(--text-faint)", marginTop:2}}>
            Missed {it.misses}×{it.lapses>0 ? ` · slipped in revision ${it.lapses}×` : ""} · {it.type==="NUM" ? "Numerical" : "MCQ"}
          </div>
        </div>
        {cause ? <span style={{fontSize:12, fontWeight:700, padding:"3px 9px", borderRadius:12, background:CAUSE_BY_ID[cause].color, color:"#fff"}}>{CAUSE_BY_ID[cause].short}</span>
               : <span style={{fontSize:12, color:"var(--wrong)", fontWeight:600}}>needs a tag</span>}
        <span style={{fontSize:12.5, fontWeight:600, color: it.status==="mastered" ? "var(--correct)" : (it.due<=Date.now() ? "var(--wrong)" : "var(--text-dim)"), whiteSpace:"nowrap"}}>{dueLabel(it)}</span>
        <span aria-hidden="true" style={{color:"var(--text-faint)"}}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{marginTop:12, paddingTop:12, borderTop:"1px dashed var(--border-dark)"}}>
          {q ? (
            <>
              <div style={{fontSize:14.5, marginBottom:10}}><TeX>{q.text}</TeX></div>
              {q.svg && <div style={{marginBottom:10}}><DiagramSVG id={q.svg}/></div>}
              {q.options && (
                <div style={{display:"grid", gridTemplateColumns:q.options.some(o=>o.text.length>70) ? "1fr" : "1fr 1fr", gap:6, fontSize:13.5, marginBottom:10}}>
                  {q.options.map(o=>(
                    <div key={o.id} style={{color: isOptionCorrect(q, o.id) ? "var(--correct)" : "var(--text-dim)", fontWeight: isOptionCorrect(q, o.id) ? 700 : 400, minWidth:0, overflowWrap:"anywhere"}}>
                      ({o.id}) <TeX>{o.text}</TeX>{isOptionCorrect(q, o.id) ? " ✓" : ""}
                    </div>
                  ))}
                </div>
              )}
              <div style={{fontSize:13.5, marginBottom:12}}>Correct answer: <strong className="mono" style={{color:"var(--correct)"}}>{answerText(q)}</strong></div>
            </>
          ) : <div style={{fontSize:13, color:"var(--text-dim)", marginBottom:10}}>This question's paper is not available in this version.</div>}
          <div style={{fontSize:12.5, fontWeight:700, color:"var(--text-dim)", marginBottom:6}}>Why did you miss it?</div>
          <CauseChips value={cause} onChange={c=>setCause(it.key, hit && hit.a, c)}/>
          <div style={{marginTop:8}}><RuleInput value={it.rule} onSave={t=>setRule(it.key, t)}/></div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", marginTop:12, alignItems:"center"}}>
            {q && <button className="btn" onClick={()=>onPractise(it.key)}>Practise this now</button>}
            {it.status==="mastered"
              ? <button className="btn" onClick={()=>setStatus(it.key, "active")}>Put back in the queue</button>
              : <button className="btn" onClick={()=>setStatus(it.key, "mastered")}>Mark as mastered</button>}
            {confirmDel ? (
              <span style={{display:"inline-flex", gap:8, alignItems:"center", fontSize:13}}>
                Remove from the Mistake Book?
                <button className="btn btn-danger" onClick={()=>removeMistakes([it.key])}>Yes, remove</button>
                <button className="btn" onClick={()=>setConfirmDel(false)}>Cancel</button>
              </span>
            ) : <button className="btn" style={{color:"var(--not-answered)"}} onClick={()=>setConfirmDel(true)}>Remove</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function LogTab({onPractise}){
  const [subject, setSubject] = useState("all");
  const [cause, setCauseF] = useState("all");
  const [status, setStatusF] = useState("active");
  const [text, setText] = useState("");
  const all = Object.values(loadMistakes());
  const t = text.trim().toLowerCase();
  const list = all.filter(it=>{
    if(subject!=="all" && it.subject!==subject) return false;
    if(status!=="all" && it.status!==status) return false;
    const c = latestCause(it);
    if(cause==="untagged" ? !!c : (cause!=="all" && c!==cause)) return false;
    if(t){
      const paper = paperMissing(it.paperId) ? null : getPaper(it.paperId);
      const hay = `${it.chapter} ${it.subject} ${paper ? paper.name : it.paperId} ${it.rule || ""}`.toLowerCase();
      if(!hay.includes(t)) return false;
    }
    return true;
  }).sort((a, b)=>{ const ha = latestHit(a), hb = latestHit(b); return (hb ? hb.at : 0) - (ha ? ha.at : 0) || a.n - b.n; });
  const sel = {padding:"6px 8px", fontSize:13, fontFamily:"inherit", border:"1px solid var(--border-dark)", borderRadius:6, background:"var(--panel)", color:"var(--text)"};
  if(all.length===0) return <div className="card" style={{padding:30, textAlign:"center", color:"var(--text-dim)"}}>No mistakes logged yet.</div>;
  return (
    <div>
      <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:12}}>
        <select aria-label="Subject" style={sel} value={subject} onChange={e=>setSubject(e.target.value)}>
          <option value="all">All subjects</option>{SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Cause" style={sel} value={cause} onChange={e=>setCauseF(e.target.value)}>
          <option value="all">Any cause</option><option value="untagged">Needs a tag</option>{CAUSES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select aria-label="Status" style={sel} value={status} onChange={e=>setStatusF(e.target.value)}>
          <option value="active">Still learning</option><option value="mastered">Mastered</option><option value="all">All</option>
        </select>
        <input type="search" placeholder="Search chapter, paper or rule" value={text} onChange={e=>setText(e.target.value)} aria-label="Search" style={{...sel, flex:"1 1 180px", minWidth:160}}/>
      </div>
      <div style={{fontSize:12.5, color:"var(--text-faint)", marginBottom:8}}>{list.length} of {all.length}</div>
      {list.length===0 && <div className="card" style={{padding:24, textAlign:"center", color:"var(--text-dim)"}}>Nothing matches these filters.</div>}
      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {list.slice(0, 200).map(it=><MistakeRow key={it.key} it={it} onPractise={onPractise}/>)}
      </div>
      {list.length>200 && <div style={{fontSize:12.5, color:"var(--text-faint)", marginTop:10}}>Showing the 200 most recent. Use the filters to narrow down.</div>}
    </div>
  );
}

// ============================================================================
// Insights tab
// ============================================================================
function InsightsTab({onGoLog}){
  const items = Object.values(loadMistakes());
  const history = useMemo(()=>loadHistory(), []);
  if(items.length===0) return <div className="card" style={{padding:30, textAlign:"center", color:"var(--text-dim)"}}>Insights appear once you have logged some mistakes.</div>;
  const counts = causeCounts(items);
  const tagged = CAUSES.reduce((s, c)=>s + counts[c.id], 0);
  const totalHits = tagged + counts.untagged;
  const maxCause = Math.max(1, ...CAUSES.map(c=>counts[c.id]));
  const careless = counts.calc + counts.misread;
  const active = items.filter(i=>i.status==="active");
  const bySubject = SUBJECTS.map(s=>({s, n:active.filter(i=>i.subject===s).length}));
  const maxSubj = Math.max(1, ...bySubject.map(x=>x.n));
  const chMap = new Map();
  active.forEach(i=>{ const k = `${i.subject}|${i.chapter}`; chMap.set(k, (chMap.get(k) || 0) + 1); });
  const chapters = [...chMap.entries()].map(([k, n])=>({subject:k.split("|")[0], chapter:k.split("|").slice(1).join("|"), n})).sort((a, b)=>b.n - a.n).slice(0, 8);
  const maxCh = Math.max(1, ...chapters.map(c=>c.n));
  const rows = attemptRows(items).slice(0, 8);
  const nameOf = a => { if(a.startsWith("practice:")) return "Practice session"; const e = history.find(h=>h.snapshot && `${h.snapshot.paperId}:${h.snapshot.startedAt}`===a); return e ? e.testName : a.split(":")[0]; };
  const reviews = items.flatMap(i=>i.log).sort((a, b)=>b.at - a.at).slice(0, 50);
  const retention = reviews.length ? Math.round(reviews.filter(r=>r.ok).length / reviews.length * 100) : null;
  const card = {padding:"16px 18px", marginBottom:16};
  const head = {fontSize:13, fontWeight:700, color:"var(--text-dim)", marginBottom:12};
  return (
    <div>
      <div className="card" style={card}>
        <div style={head}>Why you miss questions</div>
        {CAUSES.map(c=><BarRow key={c.id} label={c.label} value={counts[c.id]} max={maxCause} color={c.color} displayValue={counts[c.id]}/>)}
        {counts.untagged>0 && (
          <div style={{fontSize:13, color:"var(--wrong)", marginTop:4}}>
            {counts.untagged} of {totalHits} misses have no cause yet. <button className="btn" style={{padding:"3px 10px", fontSize:12.5}} onClick={onGoLog}>Tag them</button>
          </div>
        )}
        {tagged>=5 && (
          <div style={{fontSize:13, color:"var(--text-dim)", marginTop:8}}>
            {Math.round(careless/tagged*100)}% of your tagged misses are calculation or misreading slips, i.e. marks you already knew how to earn.
          </div>
        )}
      </div>
      <div className="card" style={card}>
        <div style={head}>Still learning, by subject</div>
        {bySubject.map(x=><BarRow key={x.s} label={x.s} value={x.n} max={maxSubj} color={SUBJECT_COLOR[x.s]} displayValue={x.n}/>)}
      </div>
      <div className="card" style={card}>
        <div style={head}>Weakest chapters (questions still in the queue)</div>
        {chapters.length===0 ? <div style={{fontSize:13, color:"var(--text-dim)"}}>Nothing active.</div>
          : chapters.map(c=><BarRow key={c.subject + c.chapter} label={`${c.chapter} · ${c.subject}`} value={c.n} max={maxCh} color={SUBJECT_COLOR[c.subject]} displayValue={c.n}/>)}
      </div>
      <div className="card" style={card}>
        <div style={head}>Test by test</div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse", width:"100%", fontSize:13}}>
            <thead><tr style={{textAlign:"left", color:"var(--text-faint)", fontSize:12}}>
              <th style={{padding:"4px 8px 6px 0"}}>Test</th><th style={{padding:"4px 8px"}}>Logged</th><th style={{padding:"4px 8px"}}>Tagged</th><th style={{padding:"4px 0 6px 8px"}}>Most common cause</th>
            </tr></thead>
            <tbody>
              {rows.map(r=>{
                const top = Object.entries(r.causes).sort((a, b)=>b[1] - a[1])[0];
                return (
                  <tr key={r.a} style={{borderTop:"1px solid var(--border)"}}>
                    <td style={{padding:"7px 8px 7px 0"}}>{nameOf(r.a)}<div style={{fontSize:11.5, color:"var(--text-faint)"}}>{fmtShortDate(r.at)}</div></td>
                    <td className="mono" style={{padding:"7px 8px"}}>{r.total}</td>
                    <td className="mono" style={{padding:"7px 8px"}}>{r.total - r.untagged}/{r.total}</td>
                    <td style={{padding:"7px 0 7px 8px"}}>{top ? CAUSE_BY_ID[top[0]].label : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{fontSize:12, color:"var(--text-faint)", marginTop:8}}>Watch the "Most common cause" column change over your tests: that is the habit you are fixing.</div>
      </div>
      <div className="card" style={card}>
        <div style={head}>Revision so far</div>
        <div style={{fontSize:14}}>
          {reviews.length===0 ? "No revision sessions yet." : <>You remembered <strong>{retention}%</strong> of your last {reviews.length} revision answers.</>}
          {" "}{items.filter(i=>i.status==="mastered").length} question{items.filter(i=>i.status==="mastered").length===1 ? "" : "s"} mastered.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Screen
// ============================================================================
export function MistakeBook({onBack, initialTab}){
  useMistakes();
  const [tab, setTab] = useState(initialTab || "revise");
  const [session, setSession] = useState(null);   // array of keys while a session runs
  const sum = bookSummary();
  const tabs = [["revise", `Revise${sum.due>0 ? ` (${sum.due})` : ""}`], ["log", `All mistakes (${sum.total})`], ["insights", "Insights"]];
  function practise(keys){
    const all = loadMistakes();
    const ok = keys.filter(k=>usable(all[k]));
    if(ok.length) setSession(ok);
  }
  return (
    <div style={{minHeight:"100vh", padding:"28px 20px"}}>
      <div style={{maxWidth:820, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:14}}>
          <button className="btn" onClick={session ? ()=>setSession(null) : onBack}>← Back</button>
          <h2 style={{margin:0}}>Mistake Book</h2>
        </div>
        {session ? <Session keys={session} onDone={()=>setSession(null)}/> : (
          <>
            <div role="tablist" style={{display:"flex", gap:6, marginBottom:16, flexWrap:"wrap"}}>
              {tabs.map(([id, label])=>(
                <button key={id} role="tab" aria-selected={tab===id} className={tab===id ? "btn btn-primary" : "btn"} onClick={()=>setTab(id)}>{label}</button>
              ))}
            </div>
            {tab==="revise" && <ReviseTab onStart={practise}/>}
            {tab==="log" && <LogTab onPractise={k=>practise([k])}/>}
            {tab==="insights" && <InsightsTab onGoLog={()=>setTab("log")}/>}
          </>
        )}
      </div>
    </div>
  );
}
