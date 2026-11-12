import React, {useEffect, useMemo, useState} from "react";
import {Icon} from "../components/icons";
import {getNextExamDate} from "../components/ExamCountdown";
import {Ring, SUBJECT_COLOR, Sparkline, SubjectBadge} from "../components/ui";
import {CountUp} from "../components/motion";
import {Heatmap} from "../components/Heatmap";
import {GOAL_STEPS, activityDays, activityToday, currentStreak, greeting, loadDailyGoal, milestones, questionsToday, saveDailyGoal, weekStrip} from "../lib/activity";
import {bookSummary, fmtShortDate} from "../lib/mistakes";
import {PAPER_REGISTRY} from "../lib/papers";
import {GOAL_CHOICES, estimatePercentile, fmtPct, loadGoal, marksForPercentile, saveGoal} from "../lib/percentile";
import {loadHistory} from "../lib/persistence";
import {answeredCount, attemptStats, loadSession} from "../lib/practice";
import {loadProfile} from "./ProfileScreen";

function Countdown(){
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{ const id = setInterval(()=>setNow(Date.now()), 30000); return ()=>clearInterval(id); }, []);
  const d = getNextExamDate(now), diff = Math.max(0, d.getTime() - now);
  const days = Math.floor(diff / 86400000), hours = Math.floor((diff % 86400000) / 3600000);
  return (
    <div className="hero-count" title={`Until 22 January ${d.getFullYear()}`}>
      <div className="num" style={{fontSize:44, lineHeight:1}}><CountUp value={days} duration={1100}/></div>
      <div style={{fontSize:13, fontWeight:700, opacity:.9}}>days to JEE Main {d.getFullYear()}</div>
      <div style={{fontSize:12, opacity:.7}}>22 Jan · {hours}h to go today</div>
    </div>
  );
}

function PlanItem({icon, done, title, hint, action, onAction, tone}){
  return (
    <div style={{display:"flex", alignItems:"center", gap:14, padding:"13px 0", borderTop:"1px solid var(--border)"}} className="plan-row">
      <span style={{width:38, height:38, borderRadius:12, flexShrink:0, display:"inline-flex", alignItems:"center", justifyContent:"center",
        background: done ? "color-mix(in srgb, var(--correct) 14%, var(--panel))" : "var(--brand-soft)", color: done ? "var(--correct)" : "var(--brand)"}}>
        <Icon name={done ? "check-circle" : icon} size={20}/>
      </span>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:700, fontSize:14.5, textDecoration: done ? "none" : "none", color: done ? "var(--text-dim)" : "var(--text)"}}>{title}</div>
        <div style={{fontSize:12.5, color:"var(--text-faint)"}}>{hint}</div>
      </div>
      {done ? <span className="chip chip-good"><Icon name="check" size={13} stroke={2.4}/>Done</span>
        : <button className={"btn btn-sm " + (tone==="primary" ? "btn-primary" : "")} onClick={onAction}>{action}<Icon name="arrow-right" size={14}/></button>}
    </div>
  );
}

// Home: what to do next, how you are doing, and where you are weakest.
export function Home({hasActive, onNavigate, onResumeTest, onStartPaper, onPracticeChapter, onResumePractice, onEditProfile, onOpenSearch}){
  // the hero's lights drift a little towards the pointer
  const heroMove = e=>{
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--px", ((e.clientX - r.left) / r.width - .5).toFixed(3));
    e.currentTarget.style.setProperty("--py", ((e.clientY - r.top) / r.height - .5).toFixed(3));
  };
  const profile = loadProfile();
  const [goal, setGoal] = useState(()=>loadGoal());
  const [daily, setDaily] = useState(()=>loadDailyGoal());
  const book = bookSummary();
  const history = useMemo(()=>loadHistory(), []);               // newest first
  const stats = useMemo(()=>attemptStats(), []);
  const days = useMemo(()=>activityDays(), []);
  const today = useMemo(()=>({n: questionsToday(), act: activityToday()}), []);
  const {streak, doneToday} = currentStreak(days);
  const week = weekStrip(days);
  const marks = useMemo(()=>milestones(days), [days]);
  const practiceSess = loadSession();
  const practiceOpen = practiceSess && !practiceSess.finished ? practiceSess : null;

  const attempted = new Set(history.map(h=>h.snapshot && h.snapshot.paperId));
  const nextPaper = PAPER_REGISTRY.find(p=>!attempted.has(p.id));
  const weak = [...stats.byChapter.entries()]
    .map(([k, v])=>({subject:k.split("|")[0], chapter:k.split("|").slice(1).join("|"), att:v.att, pct:Math.round(v.cor / v.att * 100)}))
    .filter(x=>x.att>=3).sort((a, b)=>a.pct - b.pct || b.att - a.att).slice(0, 5);
  const recent = history.slice(0, 5);
  const trend = history.slice(0, 8).reverse();
  const first = (profile && profile.name || "").trim().split(/\s+/)[0];
  const dateLine = new Date().toLocaleDateString(undefined, {weekday:"long", day:"numeric", month:"long"});

  // the single best next step, shown as the hero button
  const next = hasActive ? {label:"Resume your test", icon:"play", run:onResumeTest, why:"You have a mock test in progress."}
    : practiceOpen ? {label:"Resume practice", icon:"play", run:onResumePractice, why:`${answeredCount(practiceOpen)} of ${practiceOpen.keys.length} answered so far.`}
    : book.due>0 ? {label:`Revise ${book.due} question${book.due===1 ? "" : "s"}`, icon:"mistakes", run:()=>onNavigate("mistakes"), why:"These are due today. Reviewing on time is what makes them stick."}
    : weak.length ? {label:`Practise ${weak[0].chapter}`, icon:"practice", run:()=>onPracticeChapter(weak[0].subject, weak[0].chapter), why:`Your weakest chapter: ${weak[0].pct}% correct so far.`}
    : nextPaper ? {label:"Start a mock test", icon:"tests", run:()=>onStartPaper(nextPaper.id), why:nextPaper.name}
    : {label:"Build a practice set", icon:"practice", run:()=>onNavigate("practice"), why:"Pick chapters, types and years."};

  const goalPct = Math.min(100, Math.round(today.n / daily * 100));
  return (
    <div className="page stagger" style={{maxWidth:1040}}>
      <section className="hero" onPointerMove={heroMove}>
        <span className="hero-orb o1" aria-hidden="true"/><span className="hero-orb o2" aria-hidden="true"/><span className="hero-orb o3" aria-hidden="true"/>
        <div style={{flex:"1 1 340px", minWidth:0, position:"relative", zIndex:1}}>
          <div style={{fontSize:12.5, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", opacity:.75}}>{dateLine}{onEditProfile && <> · <button type="button" onClick={onEditProfile} style={{position:"relative", zIndex:1, background:"none", border:0, padding:0, color:"inherit", font:"inherit", letterSpacing:"inherit", textTransform:"inherit", textDecoration:"underline", cursor:"pointer"}}>{profile ? "Edit profile" : "Add your name"}</button></>}</div>
          <h1 style={{color:"#fff", margin:"6px 0 6px", fontSize:32}}>{greeting()}{first ? <>, <span className="hero-name">{first}</span></> : ""}</h1>
          <p style={{margin:"0 0 18px", opacity:.88, fontSize:15, maxWidth:520}}>
            {history.length===0 && book.total===0 ? "Take a mock test or practise a chapter. Everything you get wrong turns into a revision plan." : next.why}
          </p>
          <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
            <button className="btn btn-lg hero-cta" onClick={next.run}><Icon name={next.icon} size={18}/>{next.label}</button>
            <button className="btn btn-lg hero-ghost" onClick={()=>onNavigate("tests")}><Icon name="tests" size={18}/>All mock tests</button>
            {onOpenSearch && <button className="btn btn-lg hero-ghost" onClick={onOpenSearch} title="Search papers and chapters (Ctrl/Cmd + K)" aria-label="Search"><Icon name="search" size={18}/></button>}
          </div>
        </div>
        <Countdown/>
      </section>

      <div className="home-grid" style={{marginBottom:16}}>
        <div className="card home-card">
          <div className="home-eyebrow"><Icon name="target" size={14}/> Daily goal</div>
          <div style={{display:"flex", alignItems:"center", gap:16}}>
            <Ring value={today.n} max={daily} size={104} stroke={10} color={today.n>=daily ? "var(--correct)" : "var(--brand)"} label={`${today.n} of ${daily} questions today`}>
              <span className="num" style={{fontSize:26, lineHeight:1}}><CountUp value={today.n}/></span>
              <span style={{fontSize:11, color:"var(--text-faint)"}}>of {daily}</span>
            </Ring>
            <div style={{fontSize:13.5, color:"var(--text-dim)", lineHeight:1.5}}>
              {today.n>=daily ? <strong style={{color:"var(--correct)"}}>Goal reached. Anything more is a bonus.</strong> : <><strong style={{color:"var(--text)"}}>{daily - today.n} to go</strong> ({goalPct}%). Tests, practice and revision all count.</>}
            </div>
          </div>
          <div style={{display:"flex", gap:6, alignItems:"center", flexWrap:"wrap"}}>
            <span style={{fontSize:12, color:"var(--text-faint)", marginRight:2}}>Per day</span>
            {GOAL_STEPS.map(n=>(
              <button key={n} type="button" aria-pressed={daily===n} className={"chip "+(daily===n ? "chip-soft" : "")} style={{cursor:"pointer", fontFamily:"inherit"}} onClick={()=>{ saveDailyGoal(n); setDaily(n); }}>{n}</button>
            ))}
          </div>
        </div>

        <div className="card home-card">
          <div className="home-eyebrow"><Icon name="flame" size={14}/> Study streak</div>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <span className={"flame-tile" + (streak>0 ? " lit" : "")} style={{opacity: streak>0 ? 1 : .5}}><Icon name="flame" size={30} fill={streak>0}/></span>
            <div>
              <div className="num" style={{fontSize:34, lineHeight:1}}><CountUp value={streak} duration={700}/><span style={{fontSize:15, fontWeight:650, color:"var(--text-dim)"}}> day{streak===1 ? "" : "s"}</span></div>
              <div style={{fontSize:12.5, color:"var(--text-faint)", marginTop:3}}>{doneToday ? "You studied today." : streak>0 ? "Study today to keep it going." : "A test, practice or revision counts."}</div>
            </div>
          </div>
          <div style={{display:"flex", gap:6}} aria-label="Last 7 days">
            {week.map((d, i)=>(
              <div key={i} style={{flex:1, textAlign:"center"}}>
                <div className={d.active ? "day-on" : ""} title={d.active ? "Studied" : "No activity"} style={{animationDelay:`${i * 60}ms`, height:30, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff",
                  background: d.active ? "linear-gradient(135deg, #34b36b, #1e8e4a)" : "var(--bg)", border: d.active ? "none" : "1px solid var(--border)", outline: d.today ? "2px solid var(--brand)" : "none", outlineOffset:2}}>
                  {d.active && <Icon name="check" size={15} stroke={2.8}/>}
                </div>
                <div style={{fontSize:11, color:"var(--text-faint)", marginTop:5}}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card home-card">
          <div className="home-eyebrow"><Icon name="trophy" size={14}/> Target percentile</div>
          <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
            <label htmlFor="goal-pct" style={{fontSize:13.5, color:"var(--text-dim)"}}>Aiming for</label>
            <select id="goal-pct" value={goal ? String(goal.percentile) : ""} onChange={e=>{ const v = e.target.value==="" ? null : Number(e.target.value); saveGoal(v); setGoal(v==null ? null : {percentile:v}); }}
              style={{padding:"5px 8px", fontSize:14, fontFamily:"inherit", border:"1.5px solid var(--border-dark)", background:"var(--panel)", color:"var(--text)"}}>
              <option value="">no target</option>
              {GOAL_CHOICES.map(p=><option key={p} value={p}>{p} percentile</option>)}
            </select>
          </div>
          {!goal ? <div style={{fontSize:13, color:"var(--text-dim)"}}>Pick a target to see how many marks it takes and how far your recent tests are from it.</div> : (()=>{
            const need = marksForPercentile("general", goal.percentile);
            const last = history.slice(0, 3);
            const avg = last.length ? Math.round(last.reduce((s, h)=>s + h.score, 0) / last.length) : null;
            const avgPct = last.length ? last.reduce((s, h)=>s + estimatePercentile(h.snapshot.paperId, h.score).pct, 0) / last.length : null;
            return (<>
              <div style={{fontSize:14, lineHeight:1.5}}>About <strong className="num" style={{fontSize:20}}><CountUp value={need}/></strong> marks on an average paper.</div>
              {avg===null ? <div style={{fontSize:13, color:"var(--text-dim)"}}>Take a test to see where you stand.</div> : (<>
                <div style={{height:9, background:"var(--border)", borderRadius:5, overflow:"hidden"}}><div style={{width:`${Math.max(3, Math.min(100, avg / need * 100))}%`, height:"100%", borderRadius:5, background: avg>=need ? "var(--correct)" : "linear-gradient(90deg, var(--brand), var(--brand-2))", transition:"width .8s var(--ease)"}}/></div>
                <div style={{fontSize:13, color:"var(--text-dim)"}}>Last {last.length} test{last.length===1 ? "" : "s"}: <strong style={{color:"var(--text)"}}>{avg}</strong> marks, about {fmtPct(avgPct)} percentile{avg>=need ? ". On target." : `. ${need - avg} to go.`}</div>
              </>)}
              <div style={{fontSize:11.5, color:"var(--text-faint)"}}>Estimates from published tables, not NTA data.</div>
            </>);
          })()}
        </div>
      </div>

      <div className="card home-card" style={{marginBottom:16}}>
        <div className="home-eyebrow"><Icon name="calendar" size={14}/> Your activity</div>
        <Heatmap/>
      </div>

      <div className="home-cols">
        <div style={{display:"flex", flexDirection:"column", gap:16, minWidth:0}}>
          <div className="card home-card" style={{gap:0}}>
            <div className="home-eyebrow" style={{marginBottom:8}}><Icon name="calendar" size={14}/> Today's plan</div>
            {book.total>0 && (book.due>0
              ? <PlanItem icon="mistakes" title={`Revise ${book.due} due question${book.due===1 ? "" : "s"}`} hint="Spaced repetition: answer from memory, then check." action="Start" tone="primary" onAction={()=>onNavigate("mistakes")}/>
              : <PlanItem done icon="mistakes" title="Revision" hint={today.act.revisions>0 ? `${today.act.revisions} answered today. Nothing else is due.` : "Nothing is due today."}/>)}
            {today.act.practice>0
              ? <PlanItem done icon="practice" title="Practice" hint={`${today.act.practice} set${today.act.practice===1 ? "" : "s"} finished today.`}/>
              : <PlanItem icon="practice" title={weak.length ? `Practise ${weak[0].chapter}` : "Do a practice set"} hint={weak.length ? `Your weakest chapter, ${weak[0].pct}% so far. About 10 minutes.` : "Pick any chapter. About 10 minutes."} action="Start" tone={book.total>0 && book.due>0 ? "" : "primary"}
                  onAction={()=>weak.length ? onPracticeChapter(weak[0].subject, weak[0].chapter) : onNavigate("practice")}/>}
            {today.act.tests>0
              ? <PlanItem done icon="tests" title="Mock test" hint="You took a mock test today."/>
              : hasActive ? <PlanItem icon="tests" title="Finish your mock test" hint="It is saved where you left it." action="Resume" onAction={onResumeTest}/>
              : <PlanItem icon="tests" title="Full mock test" hint={nextPaper ? nextPaper.name : "Retake a paper to measure progress."} action="Start" onAction={()=>nextPaper ? onStartPaper(nextPaper.id) : onNavigate("tests")}/>}
          </div>

          <div className="card home-card">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div className="home-eyebrow"><Icon name="trending-up" size={14}/> Recent tests</div>
              {history.length>0 && <button className="btn btn-ghost btn-sm" onClick={()=>onNavigate("history")}>All <Icon name="arrow-right" size={13}/></button>}
            </div>
            {history.length===0 ? <div style={{fontSize:14, color:"var(--text-dim)"}}>No tests yet. Your scores and trend will show up here.</div> : (<>
              {trend.length>=2 && <Sparkline values={trend.map(h=>Math.max(0, h.score))} max={trend[0].maxScore || 300} labels={trend.map(h=>`${h.testName}: ${h.score}/${h.maxScore}`)}/>}
              <div style={{display:"flex", flexDirection:"column"}}>
                {recent.map((h, i)=>(
                  <div key={i} style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, fontSize:13.5, padding:"9px 0", borderTop:"1px solid var(--border)"}}>
                    <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{h.testName}</span>
                    <span className="chip chip-soft num" style={{flexShrink:0}}><CountUp value={h.score} duration={700}/>/{h.maxScore}</span>
                  </div>
                ))}
              </div>
            </>)}
          </div>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:16, minWidth:0}}>
          <div className="card home-card">
            <div className="home-eyebrow"><Icon name="bulb" size={14}/> Weakest chapters</div>
            {weak.length===0 ? <div style={{fontSize:14, color:"var(--text-dim)"}}>Answer a few questions in a chapter and your weakest ones show here.</div> : weak.map(w=>(
              <div key={w.subject + w.chapter} style={{display:"flex", alignItems:"center", gap:10, padding:"6px 0"}}>
                <SubjectBadge subject={w.subject} size={32}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:13.5, gap:8}}><span style={{fontWeight:650, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{w.chapter}</span><span className="num" style={{fontSize:13}}>{w.pct}%</span></div>
                  <div style={{height:6, background:"var(--border)", borderRadius:4, overflow:"hidden", marginTop:4}}><div className="bar-grow" style={{width:`${Math.max(3, w.pct)}%`, height:"100%", borderRadius:4, background: w.pct>=75 ? "var(--correct)" : w.pct>=50 ? "#d9a441" : "var(--wrong)"}}/></div>
                </div>
                <button className="btn btn-sm" title={`Practise ${w.chapter}`} onClick={()=>onPracticeChapter(w.subject, w.chapter)}>Practise</button>
              </div>
            ))}
          </div>

          <div className="card home-card">
            <div className="home-eyebrow"><Icon name="medal" size={14}/> Milestones <span style={{marginLeft:"auto", fontWeight:700, color:"var(--text-dim)"}}>{marks.filter(m=>m.done).length}/{marks.length}</span></div>
            <div className="milestones">
              {marks.map(m=>(
                <div key={m.id} className={"mile"+(m.done ? " done" : "")} title={m.done ? "Earned" : `${m.value} of ${m.target}`}>
                  <span className="mile-ico"><Icon name={m.icon} size={18}/></span>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12.5, fontWeight:700, lineHeight:1.25}}>{m.title}</div>
                    {m.done ? <div style={{fontSize:11, color:"var(--correct)", fontWeight:700}}>Earned</div>
                      : <div style={{height:4, background:"var(--border)", borderRadius:3, overflow:"hidden", marginTop:5}}><div className="bar-grow" style={{width:`${m.value / m.target * 100}%`, height:"100%", background:"var(--brand)"}}/></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
