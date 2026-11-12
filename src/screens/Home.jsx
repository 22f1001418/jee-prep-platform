import React, {useMemo} from "react";
import {ExamCountdown} from "../components/ExamCountdown";
import {Icon} from "../components/icons";
import {activityDays, currentStreak, greeting, weekStrip} from "../lib/activity";
import {bookSummary, fmtShortDate} from "../lib/mistakes";
import {PAPER_REGISTRY} from "../lib/papers";
import {loadHistory} from "../lib/persistence";
import {answeredCount, attemptStats, chapterKey, loadSession} from "../lib/practice";
import {BarRow} from "../components/Charts";
import {loadProfile} from "./ProfileScreen";

const SUBJECT_COLOR = {Mathematics:"#3f7cc4", Physics:"#e08a2c", Chemistry:"#2e9e5b"};

// Home: what to do next, how you are doing, and where you are weakest.
export function Home({hasActive, onNavigate, onResumeTest, onStartPaper, onPracticeChapter, onResumePractice}){
  const profile = loadProfile();
  const book = bookSummary();
  const history = useMemo(()=>loadHistory(), []);               // newest first
  const stats = useMemo(()=>attemptStats(), []);
  const days = useMemo(()=>activityDays(), []);
  const {streak, doneToday} = currentStreak(days);
  const week = weekStrip(days);
  const practice = loadSession();
  const practiceOpen = practice && !practice.finished ? practice : null;

  const attempted = new Set(history.map(h=>h.snapshot && h.snapshot.paperId));
  const nextPaper = PAPER_REGISTRY.find(p=>!attempted.has(p.id));          // newest paper you have not tried
  const weak = [...stats.byChapter.entries()]
    .map(([k, v])=>({subject:k.split("|")[0], chapter:k.split("|").slice(1).join("|"), att:v.att, pct:Math.round(v.cor / v.att * 100)}))
    .filter(x=>x.att>=3).sort((a, b)=>a.pct - b.pct || b.att - a.att).slice(0, 5);
  const recent = history.slice(0, 5);
  const trend = history.slice(0, 8).reverse();
  const maxScore = Math.max(1, ...trend.map(h=>h.maxScore || 300));
  const first = (profile && profile.name || "").trim().split(/\s+/)[0];

  return (
    <div style={{maxWidth:1000, margin:"0 auto", padding:"24px 20px 60px"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap", marginBottom:20}}>
        <div>
          <h1 style={{margin:"0 0 4px", fontSize:26, fontWeight:800}}>{greeting()}{first ? `, ${first}` : ""}</h1>
          <p style={{margin:0, color:"var(--text-dim)", fontSize:14.5}}>
            {book.due>0 ? `${book.due} question${book.due===1 ? "" : "s"} to revise today.` : history.length===0 ? "Take your first mock test to get started." : "You are all caught up on revision."}
          </p>
        </div>
        <ExamCountdown/>
      </div>

      <div className="home-grid" style={{marginBottom:14}}>
        <div className="card home-card" style={{borderTop:"3px solid var(--wrong)"}}>
          <div className="home-eyebrow">Revise</div>
          {book.total===0 ? (
            <div style={{fontSize:14, color:"var(--text-dim)", lineHeight:1.5}}>Wrong answers from your tests and practice land in the Mistake Book and come back on a schedule.</div>
          ) : (
            <div>
              <div style={{fontSize:30, fontWeight:800, color: book.due>0 ? "var(--wrong)" : "var(--correct)"}}>{book.due}<span style={{fontSize:14, fontWeight:600, color:"var(--text-dim)"}}> due today</span></div>
              <div style={{fontSize:12.5, color:"var(--text-faint)"}}>{book.active} still learning · {book.mastered} mastered{book.due===0 && book.nextDue ? ` · next ${fmtShortDate(book.nextDue)}` : ""}</div>
            </div>
          )}
          <button className={book.due>0 ? "btn btn-primary" : "btn"} style={{marginTop:"auto", alignSelf:"flex-start"}} onClick={()=>onNavigate("mistakes")}>{book.due>0 ? "Start revision" : "Open Mistake Book"}</button>
        </div>

        <div className="card home-card" style={{borderTop:"3px solid var(--answered)"}}>
          <div className="home-eyebrow">Next up</div>
          {hasActive ? (<>
            <div style={{fontSize:15, fontWeight:700}}>Mock test in progress</div>
            <div style={{fontSize:13, color:"var(--text-dim)"}}>Pick up where you stopped.</div>
            <button className="btn btn-save" style={{marginTop:"auto", alignSelf:"flex-start"}} onClick={onResumeTest}>Resume test</button>
          </>) : practiceOpen ? (<>
            <div style={{fontSize:15, fontWeight:700}}>Practice in progress</div>
            <div style={{fontSize:13, color:"var(--text-dim)"}}>{answeredCount(practiceOpen)} of {practiceOpen.keys.length} answered.</div>
            <button className="btn btn-save" style={{marginTop:"auto", alignSelf:"flex-start"}} onClick={onResumePractice}>Resume practice</button>
          </>) : nextPaper ? (<>
            <div style={{fontSize:15, fontWeight:700}}>{nextPaper.name}</div>
            <div style={{fontSize:13, color:"var(--text-dim)"}}>The newest full paper you have not tried yet.</div>
            <button className="btn btn-primary" style={{marginTop:"auto", alignSelf:"flex-start"}} onClick={()=>onStartPaper(nextPaper.id)}>Start mock test</button>
          </>) : (<>
            <div style={{fontSize:15, fontWeight:700}}>You have tried every paper.</div>
            <div style={{fontSize:13, color:"var(--text-dim)"}}>Retake one to see how much you have improved.</div>
            <button className="btn" style={{marginTop:"auto", alignSelf:"flex-start"}} onClick={()=>onNavigate("tests")}>Choose a paper</button>
          </>)}
        </div>

        <div className="card home-card" style={{borderTop:"3px solid var(--navy)"}}>
          <div className="home-eyebrow">Practise</div>
          {weak.length>0 ? (<>
            <div style={{fontSize:15, fontWeight:700}}>{weak[0].chapter}</div>
            <div style={{fontSize:13, color:"var(--text-dim)"}}>Your weakest chapter so far: {weak[0].pct}% correct over {weak[0].att} questions.</div>
            <button className="btn btn-primary" style={{marginTop:"auto", alignSelf:"flex-start"}} onClick={()=>onPracticeChapter(weak[0].subject, weak[0].chapter)}>Practise it</button>
          </>) : (<>
            <div style={{fontSize:15, fontWeight:700}}>Build your own set</div>
            <div style={{fontSize:13, color:"var(--text-dim)"}}>Pick chapters, question types and years from all {PAPER_REGISTRY.reduce((n, p)=>n + p.questions.length, 0).toLocaleString()} questions.</div>
            <button className="btn" style={{marginTop:"auto", alignSelf:"flex-start"}} onClick={()=>onNavigate("practice")}>Open Practice</button>
          </>)}
        </div>
      </div>

      <div className="home-grid">
        <div className="card home-card">
          <div className="home-eyebrow">Study streak</div>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <span style={{color: streak>0 ? "#e08a2c" : "var(--text-faint)", display:"inline-flex"}}><Icon name="flame" size={30}/></span>
            <div>
              <div style={{fontSize:26, fontWeight:800, lineHeight:1}}>{streak} day{streak===1 ? "" : "s"}</div>
              <div style={{fontSize:12.5, color:"var(--text-faint)", marginTop:3}}>{doneToday ? "You studied today. Nice." : streak>0 ? "Do something today to keep it alive." : "A test, a practice set or revision counts."}</div>
            </div>
          </div>
          <div style={{display:"flex", gap:6, marginTop:4}} aria-label="Last 7 days">
            {week.map((d, i)=>(
              <div key={i} style={{flex:1, textAlign:"center"}}>
                <div title={d.active ? "Studied" : "No activity"} style={{height:26, borderRadius:6, background: d.active ? "var(--answered)" : "var(--border)", outline: d.today ? "2px solid var(--navy)" : "none", outlineOffset:1}}/>
                <div style={{fontSize:11, color:"var(--text-faint)", marginTop:4}}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card home-card" style={{gridColumn:"span 1"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div className="home-eyebrow">Recent tests</div>
            {history.length>0 && <button className="btn" style={{padding:"3px 10px", fontSize:12.5}} onClick={()=>onNavigate("history")}>All</button>}
          </div>
          {history.length===0 ? <div style={{fontSize:14, color:"var(--text-dim)"}}>No tests yet. Your scores and trend will show up here.</div> : (<>
            {trend.length>=2 && (
              <div style={{display:"flex", alignItems:"flex-end", gap:6, height:54}} aria-label="Score trend">
                {trend.map((h, i)=>(
                  <div key={i} title={`${h.testName}: ${h.score}/${h.maxScore}`} style={{flex:1, maxWidth:26, height:`${Math.max(6, Math.max(0, h.score) / maxScore * 52)}px`, borderRadius:"3px 3px 0 0", background: i===trend.length-1 ? "var(--navy)" : "var(--border-dark)"}}/>
                ))}
              </div>
            )}
            <div style={{display:"flex", flexDirection:"column", gap:6}}>
              {recent.map((h, i)=>(
                <div key={i} style={{display:"flex", justifyContent:"space-between", gap:10, fontSize:13.5}}>
                  <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{h.testName}</span>
                  <span className="mono" style={{fontWeight:700, flexShrink:0}}>{h.score}/{h.maxScore}</span>
                </div>
              ))}
            </div>
          </>)}
        </div>

        <div className="card home-card">
          <div className="home-eyebrow">Weakest chapters</div>
          {weak.length===0 ? <div style={{fontSize:14, color:"var(--text-dim)"}}>Once you have answered a few questions in a chapter, your weakest ones show here.</div> : (
            <div>
              {weak.map(w=>(
                <div key={w.subject + w.chapter} style={{display:"flex", alignItems:"flex-end", gap:8}}>
                  <div style={{flex:1, minWidth:0}}><BarRow label={`${w.chapter} · ${w.subject}`} value={w.pct} max={100} color={SUBJECT_COLOR[w.subject]} displayValue={`${w.pct}%`}/></div>
                  <button className="btn" style={{padding:"2px 9px", fontSize:12, marginBottom:12}} onClick={()=>onPracticeChapter(w.subject, w.chapter)}>Practise</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
