import React, {useMemo, useState} from "react";
import {BarRow} from "./Charts";
import {fmtMinSec} from "../lib/constants";
import {CAUSES} from "../lib/mistakes";
import {fmtPct} from "../lib/percentile";
import {causeBreakdown, paceRule, scenarios} from "../lib/strategy";

const card = {padding:"18px 22px", marginBottom:16};
const head = {fontSize:14, fontWeight:700, marginBottom:4};
const sub = {fontSize:12.5, color:"var(--text-dim)", marginBottom:12, lineHeight:1.5};
const signed = n => n > 0 ? `+${n}` : String(n);
const mins = m => `${m} minute${m===1 ? "" : "s"}`;

// "What would have changed my score?" for one finished attempt.
export function StrategyLab({state, result}){
  const [minutes, setMinutes] = useState(3);
  const breakdown = useMemo(()=>causeBreakdown(state, result), [state, result]);
  const rule = useMemo(()=>paceRule(result, minutes), [result, minutes]);
  const rows = useMemo(()=>scenarios(state, result, breakdown), [state, result, breakdown]);
  const maxLost = Math.max(5, ...CAUSES.map(c=>breakdown.byCause[c.id] ? breakdown.byCause[c.id].marks : 0));

  return (
    <div>
      <div className="card" style={card}>
        <div style={head}>1. Where your marks went</div>
        <div style={sub}>Each wrong answer costs 5 marks compared with getting it right (−1 instead of +4). This groups them by the cause you tagged in the Mistake Book.</div>
        {breakdown.wrongCount===0 ? <div style={{fontSize:14, color:"var(--correct)"}}>No wrong answers in this attempt.</div> : (<>
          {CAUSES.filter(c=>breakdown.byCause[c.id]).map(c=>(
            <BarRow key={c.id} label={`${c.label} (${breakdown.byCause[c.id].n})`} value={breakdown.byCause[c.id].marks} max={maxLost} color={c.color} displayValue={`−${breakdown.byCause[c.id].marks} marks`}/>
          ))}
          {breakdown.untagged>0 && (
            <div style={{fontSize:13, color:"var(--wrong)"}}>
              {breakdown.untagged} wrong answer{breakdown.untagged===1 ? " has" : "s have"} no cause yet (−{breakdown.untagged * 5} marks unexplained). Open "Review Wrong Questions" and tag them to complete this picture.
            </div>
          )}
          <div style={{fontSize:13.5, marginTop:8}}>Total lost to wrong answers: <strong>{breakdown.totalLost} marks</strong>.</div>
        </>)}
      </div>

      <div className="card" style={card}>
        <div style={head}>2. Move on sooner</div>
        <div style={sub}>What if you had given up on any question after a fixed time? Drag to try a limit.</div>
        <div style={{display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom:12}}>
          <label htmlFor="lab-minutes" style={{fontSize:13.5}}>Stop after</label>
          <input id="lab-minutes" type="range" min={1} max={6} step={0.5} value={minutes} onChange={e=>setMinutes(Number(e.target.value))} style={{flex:"1 1 160px", maxWidth:260}}/>
          <strong className="mono">{minutes} min</strong>
        </div>
        {rule.slowCount===0 ? <div style={{fontSize:14, color:"var(--text-dim)"}}>You never spent more than {mins(minutes)} on a question. Try a lower limit.</div> : (<>
          <div style={{fontSize:14, lineHeight:1.7}}>
            You went past {mins(minutes)} on <strong>{rule.slowCount}</strong> question{rule.slowCount===1 ? "" : "s"}:
            {" "}<span style={{color:"var(--wrong)", fontWeight:700}}>{rule.wrongSlow} wrong</span>,
            {" "}<span style={{color:"var(--correct)", fontWeight:700}}>{rule.correctSlow} right</span>
            {rule.unattemptedSlow>0 ? <>, {rule.unattemptedSlow} left blank</> : null}.
            Moving on at the limit would have freed about <strong>{rule.timeFreedMin} min</strong>
            {rule.extraAttempts>0 ? <>, enough to try about <strong>{rule.extraAttempts}</strong> more question{rule.extraAttempts===1 ? "" : "s"} at your usual pace and accuracy (≈ {signed(rule.gain)} marks)</> : null}.
          </div>
          <div style={{marginTop:10, padding:"10px 14px", borderRadius:8, background:"var(--bg)", fontSize:14}}>
            {rule.worst===rule.best
              ? <>Rough effect on your score: <strong className="mono">{signed(rule.best)}</strong> marks.</>
              : <>Rough effect on your score: <strong className="mono">{signed(rule.worst)}</strong> to <strong className="mono">{signed(rule.best)}</strong> marks.</>}
            <div style={{fontSize:12, color:"var(--text-faint)", marginTop:4}}>
              {rule.correctSlow>0
                ? `Best case: you still solve the slow right answers within the limit. Worst case: every slow right answer (${rule.correctSlow}) is lost (−${rule.risk}). The truth is somewhere in between; this is a guide, not a prediction.`
                : "None of the slow answers were right, so nothing you got right is put at risk. This is a guide, not a prediction."}
            </div>
          </div>
          {rule.slowest.length>0 && (
            <div style={{marginTop:12, fontSize:13}}>
              <div style={{fontWeight:700, marginBottom:4}}>Your slowest attempted questions</div>
              {rule.slowest.map(r=>(
                <div key={r.n} style={{display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid var(--border)"}}>
                  <span>Q{r.n} · {r.subject} · {r.chapter}</span>
                  <span className="mono"><span style={{color: r.result==="correct" ? "var(--correct)" : "var(--wrong)"}}>{r.result==="correct" ? "right" : "wrong"}</span> · {fmtMinSec(r.timeSpent)}</span>
                </div>
              ))}
            </div>
          )}
        </>)}
      </div>

      <div className="card" style={card}>
        <div style={head}>3. What it would be worth</div>
        <div style={sub}>Each row shows the score and the estimated percentile (an estimate from published tables, not NTA data).</div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse", width:"100%", fontSize:13.5}}>
            <thead><tr style={{textAlign:"left", color:"var(--text-faint)", fontSize:12}}>
              <th style={{padding:"4px 8px 6px 0"}}>Scenario</th><th style={{padding:"4px 8px"}}>Score</th><th style={{padding:"4px 0 6px 8px"}}>Est. percentile</th>
            </tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} style={{borderTop:"1px solid var(--border)", fontWeight: r.id==="actual" ? 700 : 400}}>
                  <td style={{padding:"8px 8px 8px 0"}}>{r.label}</td>
                  <td className="mono" style={{padding:"8px"}}>{r.score}{r.id!=="actual" ? <span style={{color:"var(--correct)"}}> ({signed(r.score - rows[0].score)})</span> : null}</td>
                  <td className="mono" style={{padding:"8px 0 8px 8px"}}>≈ {fmtPct(r.est.pct)} <span style={{color:"var(--text-faint)", fontWeight:400}}>({fmtPct(r.est.lo)} to {fmtPct(r.est.hi)})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
