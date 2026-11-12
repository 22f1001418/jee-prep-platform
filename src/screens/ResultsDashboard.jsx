import {addMistakes, attemptKeyOf, loadMistakes, mistakeKey, useMistakes} from "../lib/mistakes";
import React, {useEffect, useRef, useState} from "react";
import {BarRow, Donut} from "../components/Charts";
import {exportResultsForAI} from "../lib/aiExport";
import {SUBJECTS} from "../lib/constants";
import {getPaper} from "../lib/papers";
import {store} from "../lib/store";

export const LS_CELEBRATED = "jee_cbt_celebrated_v1";
export function alreadyCelebrated(key){
  try{ return (JSON.parse(store.getItem(LS_CELEBRATED) || "[]")).includes(key); }catch(e){ return false; }
}
export function markCelebrated(key){
  try{
    const list = JSON.parse(store.getItem(LS_CELEBRATED) || "[]");
    if(!list.includes(key)) list.push(key);
    store.setItem(LS_CELEBRATED, JSON.stringify(list.slice(-100)));
  }catch(e){}
}
export function Confetti({attemptKey}){
  const ref = useRef(null);
  const [done, setDone] = useState(false);
  useEffect(()=>{
    if(alreadyCelebrated(attemptKey)){ setDone(true); return; }
    markCelebrated(attemptKey);
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches){ setDone(true); return; }
    const cv = ref.current; if(!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const size = ()=>{ cv.width = window.innerWidth*dpr; cv.height = window.innerHeight*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); };
    size(); window.addEventListener("resize", size);
    const colors = ["#f5d04c","#3f7cc4","#e0533d","#2e9e5b","#b184f0","#ff8fb1","#5fd0e8","#ff9a3c"];
    const parts = [];
    const rnd = (a,b)=>a+Math.random()*(b-a);
    function burst(fromLeft, n){
      for(let i=0;i<n;i++){
        const ang = ((fromLeft ? -62 : -118) + rnd(-26,26)) * Math.PI/180;
        const sp = rnd(10,22);
        parts.push({x: fromLeft ? -4 : window.innerWidth+4, y: window.innerHeight*rnd(0.62,0.8),
          vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, w: rnd(6,12), h: rnd(4,8),
          rot: rnd(0,6.28), vr: rnd(-0.3,0.3), flip: rnd(0,6.28), color: colors[(Math.random()*colors.length)|0],
          round: Math.random()<0.25, age: 0});
      }
    }
    const timers = [];
    [0,300,650].forEach((t,i)=>timers.push(setTimeout(()=>{ const n = i===2 ? 35 : 70; burst(true,n); burst(false,n); }, t)));
    const t0 = performance.now();
    let raf = 0, stopped = false;
    function frame(now){
      if(stopped) return;
      ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
      for(let i=parts.length-1;i>=0;i--){
        const p = parts[i];
        p.vy += 0.3; p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.flip += 0.18; p.age++;
        if(p.y > window.innerHeight+40){ parts.splice(i,1); continue; }
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.flip));
        ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (p.age-110)/60));
        ctx.fillStyle = p.color;
        if(p.round){ ctx.beginPath(); ctx.arc(0,0,p.w/2.4,0,6.283); ctx.fill(); }
        else ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
        if(p.age>170) parts.splice(i,1);
      }
      const elapsed = now - t0;
      if((parts.length===0 && elapsed>900) || elapsed>7000){ setDone(true); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return ()=>{ stopped = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); window.removeEventListener("resize", size); };
  }, []);
  if(done) return null;
  return <canvas ref={ref} aria-hidden="true" style={{position:"fixed", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:70}}/>;
}

export function ResultsDashboard({state, result, onViewAnalysis, onReviewWrong, onOpenMistakes, onBackHome, onRetake}){
  useMistakes();
  const wrongRows = result.perQuestionResults.filter(r=>r.result==="wrong");
  const book = loadMistakes();
  const inBook = wrongRows.filter(r=>book[mistakeKey(state.paperId, r.n)] && book[mistakeKey(state.paperId, r.n)].hits.some(h=>h.a===attemptKeyOf(state))).length;
  const untagged = wrongRows.filter(r=>{ const it = book[mistakeKey(state.paperId, r.n)]; const h = it && it.hits.find(x=>x.a===attemptKeyOf(state)); return h && !h.cause; }).length;
  return (
    <div className="rs-bg" style={{minHeight:"100vh", padding:"36px 20px"}}>
      <Confetti attemptKey={`${state.paperId}:${state.startedAt}`}/>
      <div style={{maxWidth:900, margin:"0 auto"}}>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:12.5, color:"var(--text-faint)", fontWeight:700, letterSpacing:"0.06em", marginBottom:4}}>TEST COMPLETE</div>
          <h1 style={{fontSize:26, fontWeight:800, color:"var(--text)", margin:0}}>{state.testName}</h1>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:16, marginBottom:16}}>
          <div className="card rs-g rs-g-score" style={{padding:"26px 32px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", minHeight:230}}>
            <div style={{fontSize:13, fontWeight:700, letterSpacing:"0.08em", color:"var(--text-faint)", marginBottom:6}}>YOUR SCORE</div>
            <div style={{fontSize:"clamp(76px, 11vw, 112px)", fontWeight:900, lineHeight:1, background:"linear-gradient(90deg,#5aa0ee,#b184f0)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent"}}>{result.totalScore} <span style={{fontSize:"clamp(30px, 4.5vw, 46px)", color:"var(--text-faint)", fontWeight:700}}>/ {result.maxScore}</span></div>
            {(()=>{ const pu = (getPaper(state.paperId)||{}).percentileUrl; return (typeof pu==="string" && /^https?:\/\//i.test(pu)) ? (
              <a href={pu} target="_blank" rel="noopener noreferrer" className="rs-pct">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="8" width="3" height="6" rx="1" fill="currentColor"/><rect x="6.5" y="4" width="3" height="10" rx="1" fill="currentColor"/><rect x="11" y="1.5" width="3" height="12.5" rx="1" fill="currentColor"/></svg>
                <span>Check percentile for this score</span><span className="rs-pct-arr">↗</span>
              </a>
            ) : null; })()}
          </div>
          <div className="card rs-g rs-g-donut" style={{padding:"20px 28px", display:"flex", alignItems:"center", justifyContent:"center", gap:24, flexWrap:"wrap"}}>
            <Donut correct={result.correct} wrong={result.wrong} unattempted={result.unattempted}/>
            <div style={{display:"flex", flexDirection:"column", gap:8, fontSize:13}}>
              <LegendDot color="var(--correct)" label={`Correct: ${result.correct}`}/>
              <LegendDot color="var(--wrong)" label={`Incorrect: ${result.wrong}`}/>
              <LegendDot color="var(--unattempted)" label={`Unattempted: ${result.unattempted}`}/>
              <div style={{marginTop:4, fontWeight:700}}>Accuracy: {result.accuracy.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))", gap:16, marginBottom:30}}>
          {SUBJECTS.map(s=>{
            const b = result.bySubject[s];
            return (
              <div key={s} className={"card rs-g rs-g-"+s} style={{padding:"20px 22px"}}>
                <div style={{fontWeight:700, marginBottom:8}}>{s.toUpperCase()}</div>
                <div style={{fontSize:13, color:"var(--text-dim)", marginBottom:14}}>
                  Correct: {b.correct} · Wrong: {b.wrong} · Unattempted: {b.unattempted}
                </div>
                <BarRow label="Score" value={b.score} max={100} color={{Mathematics:"#3f7cc4", Physics:"#e08a2c", Chemistry:"#14532d"}[s]} suffix="/100"/>
                <BarRow label="Accuracy" value={Math.round(b.accuracy)} max={100} color="var(--correct)" suffix="%"/>
              </div>
            );
          })}
        </div>

        {wrongRows.length>0 && (
          <div className="card" style={{padding:"14px 18px", marginBottom:18, display:"flex", gap:14, alignItems:"center", flexWrap:"wrap", borderLeft:"4px solid var(--marked)"}}>
            <div style={{flex:"1 1 260px", fontSize:14, lineHeight:1.5}}>
              {inBook===wrongRows.length
                ? <><strong>{inBook} wrong answer{inBook===1 ? " is" : "s are"} in your Mistake Book.</strong> {untagged>0 ? `Tag why you missed ${untagged===1 ? "it" : "them"}: knowing the cause is what fixes it.` : "All tagged. You will be quizzed on them again over the coming weeks."}</>
                : <><strong>{wrongRows.length - inBook} of {wrongRows.length} wrong answers are not in your Mistake Book yet.</strong> Add them to be quizzed on them again after 1, 3, 7, 14, 30 and 60 days.</>}
            </div>
            {inBook<wrongRows.length
              ? <button className="btn btn-primary" onClick={()=>addMistakes(state, wrongRows)}>Add them</button>
              : <button className="btn btn-primary" onClick={onReviewWrong}>{untagged>0 ? "Tag the causes" : "Review them"}</button>}
            {onOpenMistakes && <button className="btn" onClick={onOpenMistakes}>Open Mistake Book</button>}
          </div>
        )}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(168px, 1fr))", gap:10, marginBottom:30}}>
          <button className="btn btn-primary" style={{width:"100%", padding:"12px 6px", fontSize:13, whiteSpace:"nowrap"}} onClick={onViewAnalysis}>Question-wise Analysis</button>
          <button className="btn" style={{width:"100%", padding:"12px 6px", fontSize:13, whiteSpace:"nowrap"}} onClick={onReviewWrong}>Review Wrong Questions</button>
          {onRetake && <button className="btn btn-save" style={{width:"100%", padding:"12px 6px", fontSize:13, whiteSpace:"nowrap"}} onClick={onRetake}>Retake This Test</button>}
          <button className="btn tip-btn" data-tip="One file for AI: a full analysis brief plus all the data of this exam (score, time, chapters, every question, your notes). Upload it to ChatGPT (or any AI) as it is, and it will analyse your test step by step like a teacher and give you a plan for the next test." style={{width:"100%", padding:"12px 6px", fontSize:13, whiteSpace:"nowrap"}} onClick={()=>exportResultsForAI(state, result)}>Export Results</button>
          <button className="btn" style={{width:"100%", padding:"12px 6px", fontSize:13, whiteSpace:"nowrap"}} onClick={onBackHome}>Back to Home</button>
        </div>
      </div>
    </div>
  );
}
export function LegendDot({color,label}){
  return <div style={{display:"flex", alignItems:"center", gap:8}}><span style={{width:12,height:12,borderRadius:3,background:color}}/>{label}</div>;
}

