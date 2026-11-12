import {Icon} from "../components/icons";
import React from "react";
import {DiagramSVG} from "../components/DiagramSVG";
import {ExplainPanel} from "../components/Explain";
import {MistakeTagger} from "../components/MistakeTagger";
import {TeX} from "../components/TeX";
import {exportWrongUnattemptedForAI} from "../lib/aiExport";
import {fmtMinSec} from "../lib/constants";
import {addMistakes, attemptKeyOf, loadMistakes, mistakeKey, useMistakes} from "../lib/mistakes";
import {getPaper} from "../lib/papers";
import {isOptionCorrect} from "../lib/scoring";

// ---------- Wrong / Unattempted / Marked review ----------
export function ReviewSection({state, result, kind, onBack}){
  // Always resolve questions from the paper this attempt was actually
  // taken on (state.paperId), not whatever paper is currently selected.
  const RAW_QUESTIONS = getPaper(state.paperId).questions;
  const list = result.perQuestionResults.filter(r=>{
    if(kind==="wrong") return r.result==="wrong";
    if(kind==="unattempted") return r.result==="unattempted";
    if(kind==="marked") return r.markedForReview;
    return false;
  });
  const reviewList = kind==="notchosen" ? (result.notChosen || []) : list;
  useMistakes();
  const book = loadMistakes(), ak = attemptKeyOf(state);
  const taggable = kind==="wrong" || kind==="unattempted";
  const notInBook = taggable ? reviewList.filter(r=>{ const it = book[mistakeKey(state.paperId, r.n)]; return !(it && it.hits.some(h=>h.a===ak)); }) : [];
  const titles = {wrong:"Wrong Questions", unattempted:"Unattempted Questions", marked:"Marked for Review", notchosen:"Optional Numericals You Did Not Choose (not scored)"};
  return (
    <div style={{minHeight:"100vh", padding:"28px 20px"}}>
      <div style={{maxWidth:820, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:16}}>
          <button className="btn" onClick={onBack} style={{fontFamily:"Arial, Helvetica, sans-serif", fontWeight:400}}><Icon name="arrow-left" size={16}/> Back</button>
          {(kind==="wrong" || kind==="unattempted" || kind==="notchosen") && (
            <button className="btn tip-btn tip-below" onClick={()=>exportWrongUnattemptedForAI(state, result)}
              data-tip="A PDF of your wrong and unattempted questions, with their figures. Upload it to ChatGPT (or any AI) and ask it to solve each one and teach you the concept like a teacher."
              style={{fontFamily:"Arial, Helvetica, sans-serif", fontWeight:400}}>
              Wrong + Unattempted Question List
            </button>
          )}
        </div>
        <h2 style={{marginTop:0}}>{titles[kind]} ({reviewList.length})</h2>
        {taggable && reviewList.length>0 && (
          <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:14, fontSize:13.5, color:"var(--text-dim)"}}>
            <span>Tag why you missed each question. It goes into your Mistake Book and comes back for revision.</span>
            {notInBook.length>0 && <button className="btn btn-primary" onClick={()=>addMistakes(state, notInBook)}>Add all {notInBook.length} to revision queue</button>}
          </div>
        )}
        {reviewList.length===0 && <div className="card" style={{padding:30, textAlign:"center", color:"var(--text-dim)"}}>Nothing here — nice work.</div>}
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {reviewList.map(r=>{
            const q = RAW_QUESTIONS.find(x=>x.n===r.n);  // same-paper lookup, see note above
            return (
              <div key={r.n} className="card" style={{padding:18, borderLeft:`4px solid ${r.result==="wrong"?"var(--wrong)":r.result==="unattempted"?"var(--unattempted)":"var(--marked)"}`}}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--text-faint)", marginBottom:8}}>
                  <span>Q{r.n} · {r.subject} · {r.chapter}</span>
                  <span>Time spent: {fmtMinSec(r.timeSpent)}</span>
                </div>
                <div style={{marginBottom:10, fontSize:15}}><TeX>{q.text}</TeX></div>
                {q.svg && <div style={{marginBottom:10}}><DiagramSVG id={q.svg}/></div>}
                {q.options && (
                  <div style={{display:"grid", gridTemplateColumns:q.options.some(o=>o.text.length>70) ? "1fr" : "1fr 1fr", gap:6, fontSize:13.5, marginBottom:10}}>
                    {q.options.map(o=>{
                      const isCorrect = isOptionCorrect(q, o.id);
                      const isYours = o.id===r.yourAnswer;
                      return (
                        <div key={o.id} style={{
                          color: isCorrect ? "var(--correct)" : (isYours ? "var(--wrong)" : "var(--text-dim)"),
                          fontWeight: isCorrect||isYours ? 700 : 400, minWidth:0, overflowWrap:"break-word", display:"flex", alignItems:"center", columnGap:5, flexWrap:"wrap"
                        }}>
                          <span>({o.id})</span> <span style={{minWidth:0}}><TeX>{o.text}</TeX></span>{isCorrect?<span><Icon name="check" size={14}/> correct</span>:null}{isYours && !isCorrect?<span><Icon name="x" size={14}/> your answer</span>:null}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{display:"flex", gap:20, fontSize:13.5, marginTop:6}}>
                  <span>Your answer: <strong className="mono">{r.yourAnswer ?? "—"}</strong></span>
                  <span>Correct answer: <strong className="mono" style={{color:"var(--correct)"}}>{r.correctAnswer}</strong></span>
                  <span>Marks: <strong className="mono">{r.result==="notchosen" ? "not scored" : (r.marks>0?`+${r.marks}`:r.marks)}</strong></span>
                </div>
                <ExplainPanel paperId={state.paperId} n={r.n}/>
                {taggable && (r.result==="wrong" || r.result==="unattempted") && <MistakeTagger state={state} r={r}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

