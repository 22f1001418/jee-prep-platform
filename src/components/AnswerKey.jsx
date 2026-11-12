import {Icon} from "./icons";
import React, {useEffect, useRef, useState} from "react";
import {DiagramSVG} from "./DiagramSVG";
import {TeX} from "./TeX";
import {SUBJECTS} from "../lib/constants";
import {KEY_ORIG, getPaper, resetKeyOverrides, setKeyOverride} from "../lib/papers";
import {acceptedAnswers, answerText, isOptionCorrect, scoreExam} from "../lib/scoring";
import {cleanNumInput} from "../screens/ProfileScreen";

// ---------- Answer Key tab (analysis page): every answer in one go + fix a wrong key ----------
// Small "i" icon; hovering (or tapping / keyboard-focusing) it shows how to use the Answer Key tab.
export function KeyHelp(){
  return (
    <React.Fragment>
      <style>{`
        .keyhelp{position:relative; display:inline-flex; outline:none; cursor:help;}
        .keyhelp-i{width:18px; height:18px; border-radius:50%; background:var(--navy); color:#fff; font-size:12px; font-weight:800; font-style:italic; font-family:Georgia,serif; display:inline-flex; align-items:center; justify-content:center; transition:transform .12s;}
        .keyhelp:hover .keyhelp-i,.keyhelp:focus .keyhelp-i{transform:scale(1.12);}
        .keyhelp-pop{position:absolute; left:-6px; top:100%; padding-top:10px; z-index:40; width:min(400px, 82vw); opacity:0; visibility:hidden; transform:translateY(-4px); transition:opacity .14s, transform .14s, visibility .14s; font-weight:400;}
        .keyhelp:hover .keyhelp-pop,.keyhelp:focus .keyhelp-pop,.keyhelp:focus-within .keyhelp-pop{opacity:1; visibility:visible; transform:none;}
        .keyhelp-card{background:var(--panel); color:var(--text); border:1px solid var(--border-dark); border-radius:8px; padding:12px 14px; box-shadow:0 8px 24px rgba(15,42,74,.18); font-size:12.5px; line-height:1.55;}
        .keyhelp-card b.t{display:block; font-size:13px; margin-bottom:6px;}
        .keyhelp-card ul{margin:0; padding-left:18px;}
        .keyhelp-card li{margin:3px 0;}
      `}</style>
      <span className="keyhelp" tabIndex={0} aria-label="How to use the answer key">
        <span className="keyhelp-i">i</span>
        <span className="keyhelp-pop" role="tooltip">
          <span className="keyhelp-card" style={{display:"block"}}>
            <b className="t">How to use the Answer Key</b>
            <ul>
              <li>Wrong key? Click a question, tick the right answer and press <b>Save &amp; re-score</b>.</li>
              <li>Every saved attempt of this paper is re-scored (+4 / −1 / 0) with your corrected key.</li>
              <li>Tick two options if both should count, or choose <b>full marks to everyone</b> for a dropped question.</li>
              <li><span style={{color:"var(--marked)"}}><Icon name="pencil" size={13}/></span> marks a question you corrected; <b>Restore original key</b> undoes it. Corrections are saved in this browser.</li>
              <li>Box colour: <b style={{color:"var(--correct)"}}>green</b> you were right, <b style={{color:"var(--wrong)"}}>red</b> you were wrong, grey not attempted.</li>
            </ul>
          </span>
        </span>
      </span>
    </React.Fragment>
  );
}

export function KeyEditor({q, onSave, onReset, onCancel}){
  const isNum = q.type==="NUM";
  const [sel, setSel] = useState(()=> isNum ? [] : acceptedAnswers(q));
  // Normally exactly ONE option is correct (radio buttons). "Accept more than one" is an explicit opt-in for the rare
  // case where the exam accepted several options; it starts on only if this key already accepts several.
  const [multi, setMulti] = useState(()=> !isNum && acceptedAnswers(q).length>1);
  const [num, setNum] = useState(()=> isNum ? String(q.answer) : "");
  const [bonus, setBonus] = useState(q.bonus===true);
  const [err, setErr] = useState("");
  const toggle = id => {
    setErr("");
    if(!multi){ setSel([id]); return; }                       // single choice: picking an option replaces the previous pick
    setSel(s=> s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  };
  const switchMulti = on => {
    setMulti(on); setErr("");
    if(!on) setSel(s=>{ const first = q.options.map(o=>o.id).find(id=>s.includes(id)); return first ? [first] : []; });   // back to one answer
  };
  function save(){
    if(bonus){ onSave({bonus:true}); return; }
    if(isNum){
      const t = cleanNumInput(num);
      if(t===null){ setErr("Enter a valid number."); return; }
      onSave({answer:String(parseFloat(t))}); return;
    }
    if(sel.length===0){ setErr("Select the correct option."); return; }
    const ordered = q.options.map(o=>o.id).filter(id=>sel.includes(id));
    if(!multi && ordered.length>1) ordered.length = 1;
    onSave({answer:ordered[0], alt:ordered.slice(1)});
  }
  return (
    <div className="card" style={{padding:"14px 16px", margin:"10px 0", borderColor:"var(--navy)"}}>
      <div style={{fontSize:12.5, color:"var(--text-faint)", marginBottom:8}}>
        <strong style={{color:"var(--text)"}}>Q{q.n}</strong> · {q.subject} · {q.chapter} · <strong>Fix answer key</strong>
      </div>
      <div style={{marginBottom:10, fontSize:15}}><TeX>{q.text}</TeX></div>
      {q.svg && <div style={{marginBottom:10}}><DiagramSVG id={q.svg}/></div>}
      {!isNum ? (
        <div style={{display:"flex", flexDirection:"column", gap:6, marginBottom:10, opacity: bonus ? 0.5 : 1}}>
          {q.options.map(o=>(
            <label key={o.id} style={{display:"flex", alignItems:"center", gap:8, fontSize:14, cursor:"pointer"}}>
              <input type={multi ? "checkbox" : "radio"} name={"keyopt-"+q.n} checked={sel.includes(o.id)} disabled={bonus} onChange={()=>toggle(o.id)}/>
              <span>({o.id})</span> <span style={{minWidth:0}}><TeX>{o.text}</TeX></span>
            </label>
          ))}
          <label style={{display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"var(--text-dim)", cursor:"pointer", marginTop:2}}>
            <input type="checkbox" checked={multi} disabled={bonus} onChange={e=>switchMulti(e.target.checked)}/>
            Accept more than one option as correct (rare: only if the exam accepted several)
          </label>
        </div>
      ) : (
        <div style={{marginBottom:10, opacity: bonus ? 0.5 : 1}}>
          <div style={{fontSize:12.5, color:"var(--text-dim)", marginBottom:4}}>Correct numerical answer (your typed answer is rounded to the nearest whole number before comparing):</div>
          <input type="text" inputMode="decimal" value={num} disabled={bonus}
            onChange={e=>{ const v = e.target.value; if(v==="" || /^-?\d*\.?\d*$/.test(v)){ setNum(v); setErr(""); } }}
            style={{width:200, fontSize:15, fontWeight:700}}/>
        </div>
      )}
      <label style={{display:"flex", alignItems:"center", gap:8, fontSize:13.5, marginBottom:10, cursor:"pointer"}}>
        <input type="checkbox" checked={bonus} onChange={e=>{ setBonus(e.target.checked); setErr(""); }}/>
        Question is wrong or dropped: give full marks (+4) to everyone
      </label>
      {err && <div style={{color:"var(--wrong)", fontSize:13, marginBottom:8}}>{err}</div>}
      <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
        <button className="btn btn-primary" style={{padding:"6px 16px", fontSize:13}} onClick={save}>Save &amp; re-score</button>
        {q.keyEdited && <button className="btn" style={{padding:"6px 14px", fontSize:13}} onClick={onReset}>Restore original key</button>}
        <button className="btn" style={{padding:"6px 14px", fontSize:13}} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function keyLabel(q){
  if(q.bonus===true) return "Bonus";
  if(q.type==="NUM") return String(q.answer);
  return acceptedAnswers(q).join("/");
}

export function AnswerKeyPanel({state, result, onChanged}){
  const paper = getPaper(state.paperId);
  const [view, setView] = useState("grid");   // grid = number + answer only, list = with questions
  const [showText, setShowText] = useState(false);
  const [openN, setOpenN] = useState(null);
  const [msg, setMsg] = useState("");
  const edRef = useRef(null);
  useEffect(()=>{ if(openN!==null && edRef.current && edRef.current.scrollIntoView) edRef.current.scrollIntoView({block:"nearest", behavior:"smooth"}); }, [openN]);

  const byN = {};
  result.perQuestionResults.forEach(r=>{ byN[r.n] = r; });
  (result.notChosen||[]).forEach(r=>{ byN[r.n] = r; });
  const editedCount = paper.questions.filter(q=>q.keyEdited).length;
  const colorOf = r => !r ? "var(--border-dark)" : r.result==="correct" ? "var(--correct)" : r.result==="wrong" ? "var(--wrong)" : "var(--border-dark)";

  function sameAsOriginal(q, entry){
    const o = KEY_ORIG.get(q);
    if(!o || entry.bonus || o.bonus===true || o.range) return false;
    return String(entry.answer)===String(o.answer)
      && JSON.stringify((entry.alt||[]).map(String))===JSON.stringify((o.altAnswers||[]).map(String));
  }
  function finish(q, ok, before){
    if(!ok){ window.alert("Your browser storage is full, so the corrected key could not be saved. Delete old notes or attempts and try again."); return; }
    const after = scoreExam(state).totalScore;
    onChanged();
    setOpenN(null);
    setMsg(`Q${q.n} key ${q.keyEdited ? "updated" : "restored to the original"}. Marks re-calculated for every saved attempt of this paper. This attempt: ${before} became ${after} out of ${result.maxScore}.`);
  }
  function save(q, entry){
    const before = result.totalScore;
    finish(q, setKeyOverride(paper.id, q.n, sameAsOriginal(q, entry) ? null : entry), before);
  }
  function restore(q){
    const before = result.totalScore;
    finish(q, setKeyOverride(paper.id, q.n, null), before);
  }
  function restoreAll(){
    if(!window.confirm(`Restore the original answer key for all ${editedCount} corrected question${editedCount!==1?"s":""} in this paper? Every attempt of this paper will be re-scored.`)) return;
    const before = result.totalScore;
    if(!resetKeyOverrides(paper.id)){ window.alert("Could not save (browser storage is full)."); return; }
    onChanged(); setOpenN(null);
    setMsg(`Original key restored. This attempt: ${before} became ${scoreExam(state).totalScore} out of ${result.maxScore}.`);
  }
  const editor = q => (
    <div ref={openN===q.n ? edRef : null}>
      <KeyEditor key={q.n} q={q} onSave={entry=>save(q, entry)} onReset={()=>restore(q)} onCancel={()=>setOpenN(null)}/>
    </div>
  );
  const openQ = openN!==null ? paper.questions.find(q=>q.n===openN) : null;

  return (
    <div>
      <div className="card" style={{padding:"14px 16px", marginBottom:14}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10}}>
          <div>
            <div style={{fontWeight:700, fontSize:15, display:"flex", alignItems:"center", gap:8}}>Answer key: {paper.name}<KeyHelp/></div>
            <div style={{fontSize:13, color:"var(--text-dim)", marginTop:2}}>
              Score for this attempt: <strong className="mono">{result.totalScore} / {result.maxScore}</strong>
              {" · "}{editedCount===0 ? "no corrections made" : <>{`${editedCount} question${editedCount!==1?"s":""} corrected by you`} <Icon name="pencil" size={13}/></>}
            </div>
          </div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            {[["grid","Answers only"],["list","With questions"]].map(([k,l])=>(
              <button key={k} className="btn" onClick={()=>setView(k)}
                style={{fontSize:13, padding:"6px 12px", background: view===k?"var(--navy)":"var(--panel)", color: view===k?"#fff":"var(--text)", borderColor: view===k?"var(--navy)":"var(--border-dark)"}}>{l}</button>
            ))}
            {editedCount>0 && <button className="btn" style={{fontSize:13, padding:"6px 12px"}} onClick={restoreAll}>Restore original key</button>}
          </div>
        </div>
        {msg && <div style={{marginTop:10, fontSize:13.5, fontWeight:600, color:"var(--correct)"}}>{msg}</div>}
      </div>

      {view==="grid" && openQ && editor(openQ)}

      {view==="grid" && (
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          <label style={{display:"flex", alignItems:"center", gap:8, fontSize:13, cursor:"pointer"}}>
            <input type="checkbox" checked={showText} onChange={e=>setShowText(e.target.checked)}/> Also show the text of the correct option
          </label>
          {SUBJECTS.map(s=>(
            <div key={s}>
              <div style={{fontWeight:700, fontSize:14, marginBottom:8}}>{s}</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(" + (showText ? 190 : 104) + "px, 1fr))", gap:8}}>
                {paper.questions.filter(q=>q.subject===s).map(q=>{
                  const r = byN[q.n];
                  const opt = showText && q.type!=="NUM" && q.bonus!==true ? q.options.find(o=>o.id===q.answer) : null;
                  return (
                    <button key={q.n} onClick={()=>setOpenN(openN===q.n ? null : q.n)} title={`Q${q.n}: click to view or fix the key`}
                      style={{textAlign:"left", cursor:"pointer", background: openN===q.n ? "color-mix(in srgb, var(--navy) 12%, var(--panel))" : "var(--panel)", color:"var(--text)",
                        border:"1px solid var(--border)", borderLeft:`5px solid ${colorOf(r)}`, borderRadius:6, padding:"7px 10px", minWidth:0}}>
                      <div style={{display:"flex", justifyContent:"space-between", fontSize:11.5, color:"var(--text-faint)"}}>
                        <span>Q{q.n}</span>{q.keyEdited && <span title="You corrected this key" style={{color:"var(--marked)"}}><Icon name="pencil" size={13}/></span>}
                      </div>
                      <div className="mono" style={{fontSize:17, fontWeight:800, lineHeight:1.25, overflowWrap:"anywhere"}}>{keyLabel(q)}</div>
                      {opt && <div style={{fontSize:12, color:"var(--text-dim)", marginTop:2, overflowWrap:"anywhere"}}><TeX>{opt.text}</TeX></div>}
                      <div style={{fontSize:11, color:"var(--text-faint)", marginTop:2}}>you: {r && r.yourAnswer!==null && r.yourAnswer!==undefined && r.result!=="unattempted" ? r.yourAnswer : "—"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {view==="list" && (
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          {paper.questions.map(q=>{
            const r = byN[q.n];
            return (
              <div key={q.n}>
                <div className="card" style={{padding:"12px 16px", borderLeft:`5px solid ${colorOf(r)}`}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, fontSize:12.5, color:"var(--text-faint)", marginBottom:8}}>
                    <span><strong style={{color:"var(--text)"}}>Q{q.n}</strong> · {q.subject} · {q.chapter}{q.keyEdited && <span style={{color:"var(--marked)", marginLeft:6}}><Icon name="pencil" size={13}/> corrected by you</span>}</span>
                    <button className="btn" style={{padding:"3px 12px", fontSize:12.5}} onClick={()=>setOpenN(openN===q.n ? null : q.n)}>{openN===q.n ? "Close" : "Fix key"}</button>
                  </div>
                  <div style={{marginBottom:8, fontSize:14.5}}><TeX>{q.text}</TeX></div>
                  {q.svg && <div style={{marginBottom:8}}><DiagramSVG id={q.svg}/></div>}
                  {q.options && (
                    <div style={{display:"grid", gridTemplateColumns:q.options.some(o=>o.text.length>70) ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))", gap:6, fontSize:13.5, marginBottom:8}}>
                      {q.options.map(o=>{
                        const ok = q.bonus===true || isOptionCorrect(q, o.id);
                        const yours = r && r.yourAnswer===o.id && r.result!=="unattempted";
                        return (
                          <div key={o.id} style={{color: ok ? "var(--correct)" : (yours ? "var(--wrong)" : "var(--text-dim)"), fontWeight: ok||yours ? 700 : 400, minWidth:0, overflowWrap:"break-word", display:"flex", alignItems:"center", columnGap:5, flexWrap:"wrap"}}>
                            <span>({o.id})</span> <span style={{minWidth:0}}><TeX>{o.text}</TeX></span>{ok ? <span><Icon name="check" size={14}/></span> : null}{yours && !ok ? <span>(your answer)</span> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{fontSize:13.5}}>Answer: <strong className="mono" style={{color:"var(--correct)"}}>{answerText(q)}</strong>
                    <span style={{marginLeft:16}}>You: <strong className="mono">{r && r.result!=="unattempted" ? (r.yourAnswer ?? "—") : "—"}</strong></span></div>
                </div>
                {openN===q.n && editor(q)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

