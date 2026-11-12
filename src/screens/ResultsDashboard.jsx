import {PercentileCard} from "../components/PercentileCard";
import {addMistakes, attemptKeyOf, loadMistakes, mistakeKey, useMistakes} from "../lib/mistakes";
import {Icon} from "../components/icons";
import {CountUp} from "../components/motion";
import React, {useEffect, useRef, useState} from "react";
import {BarRow} from "../components/Charts";
import {Ring, SUBJECT_COLOR, SubjectBadge} from "../components/ui";
import {exportResultsForAI} from "../lib/aiExport";
import {SUBJECTS} from "../lib/constants";
import {getPaper} from "../lib/papers";
import {loadHistory} from "../lib/persistence";
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
  const max = result.maxScore || 300;
  const pu = (getPaper(state.paperId) || {}).percentileUrl;
  const exportTip = "One file for AI: a full analysis brief plus all the data of this exam (score, time, chapters, every question, your notes). Upload it to ChatGPT (or any AI) as it is, and it will analyse your test step by step like a teacher and give you a plan for the next test.";
  const pctOfMax = Math.round(Math.max(0, result.totalScore) / max * 100);
  // Confetti is for a result worth celebrating: a positive score that is your first, or at least your average so far.
  const [{celebrate, best, delta}] = useState(()=>{
    const prev = loadHistory().filter(h=>h && h.snapshot && h.snapshot.startedAt < state.startedAt && typeof h.score==="number").map(h=>h.score);
    const avg = prev.length ? prev.reduce((a, b)=>a + b, 0) / prev.length : null;
    return {
      celebrate: result.totalScore > 0 && (avg===null || result.totalScore >= avg),
      best: result.totalScore > 0 && prev.length > 0 && result.totalScore > Math.max(...prev),   // beats every earlier test
      delta: avg===null ? null : Math.round(result.totalScore - avg),                               // against your average before this test
    };
  });
  const chip = (icon, label, value, cls) => (
    <div className="card" style={{padding:"12px 14px", display:"flex", alignItems:"center", gap:11}}>
      <span className={"chip " + cls} style={{width:34, height:34, padding:0, justifyContent:"center", borderRadius:10}}><Icon name={icon} size={17}/></span>
      <div><div className="num" style={{fontSize:20, lineHeight:1.1}}>{typeof value==="number" ? <CountUp value={value} duration={1100}/> : value}</div><div style={{fontSize:12, color:"var(--text-dim)"}}>{label}</div></div>
    </div>
  );
  return (
    <div className="rs-bg">
      {celebrate && <Confetti attemptKey={`${state.paperId}:${state.startedAt}`}/>}
      <div className="page stagger" style={{maxWidth:980}}>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:10}}>
            <span className="chip chip-good"><Icon name="check-circle" size={14}/> Test complete</span>
            {best && <span className="chip chip-best"><Icon name="trophy" size={14}/> New personal best</span>}
            {delta!==null && delta!==0 && <span className={"chip " + (delta>0 ? "chip-good" : "chip-bad")}><Icon name="trending-up" size={14} style={delta<0 ? {transform:"scaleY(-1)"} : null}/> {delta>0 ? "+" : "−"}{Math.abs(delta)} vs your average</span>}
          </div>
          <h1 style={{margin:0, fontSize:28}}>{state.testName}</h1>
        </div>

        <div className="card score-card" style={{padding:"26px 28px", marginBottom:16, display:"flex", gap:28, alignItems:"center", flexWrap:"wrap",
          background:"linear-gradient(135deg, color-mix(in srgb, var(--brand) 9%, var(--panel)), var(--panel) 60%)"}}>
          <Ring value={Math.max(0, result.totalScore)} max={max} size={176} stroke={14} color="url(#scoreGrad)" label={`Score ${result.totalScore} out of ${max}`}>
            <svg width="0" height="0" style={{position:"absolute"}}><defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4d74f2"/><stop offset="1" stopColor="#8a5df0"/></linearGradient></defs></svg>
            <span className="num" style={{fontSize:46, lineHeight:1}}><CountUp value={result.totalScore} duration={1400}/></span>
            <span style={{fontSize:13, color:"var(--text-faint)", fontWeight:650}}>out of {max}</span>
          </Ring>
          <div style={{flex:"1 1 320px", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:10}}>
            {chip("target", "accuracy", <><CountUp value={result.accuracy} duration={1100} format={v=>v.toFixed(1)}/>%</>, "chip-soft")}
            {chip("check-circle", "correct", result.correct, "chip-good")}
            {chip("x-circle", "incorrect", result.wrong, "chip-bad")}
            {chip("minus", "unattempted", result.unattempted, "")}
          </div>
          {typeof pu==="string" && /^https?:\/\//i.test(pu) && (
            <a href={pu} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{alignSelf:"flex-start", textDecoration:"none"}}>
              <Icon name="chart" size={14}/> Marks vs percentile tables <Icon name="arrow-up-right" size={13}/>
            </a>
          )}
        </div>

        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(270px, 1fr))", gap:16, marginBottom:16}}>
          {SUBJECTS.map(s=>{
            const b = result.bySubject[s];
            return (
              <div key={s} className="card card-hover" style={{padding:"18px 20px", borderTop:`3px solid ${SUBJECT_COLOR[s]}`}}>
                <div style={{display:"flex", alignItems:"center", gap:11, marginBottom:12}}>
                  <SubjectBadge subject={s} size={38}/>
                  <div style={{flex:1}}><div style={{fontWeight:800, fontSize:15.5}}>{s}</div><div style={{fontSize:12, color:"var(--text-faint)"}}>{b.correct} right · {b.wrong} wrong · {b.unattempted} blank</div></div>
                  <div style={{textAlign:"right"}}><div className="num" style={{fontSize:22, lineHeight:1}}><CountUp value={b.score} duration={1200}/></div><div style={{fontSize:11, color:"var(--text-faint)"}}>of {b.max || 100}</div></div>
                </div>
                <BarRow label="Score" value={Math.max(0, b.score)} max={b.max || 100} color={SUBJECT_COLOR[s]} displayValue={`${b.score}/${b.max || 100}`}/>
                <BarRow label="Accuracy" value={Math.round(b.accuracy)} max={100} color="var(--correct)" suffix="%"/>
              </div>
            );
          })}
        </div>

        <div style={{marginBottom:16}}><PercentileCard paperId={state.paperId} score={result.totalScore}/></div>
        {wrongRows.length>0 && (
          <div className="card" style={{padding:"16px 20px", marginBottom:16, display:"flex", gap:14, alignItems:"center", flexWrap:"wrap", borderLeft:"4px solid var(--marked)"}}>
            <span className="icon-tile sm"><Icon name="mistakes" size={17}/></span>
            <div style={{flex:"1 1 260px", fontSize:14, lineHeight:1.5}}>
              {inBook===wrongRows.length
                ? <><strong>{inBook} wrong answer{inBook===1 ? " is" : "s are"} in your Mistake Book.</strong> {untagged>0 ? `Tag why you missed ${untagged===1 ? "it" : "them"}: knowing the cause is what fixes it.` : "All tagged. You will be quizzed on them again over the coming weeks."}</>
                : <><strong>{wrongRows.length - inBook} of {wrongRows.length} wrong answers are not in your Mistake Book yet.</strong> Add them to be quizzed on them again after 1, 3, 7, 14, 30 and 60 days.</>}
            </div>
            {inBook<wrongRows.length
              ? <button className="btn btn-primary" onClick={()=>addMistakes(state, wrongRows)}><Icon name="plus" size={16}/> Add them</button>
              : <button className="btn btn-primary" onClick={onReviewWrong}>{untagged>0 ? "Tag the causes" : "Review them"} <Icon name="arrow-right" size={16}/></button>}
            {onOpenMistakes && <button className="btn" onClick={onOpenMistakes}>Open Mistake Book</button>}
          </div>
        )}

        <div style={{display:"flex", gap:10, flexWrap:"wrap", marginBottom:30}}>
          <button className="btn btn-primary btn-lg" onClick={onViewAnalysis}><Icon name="chart" size={18}/> Question-wise analysis</button>
          <button className="btn btn-lg" onClick={onReviewWrong}><Icon name="eye" size={18}/> Review wrong questions</button>
          {onRetake && <button className="btn btn-lg" onClick={onRetake}><Icon name="refresh" size={18}/> Retake</button>}
          <button className="btn btn-lg tip-btn" data-tip={exportTip} onClick={()=>exportResultsForAI(state, result)}><Icon name="download" size={18}/> Export for AI</button>
          <button className="btn btn-lg btn-ghost" onClick={onBackHome}><Icon name="home" size={18}/> Home</button>
        </div>
      </div>
    </div>
  );
}
export function LegendDot({color,label}){
  return <div style={{display:"flex", alignItems:"center", gap:8}}><span style={{width:12,height:12,borderRadius:3,background:color}}/>{label}</div>;
}

