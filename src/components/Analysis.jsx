import React from "react";
import {BarRow} from "./Charts";
import {SUBJECTS, fmtMinSec, fmtTime} from "../lib/constants";
import {Stat} from "../screens/PreviewScreen";

export function ResultPill({result}){
  const map = {correct:["Correct","var(--correct)"], wrong:["Wrong","var(--wrong)"], unattempted:["Unattempted","var(--unattempted)"], notchosen:["Not chosen","var(--steel)"]};
  const [label,color] = map[result];
  return <span style={{background:color, color:"#fff", padding:"2px 9px", borderRadius:10, fontSize:11.5, fontWeight:700}}>{label}</span>;
}

export const METRIC_TIPS = {
  "Attempt Rate": "Attempted questions \u00F7 total questions (75) \u00D7 100. Shows how many of the 75 questions you tried, right or wrong.",
  "Wrong-answer Rate": "Wrong answers \u00F7 total questions (75) \u00D7 100. Shows what share of the whole paper you got wrong.",
  "Attempt Efficiency": "Your net score \u00F7 (attempted questions \u00D7 4) \u00D7 100. Shows how much of the marks available on the questions you attempted you actually kept, after negative marking.",
};
export function DeepAnalysis({result}){
  const metrics = [
    ["Overall Score", `${result.totalScore} / 300`],
    ["Attempt Rate", `${(result.attempted/75*100).toFixed(1)}%`],
    ["Wrong-answer Rate", `${(result.wrong/75*100).toFixed(1)}%`],
    ["Negative Marks Lost", `${result.negMarksLost}`],
    ["Potential Score (no negative marking)", `${result.potentialNoNeg} / 300`],
    ["Attempt Efficiency", `${result.attemptEfficiency.toFixed(1)}%`],
    ["Strongest Subject", `${result.strongest.subject} (${result.strongest.score}/100)`],
    ["Weakest Subject", `${result.weakest.subject} (${result.weakest.score}/100)`],
    ["Most Error-Prone Subject", `${result.mostErrorProne.subject} (${result.mostErrorProne.wrong} wrong)`],
    ["Best Accuracy Subject", `${result.bestAccuracy.subject} (${result.bestAccuracy.accuracy.toFixed(1)}%)`],
    ["Best Attempt Rate", `${result.bestAttemptRate.subject} (${result.bestAttemptRate.attemptRate.toFixed(1)}%)`],
  ];
  return (
    <div>
      <div className="card" style={{padding:"20px 24px", marginBottom:20}}>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px,1fr))", gap:"16px 24px"}}>
          {metrics.map(([k,v])=>(
            <Stat key={k} label={k} value={v} plain tip={METRIC_TIPS[k]}/>
          ))}
        </div>
      </div>
      {result.warnings.length>0 && (
        <div className="card" style={{padding:"18px 22px", borderColor:"var(--gold)"}}>
          <div style={{fontWeight:700, marginBottom:10}}>Observations</div>
          <ul style={{margin:0, paddingLeft:20, fontSize:14, lineHeight:1.9, color:"var(--text-dim)"}}>
            {result.warnings.slice(0,8).map((w,i)=><li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ChapterAnalysis({result}){
  const sorted = [...result.chapterStats].sort((a,b)=>a.subject.localeCompare(b.subject) || b.total-a.total);
  return (
    <div className="card scrollx" style={{padding:0}}>
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:13.5, minWidth:640}}>
        <thead>
          <tr style={{textAlign:"left", borderBottom:"2px solid var(--border)"}}>
            {["Subject","Chapter","Attempted","Correct","Wrong","Accuracy","Score"].map(h=>(
              <th key={h} style={{padding:"10px 12px", color:"var(--text-dim)"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c,i)=>(
            <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
              <td style={{padding:"9px 12px"}}>{c.subject}</td>
              <td style={{padding:"9px 12px", fontWeight:600}}>{c.chapter}</td>
              <td style={{padding:"9px 12px"}} className="mono">{c.attempted}/{c.total}</td>
              <td style={{padding:"9px 12px"}} className="mono">{c.correct}</td>
              <td style={{padding:"9px 12px"}} className="mono">{c.wrong}</td>
              <td style={{padding:"9px 12px"}} className="mono">{c.attempted>0?c.accuracy.toFixed(0)+"%":"—"}</td>
              <td style={{padding:"9px 12px"}} className="mono">{c.score>0?`+${c.score}`:c.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TimeAnalysis({result}){
  return (
    <div>
      <div className="card" style={{padding:"20px 24px", marginBottom:20}}>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:"16px 24px"}}>
          <Stat label="Total Time Used" value={fmtTime(result.totalTime)} plain/>
          <Stat label="Avg Time / Attempted Question" value={fmtMinSec(result.avgTimePerQ)} plain/>
          {result.slowest && <Stat label="Slowest Question" value={`Q${result.slowest.n} (${fmtMinSec(result.slowest.timeSpent)})`} plain/>}
          {result.fastestAttempted && <Stat label="Fastest Attempted" value={`Q${result.fastestAttempted.n} (${fmtMinSec(result.fastestAttempted.timeSpent)})`} plain/>}
          <Stat label="Time Wasted on Wrong Answers" value={fmtMinSec(result.timeWastedOnWrong)} plain/>
          <Stat label="Time Spent on Unattempted Questions" value={fmtMinSec(result.timeOnUnattempted)} plain/>
        </div>
      </div>
      <div className="card" style={{padding:"20px 24px"}}>
        <div style={{fontWeight:700, marginBottom:14}}>Average Time by Subject</div>
        {SUBJECTS.map(s=>(
          <BarRow key={s} label={s} value={Math.round(result.bySubject[s].avgTime)} max={{Mathematics:180, Physics:150, Chemistry:120}[s]} color="var(--steel)"
            displayValue={fmtMinSec(result.bySubject[s].avgTime)}/>
        ))}
      </div>
    </div>
  );
}

