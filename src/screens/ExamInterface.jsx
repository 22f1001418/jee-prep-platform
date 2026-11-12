import React, {useEffect, useRef, useState} from "react";
import {DiagramSVG} from "../components/DiagramSVG";
import {ScratchPad} from "../components/ScratchPad";
import {InfoDot, Legend, PaletteBtn} from "../components/Palette";
import {TeX} from "../components/TeX";
import {DURATION_SEC, MARKS_CORRECT, MARKS_WRONG, STATUS, SUBJECTS, fmtMinSec, fmtTimeMin} from "../lib/constants";
import {loadExamPrefs, saveExamPrefs} from "../lib/scratch";
import {numAttemptLimit, numWrongMarks, usePaper} from "../lib/papers";
import {saveActive} from "../lib/persistence";
import {cleanNumInput, loadProfile, loadStarQ, toggleStarQ} from "./ProfileScreen";

export function ExamInterface({state, setState, onSubmitRequest, onExitRequest, modalOpen}){
  const paper = usePaper();
  const RAW_QUESTIONS = paper.questions;
  const perQ = state.perQ;
  const current = state.currentQ;
  const currentQObj = RAW_QUESTIONS.find(q=>q.n===current);
  const subjQuestions = RAW_QUESTIONS.filter(q=>q.subject===state.currentSubject);
  // Papers where only some numericals may be answered (e.g. any 5 of 10 per subject)
  const numLimit = numAttemptLimit(paper);
  const answeredNumOthers = numLimit==null ? 0 : subjQuestions.filter(q=>q.type==="NUM" && q.n!==current &&
    (perQ[q.n].status===STATUS.ANSWERED || perQ[q.n].status===STATUS.ANSWERED_MARKED)).length;
  const numLocked = !!currentQObj && currentQObj.type==="NUM" && numLimit!=null && answeredNumOthers>=numLimit;
  const [numInput, setNumInput] = useState(perQ[current].response || "");
  const [profile] = useState(()=>loadProfile());
  const [starList, setStarList] = useState(()=>loadStarQ());
  const isStarred = starList.some(x=>x.paperId===paper.id && x.n===current);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [paceHints, setPaceHints] = useState(()=>loadExamPrefs().paceHints);
  const [textScale, setTextScale] = useState(1.1); // A-/A+ control, 0.8x–1.6x (default 1.1x = 15.4px question/option text)
  const tickRef = useRef(null);
  const lastTickTime = useRef(Date.now());

  // mark visited + track open time whenever current question changes
  useEffect(()=>{
    setState(prev=>{
      const pq = {...prev.perQ};
      const rec = {...pq[prev.currentQ]};
      if(rec.status === STATUS.NOT_VISITED) rec.status = STATUS.NOT_ANSWERED;
      rec.lastOpenedAt = Date.now();
      if(!rec.openedAt) rec.openedAt = Date.now();
      pq[prev.currentQ] = rec;
      return {...prev, perQ: pq};
    });
    setNumInput(perQ[current].response || "");
    // eslint-disable-next-line
  }, [current]);

  // timer tick (also accrues time-on-question)
  useEffect(()=>{
    lastTickTime.current = Date.now();
    tickRef.current = setInterval(()=>{
      const now = Date.now();
      const delta = (now - lastTickTime.current)/1000;
      lastTickTime.current = now;
      setState(prev=>{
        if(prev.phase !== "exam") return prev;
        const remaining = Math.max(0, prev.remaining - delta);
        const pq = {...prev.perQ};
        const rec = {...pq[prev.currentQ]};
        rec.timeSpent = (rec.timeSpent||0) + delta;
        pq[prev.currentQ] = rec;
        const next = {...prev, remaining, perQ: pq};
        saveActive(next);
        if(remaining <= 0){
          return {...next, phase:"autosubmit"};
        }
        return next;
      });
    }, 1000);
    return ()=>clearInterval(tickRef.current);
  }, []);

  // keyboard nav — Enter saves & advances regardless of whether focus is
  // inside the numeric-answer input or out on the page (clicking an MCQ
  // option doesn't focus a text input), Left/Right still navigate.
  useEffect(()=>{
    function onKey(e){
      if(e.target && e.target.closest && e.target.closest("[data-no-exam-keys]")) return;   // typing in the rough-work panel
      if(modalOpen) return; // a Submit / Exit dialog is open: Enter belongs to the dialog, not to the question behind it
      if(e.key === "Enter"){ e.preventDefault(); saveAndNext(); return; }
      if(e.target && (e.target.tagName === "INPUT" || e.target.tagName==="TEXTAREA")) return;
      if(e.key === "ArrowLeft") goPrev();
      else if(e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [current, numInput, state, modalOpen]);

  function updateRec(qn, patch){
    setState(prev=>{
      const pq = {...prev.perQ};
      pq[qn] = {...pq[qn], ...patch};
      const next = {...prev, perQ: pq};
      saveActive(next);
      return next;
    });
  }

  function selectOption(optId){
    updateRec(current, {response: optId});
  }

  // "Save & Next" always resolves to plain Answered (or Not Answered) —
  // it never carries a prior "marked for review" status forward, because
  // marking is its own deliberate action from the Mark for Review button,
  // not something Save & Next should preserve on your behalf.
  function computeStatusAfterSave(hasResponse){
    return hasResponse ? STATUS.ANSWERED : STATUS.NOT_ANSWERED;
  }

  function goTo(qn){
    setState(prev=>({...prev, currentQ: qn, currentSubject: RAW_QUESTIONS.find(q=>q.n===qn).subject}));
  }
  function goNext(){
    const idx = subjQuestions.findIndex(q=>q.n===current);
    if(idx < subjQuestions.length-1) goTo(subjQuestions[idx+1].n);
    else {
      // move to next subject's first question if exists
      const si = SUBJECTS.indexOf(state.currentSubject);
      if(si < SUBJECTS.length-1){
        const nextSubj = SUBJECTS[si+1];
        const firstQ = RAW_QUESTIONS.find(q=>q.subject===nextSubj);
        setState(prev=>({...prev, currentQ: firstQ.n, currentSubject: nextSubj}));
      }
    }
  }
  function goPrev(){
    const idx = subjQuestions.findIndex(q=>q.n===current);
    if(idx > 0) goTo(subjQuestions[idx-1].n);
  }

  function saveAndNext(){
    const rec = perQ[current];
    const isNum = currentQObj.type === "NUM";
    const response = isNum ? cleanNumInput(numInput) : rec.response;
    if(isNum && response!==null && numLocked) return; // limit reached: clear another numerical answer first
    if(isNum && response !== rec.response) updateRec(current, {response});
    const hasResponse = response !== null && response !== undefined && response !== "";
    const newStatus = computeStatusAfterSave(hasResponse);
    updateRec(current, {status:newStatus, response});
    goNext();
  }
  function markForReview(){
    const rec = perQ[current];
    const isNum = currentQObj.type === "NUM";
    const response = isNum ? cleanNumInput(numInput) : rec.response;
    if(isNum && response!==null && numLocked) return; // limit reached: clear another numerical answer first
    const hasResponse = response !== null && response !== undefined && response !== "";
    const newStatus = hasResponse ? STATUS.ANSWERED_MARKED : STATUS.MARKED;
    updateRec(current, {status:newStatus, response});
    goNext();
  }
  function clearResponse(){
    const rec = perQ[current];
    const wasMarked = rec.status === STATUS.MARKED || rec.status === STATUS.ANSWERED_MARKED;
    updateRec(current, {response:null, status: wasMarked ? STATUS.MARKED : STATUS.NOT_ANSWERED});
    setNumInput("");
  }

  const subjectProgress = SUBJECTS.map(s=>{
    const qs = RAW_QUESTIONS.filter(q=>q.subject===s);
    const attempted = qs.filter(q=>{
      const st = perQ[q.n].status;
      return st===STATUS.ANSWERED || st===STATUS.ANSWERED_MARKED;
    }).length;
    return {subject:s, attempted, total:qs.length};
  });

  const totalAttempted = Object.values(perQ).filter(r=>r.status===STATUS.ANSWERED||r.status===STATUS.ANSWERED_MARKED).length;
  const totalMarked = Object.values(perQ).filter(r=>r.status===STATUS.MARKED||r.status===STATUS.ANSWERED_MARKED).length;
  const totalNotAnswered = 75 - totalAttempted;

  const timeLow = state.remaining < 300;
  const qIdxInSubject = subjQuestions.findIndex(q=>q.n===current);

  // ---- presentation-only derived values (no state, no behaviour) ----
  const curType = currentQObj.type;
  const sectionQs = subjQuestions.filter(q=>q.type===curType);
  const sectionName = `${state.currentSubject} ${curType==="NUM" ? "Numerical" : "SCQ"}`;
  const optionalNum = curType==="NUM" && numLimit!=null && sectionQs.length>numLimit;
  const answeredNumInSection = sectionQs.filter(q=>perQ[q.n].status===STATUS.ANSWERED || perQ[q.n].status===STATUS.ANSWERED_MARKED).length;
  const sectionMax = (optionalNum ? numLimit : sectionQs.length) * MARKS_CORRECT;
  const NUM_WORDS = {5:"FIVE", 10:"TEN", 15:"FIFTEEN", 20:"TWENTY", 25:"TWENTY FIVE"};
  const qCountWord = NUM_WORDS[sectionQs.length] || String(sectionQs.length);
  const sectionTabs = [];
  SUBJECTS.forEach(s=>["MCQ","NUM"].forEach(t=>{
    const first = RAW_QUESTIONS.find(q=>q.subject===s && q.type===t);
    if(first) sectionTabs.push({subject:s, type:t, first:first.n, label:`${s} ${t==="NUM" ? "Numerical" : "SCQ"}`});
  }));
  const statusCounts = {};
  sectionQs.forEach(q=>{ const st = perQ[q.n].status; statusCounts[st] = (statusCounts[st]||0)+1; });

  return (
    <div className="cbt-root">
      {/* ===== Top black strip: paper name + (display-only) tool chips ===== */}
      <div className="cbt-topbar">
        <div className="cbt-toptitle">{`JOINT ENTRANCE EXAMINATION (MAIN) - ${(String(state.paperId||"").match(/jee-(\d{4})/)||[])[1] || ""}`.replace(/ - $/,"")}</div>
        <div className="cbt-topchips">
          <button onClick={onExitRequest} className="cbt-exit" title="Exit the test">Exit</button>
        </div>
      </div>

      <div className="cbt-body">
        {/* ================= LEFT: question area ================= */}
        <div className="cbt-main">
          <div className="cbt-paperrow">
            <div className="cbt-paperpill" title={state.testName}>
              <span className="cbt-paperpill-text">{state.testName}</span>
              <InfoDot bg="#fff" color="#2f7fc4" size={14}/>
            </div>
            <span aria-hidden="true" className="cbt-tri">&#9656;</span>
          </div>

          <div className="cbt-sectionsrow">
            <span style={{color:"#555"}}>Sections</span>
            <span>Time Left : <strong className="mono" style={{color: timeLow ? "#d6232a" : "#111", fontSize:13}}>{fmtTimeMin(state.remaining)}</strong></span>
          </div>

          {/* Section tabs: subject × question-type. Each jumps to that section's first question. */}
          <div className="cbt-tabs">
            <span aria-hidden="true" className="cbt-tabarrow">&#9666;</span>
            {sectionTabs.map(tb=>{
              const active = tb.subject===state.currentSubject && tb.type===curType;
              return (
                <button key={tb.label} onClick={()=>goTo(tb.first)} className={"cbt-tab"+(active?" active":"")}>
                  <span>{tb.label}</span>
                  <InfoDot bg={active?"#fff":"#2f7fc4"} color={active?"#1b6ca8":"#fff"} size={14}/>
                </button>
              );
            })}
          </div>

          <div className="cbt-metarow">
            <span>Question Type: <strong>{curType==="NUM" ? "Numerical Value" : "Single Correct"}</strong></span>
            <span>Marks for correct answer: <strong style={{color:"#2e9e3a"}}>{MARKS_CORRECT}</strong> | Negative Marks: <strong style={{color:"#d6232a"}}>{Math.abs(curType==="NUM" ? numWrongMarks(paper) : MARKS_WRONG)}</strong></span>
          </div>

          <div className="cbt-qnoRow">
            <span style={{display:"inline-flex", alignItems:"center"}}>
              <span>Question No. {current}</span>
              <button className={"cbt-star"+(isStarred?" on":"")} onClick={()=>setStarList(toggleStarQ(paper.id, current))}
                aria-pressed={isStarred} title={isStarred ? "Remove star from this question" : "Star this question to revisit later"}>
                {isStarred ? "\u2605 Starred" : "\u2606 Star"}
              </button>
            </span>
            <div style={{display:"inline-flex", alignItems:"center", gap:8, marginLeft:"auto", marginRight:12}}>
              {(()=>{
                const secs = perQ[current].timeSpent || 0, budget = DURATION_SEC / RAW_QUESTIONS.length;
                const level = secs > budget * 2.5 ? 2 : secs > budget * 1.5 ? 1 : 0;
                const color = level===2 ? "#b3261e" : level===1 ? "#9a6700" : "#5b6b7c";
                return (
                  <button type="button" onClick={()=>{ const v = !paceHints; setPaceHints(v); saveExamPrefs({paceHints:v}); }}
                    title={paceHints ? "Time on this question. Click to turn pace hints off." : "Pace hints are off. Click to turn them on."}
                    style={{border:`1px solid ${paceHints && level ? color : "#c9c9c9"}`, background: paceHints && level===2 ? "#fdecea" : paceHints && level===1 ? "#fff6e0" : "#fff", color: paceHints ? color : "#8a97a6",
                      borderRadius:3, padding:"2px 8px", fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}}>
                    {paceHints ? `\u23F1 ${fmtMinSec(secs)} on this question${level===2 ? " \u00B7 consider moving on" : level===1 ? " \u00B7 running long" : ""}` : "\u23F1 pace hints off"}
                  </button>
                );
              })()}
              <button type="button" onClick={()=>setScratchOpen(o=>!o)} aria-pressed={scratchOpen} title="Draw or type rough work for this question"
                style={{border:"1px solid #c9c9c9", background: scratchOpen ? "#0f2a4a" : "#fff", color: scratchOpen ? "#fff" : "#555", borderRadius:3, padding:"2px 8px", fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}}>
                {"\u270E"} Rough work
              </button>
            </div>
            <div className="cbt-fontctl" title="Question text size">
              <button onClick={()=>setTextScale(t=>Math.max(0.8, Number((t-0.1).toFixed(2))))} title="Decrease text size">A⁻</button>
              <span/>
              <button onClick={()=>setTextScale(t=>Math.min(1.6, Number((t+0.1).toFixed(2))))} title="Increase text size">A⁺</button>
            </div>
          </div>

          <div className="cbt-scroll">
            <div className="cbt-qtext" style={{fontSize:`${14*textScale}px`}}>
              <TeX>{currentQObj.text}</TeX>
            </div>
            {currentQObj.svg && (
              <div style={{display:"flex", justifyContent:"center", padding:"8px 0 12px"}}>
                <DiagramSVG id={currentQObj.svg}/>
              </div>
            )}

            {currentQObj.type === "MCQ" ? (
              <div className="cbt-options">
                {currentQObj.options.map(opt=>{
                  const selected = perQ[current].response === opt.id;
                  return (
                    <label key={opt.id} className={"cbt-opt"+(/\\(?:d|t)?frac|\\sqrt|\\begin|\\int|\\sum|\\lim|\\binom|\\overset|\\underset/.test(opt.text)?" tall":"")} onClick={()=>selectOption(opt.id)}>
                      <span className={"cbt-radio"+(selected?" on":"")}>{selected && <span/>}</span>
                      <span style={{fontSize:`${14*textScale}px`, lineHeight:1.5}}><TeX>{opt.text}</TeX></span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div style={{marginTop:6}}>
                <div style={{fontSize:12.5, color:"#444", marginBottom:6}}>Enter your answer:</div>
                <input
                  type="text" inputMode="decimal"
                  value={numInput}
                  onChange={e=>{
                    const v = e.target.value;
                    if(v === "" || /^-?\d*\.?\d*$/.test(v)) setNumInput(v);
                  }}
                                    style={{
                    width:240, fontSize:16, fontWeight:700,
                    background:"#fff", color:"#111",
                    border:"1px solid #8a8a8a", borderRadius:2, padding:"8px 10px",
                  }}
                />
                {numLocked && (
                  <div style={{marginTop:10, fontSize:13, color:"#d6232a", fontWeight:600}}>
                    You have already answered {numLimit} numerical questions in this subject, which is the limit. Clear one of those answers (Clear Response) to answer this question.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="cbt-actions">
            <div className="cbt-actions-left">
              <button onClick={markForReview} className="cbt-btn-white">Mark for Review &amp; Next</button>
              <button onClick={clearResponse} className="cbt-btn-white">Clear Response</button>
              <button onClick={goPrev} disabled={qIdxInSubject===0} className="cbt-btn-white" style={{opacity: qIdxInSubject===0?0.5:1, cursor: qIdxInSubject===0?"not-allowed":"pointer"}}>&#8592; Previous</button>
            </div>
            <button onClick={saveAndNext} className="cbt-btn-blue">Save &amp; Next</button>
          </div>
        </div>

        {/* ================= RIGHT: palette panel ================= */}
        <div className="cbt-side">
          <div className="cbt-side-top">
            <div className="cbt-avatar" aria-label="Candidate photo">
              {profile && profile.photo ? (
                <img src={profile.photo} alt="Candidate" style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}}/>
              ) : (
                <svg viewBox="0 0 64 64" width="100%" height="100%">
                  <rect width="64" height="64" fill="#cfd8e0"/>
                  <circle cx="32" cy="24" r="11" fill="#5b6672"/>
                  <path d="M10 64 Q12 40 32 40 Q52 40 54 64 Z" fill="#5b6672"/>
                </svg>
              )}
            </div>
            <div className="cbt-cand">
              <span className="cbt-cand-k">Candidate Name :</span><span className="cbt-cand-v">{profile ? profile.name : "Candidate"}</span>
              <span className="cbt-cand-k">Exam Name :</span><span className="cbt-cand-v">JEE-Main</span>
              <span className="cbt-cand-k">Subject Name :</span><span className="cbt-cand-v">{state.testName}</span>
            </div>
          </div>
          <div className="cbt-side-scroll">
            <div className="cbt-legend"><Legend counts={statusCounts}/></div>
            <div className="cbt-sectionbar">{sectionName}</div>
            {optionalNum && (
              <div style={{padding:"4px 10px 0", fontSize:12, color:"#333"}}>
                Attempt any {numLimit} of {sectionQs.length} · Answered {answeredNumInSection}/{numLimit}
              </div>
            )}
            <div className="cbt-choose">Choose a Question</div>
            <div className="cbt-grid">
              {sectionQs.map(q=>(
                <PaletteBtn key={q.n} q={q.n} status={perQ[q.n].status} isCurrent={q.n===current}
                  onClick={()=>goTo(q.n)} />
              ))}
            </div>
          </div>
          <div className="cbt-side-bottom">
            <button onClick={onSubmitRequest} className="cbt-btn-blue cbt-submit">Submit</button>
          </div>
        </div>
      </div>
      {scratchOpen && !modalOpen && <ScratchPad examId={state.startedAt} qn={current} onClose={()=>setScratchOpen(false)}/>}
    </div>
  );
}
