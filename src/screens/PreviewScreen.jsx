import {Icon} from "../components/icons";
import React, {useMemo, useState} from "react";
import {DiagramSVG} from "../components/DiagramSVG";
import {TeX} from "../components/TeX";
import {SUBJECTS} from "../lib/constants";
import {numAttemptLimit, usePaper} from "../lib/papers";
import {answerText, isOptionCorrect} from "../lib/scoring";

// ---------- Preview / preprocessing review screen ----------
export function PreviewScreen({onStart, onBack}){
  const paper = usePaper();
  const RAW_QUESTIONS = paper.questions;
  const counts = useMemo(()=>{
    const c = {Mathematics:0, Physics:0, Chemistry:0};
    RAW_QUESTIONS.forEach(q=>c[q.subject]++);
    return c;
  },[RAW_QUESTIONS]);
  const [showReview, setShowReview] = useState(false);

  if(showReview){
    return <ReviewQuestions onBack={()=>setShowReview(false)} onStart={onStart}/>;
  }

  return (
    <div style={{minHeight:"100vh", padding:"50px 20px", display:"flex", justifyContent:"center"}}>
      <div style={{maxWidth:640, width:"100%"}}>
        <button className="btn" onClick={onBack} style={{marginBottom:18}}><Icon name="arrow-left" size={16}/> Back</button>
        <div className="card" style={{padding:"28px 28px 8px"}}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:4}}>
            <div style={{width:10,height:10,borderRadius:"50%", background:"var(--answered)"}}/>
            <span style={{fontFamily:"var(--font-body)"}}>PDF successfully processed</span>
          </div>
          <h2 style={{margin:"14px 0 20px", fontSize:22, fontWeight:400, fontFamily:"var(--font-head)"}}>{paper.name}</h2>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px", marginBottom:24}}>
            <Stat label="Questions found" value={RAW_QUESTIONS.length} plain/>
            <Stat label="Answer key found" value="Yes" good plain/>
            {SUBJECTS.map(s=>{
              const ns = RAW_QUESTIONS.filter(q=>q.subject===s).map(q=>q.n);
              return <Stat key={s} label={s} value={`${counts[s]} (Q${Math.min(...ns)}–Q${Math.max(...ns)})`} plain/>;
            })}
            <Stat label="Question types" value={`${RAW_QUESTIONS.filter(q=>q.type!=="NUM").length} MCQ · ${RAW_QUESTIONS.filter(q=>q.type==="NUM").length} Numerical` + (numAttemptLimit(paper)!=null ? ` (answer any ${numAttemptLimit(paper)*3})` : "")} plain/>
          </div>

          <div style={{display:"flex", gap:10, marginBottom:28, flexWrap:"wrap"}}>
            <button className="btn" onClick={()=>setShowReview(true)}>Review Questions</button>
            <button className="btn btn-primary" onClick={onStart}>Continue to Exam Setup <Icon name="arrow-right" size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function Stat({label, value, good, plain, tip}){
  return (
    <div>
      <div style={{fontSize:12, color:"var(--text-faint)", textTransform:"uppercase", letterSpacing:"0.03em", marginBottom:2}}>{tip ? <span className="stat-tip" data-tip={tip}>{label}</span> : label}</div>
      <div style={{fontWeight: plain ? 400 : 700, ...(plain ? {fontFamily:"var(--font-body)"} : {}), color: good ? "var(--answered)" : "var(--text)"}}>{value}</div>
    </div>
  );
}

export function ReviewQuestions({onBack, onStart}){
  const paper = usePaper();
  const RAW_QUESTIONS = paper.questions;
  const [subj, setSubj] = useState("All");
  const filtered = RAW_QUESTIONS.filter(q=>subj==="All" || q.subject===subj);
  return (
    <div style={{minHeight:"100vh", padding:"30px 20px"}}>
      <div style={{maxWidth:760, margin:"0 auto"}}>
        <button className="btn" onClick={onBack} style={{marginBottom:16}}><Icon name="arrow-left" size={16}/> Back</button>
        <h2 style={{marginTop:0}}>Review Extracted Questions</h2>
        <div style={{display:"flex", gap:8, marginBottom:18, flexWrap:"wrap"}}>
          {["All", ...SUBJECTS].map(s=>(
            <button key={s} className="btn" onClick={()=>setSubj(s)}
              style={{background: subj===s ? "var(--navy)" : "var(--panel)", color: subj===s ? "#fff":"var(--text)", borderColor: subj===s?"var(--navy)":"var(--border-dark)"}}>
              {s}
            </button>
          ))}
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {filtered.map(q=>(
            <div key={q.n} className="card" style={{padding:16}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12, color:"var(--text-faint)"}}>
                <span>Q{q.n} · {q.subject} · {q.chapter}</span>
                <span style={{fontWeight:700, color:"var(--navy)"}}>{q.type}</span>
              </div>
              <div style={{marginBottom:q.options?10:4}}><TeX>{q.text}</TeX></div>
              {q.svg && <DiagramSVG id={q.svg}/>}
              {q.options && (
                <div style={{display:"grid", gridTemplateColumns:q.options.some(o=>o.text.length>70) ? "1fr" : "1fr 1fr", gap:6, fontSize:14}}>
                  {q.options.map(o=>(
                    <div key={o.id} style={{color: isOptionCorrect(q, o.id) ? "var(--answered)" : "var(--text-dim)", fontWeight:isOptionCorrect(q, o.id)?700:400, minWidth:0, overflowWrap:"break-word", display:"flex", alignItems:"center", columnGap:5, flexWrap:"wrap"}}>
                      <span>({o.id})</span> <span style={{minWidth:0}}><TeX>{o.text}</TeX></span>{isOptionCorrect(q, o.id) ? <span><Icon name="check" size={14}/></span> : null}
                    </div>
                  ))}
                </div>
              )}
              {!q.options && <div style={{fontSize:14, color:"var(--answered)", fontWeight:700}}>Answer: {answerText(q)}</div>}
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onStart} style={{marginTop:20}}>Continue to Exam Setup <Icon name="arrow-right" size={16}/></button>
      </div>
    </div>
  );
}

