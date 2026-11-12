import React, {useEffect, useRef, useState} from "react";
import {ExitModal, MAX_EXITS, OverwriteModal, SubmitModal} from "./components/Modals";
import {getSavedTheme} from "./components/ThemeToggle";
import {FullscreenLostOverlay, enterExamFullscreen, leaveExamFullscreen} from "./lib/fullscreen";
import {addMistakes} from "./lib/mistakes";
import {clearScratch} from "./lib/scratch";
import {LS_SELECTED_PAPER, PaperContext, getPaper, getSelectedPaperId, paperMissing} from "./lib/papers";
import {HISTORY_CAP, clearActive, hasMeaningfulProgress, loadActive, makeInitialExamState, pushHistory, saveActive, setSubmittedStartedAt} from "./lib/persistence";
import {rescoreHistory, scoreExam} from "./lib/scoring";
import {store} from "./lib/store";
import {AllNotesScreen} from "./screens/AllNotes";
import {AnalysisPage} from "./screens/AnalysisPage";
import {ConfigScreen} from "./screens/ConfigScreen";
import {ExamInterface} from "./screens/ExamInterface";
import {HistoryScreen} from "./screens/History";
import {AppShell} from "./components/AppShell";
import {CommandPalette} from "./components/CommandPalette";
import {usePointerGlow} from "./components/motion";
import {toggleTheme} from "./components/ThemeToggle";
import {PracticeSession} from "./screens/PracticeSession";
import {PracticeSetup} from "./screens/PracticeSetup";
import {chapterKey, saveSession} from "./lib/practice";
import {Home} from "./screens/Home";
import {MistakeBook} from "./screens/MistakeBook";
import {PreviewScreen} from "./screens/PreviewScreen";
import {ProfileScreen, needsProfile} from "./screens/ProfileScreen";
import {ResultsDashboard} from "./screens/ResultsDashboard";
import {ReviewSection} from "./screens/ReviewSection";
import {StarredQuestionsScreen} from "./screens/StarredQuestions";
import {Tests} from "./screens/Tests";

// Browsing screens live at a URL hash (#/home, #/tests ...) so the browser Back button and reloads behave; the exam flow is state only.
const ROUTE_OF = {home:"home", tests:"tests", practice:"practice", mistakes:"mistakes", history:"history", allnotes:"notes", starredq:"starred"};
const SCREEN_OF = Object.fromEntries(Object.entries(ROUTE_OF).map(([s, r])=>[r, s]));
const screenFromHash = ()=>SCREEN_OF[(window.location.hash || "").replace(/^#\/?/, "")] || null;
// Focused flows (preview, exam, results ...) get a hash of their own too ("#/~results"), so the browser Back button steps
// back through them instead of leaving the app. They cannot be opened from a cold URL: a reload lands on Home.
const FLOW_ALIAS = {exitmodal:"exam", submitmodal:"exam"};
const hashFor = s => "/" + (ROUTE_OF[s] || "~" + (FLOW_ALIAS[s] || s));
const flowFromHash = ()=>{ const m = /^#\/~([a-z]+)$/.exec(window.location.hash || ""); return m ? m[1] : null; };
const isExamScreen = s => s==="exam" || s==="exitmodal" || s==="submitmodal";

export function App(){
  const [screen, setScreen] = useState(()=>screenFromHash() || "home"); // home|tests|practice|mistakes|history|allnotes|starredq|preview|config|exam|submitmodal|results|analysis|review|...
  const [practiceInitial, setPracticeInitial] = useState(null);
  const screenRef = useRef(screen); screenRef.current = screen;
  const [examState, setExamState] = useState(null);
  const [result, setResult] = useState(null);
  const [reviewKind, setReviewKind] = useState("wrong");
  const [historySource, setHistorySource] = useState(null); // when viewing a past test's analysis
  const [overwriteWarning, setOverwriteWarning] = useState(false);
  const [selectedPaperId, setSelectedPaperIdState] = useState(getSelectedPaperId());
  const examStateRef = useRef(null); examStateRef.current = examState;   // always the latest exam state (for submission)
  const submittedKeyRef = useRef(null);                                  // startedAt of the attempt already submitted
  const resultRef = useRef(null); resultRef.current = result;
  usePointerGlow();
  // Quick search: Ctrl/Cmd + K (or "/" when not typing), on the browsing screens only, never during a test.
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(()=>{
    const onKey = e=>{
      if(!ROUTE_OF[screenRef.current]) return;
      const typing = e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable);
      if((e.key==="k" || e.key==="K") && (e.metaKey || e.ctrlKey)){ e.preventDefault(); setSearchOpen(o=>!o); }
      else if(e.key==="/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey){ e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(()=>{ if(!ROUTE_OF[screen]) setSearchOpen(false); }, [screen]);
  const firstHash = useRef(true);

  // screen -> URL hash. The very first one replaces the entry (no extra Back step); later ones add history entries.
  useEffect(()=>{
    const want = "#" + hashFor(screen);
    if(window.location.hash !== want){
      if(firstHash.current){ try{ window.history.replaceState(null, "", want); }catch(e){ window.location.hash = want.slice(1); } }
      else window.location.hash = want.slice(1);
    }
    firstHash.current = false;
    window.scrollTo(0, 0);   // every screen opens at the top (results -> analysis -> review used to keep the old scroll position)
  }, [screen]);
  // URL hash -> screen (Back / Forward / a typed address).
  useEffect(()=>{
    const onHash = ()=>{
      const cur = screenRef.current;
      if(window.location.hash === "#" + hashFor(cur)) return;
      // Back during a running test never leaves it silently: stay on the test and ask, like the Exit button.
      if(isExamScreen(cur)){ window.location.hash = hashFor(cur); if(cur==="exam") setScreen("exitmodal"); return; }
      const route = screenFromHash();
      if(route){ setPracticeInitial(null); setScreen(route); return; }
      const flow = flowFromHash(), st = examStateRef.current;
      const ok = flow && (
        (["results","analysis","review"].includes(flow) && st && resultRef.current) ||
        (["preview","config"].includes(flow) && st && st.phase==="exam" && !hasMeaningfulProgress(st)) ||
        flow==="practicerun" || flow==="editprofile");
      if(ok) setScreen(flow); else window.location.hash = hashFor(cur);   // e.g. Back from results into the finished exam: stay put
    };
    window.addEventListener("hashchange", onHash);
    return ()=>window.removeEventListener("hashchange", onHash);
  }, []);

  // Exam window (and its modals) always stays light; other screens follow the saved theme.
  useEffect(()=>{
    if(screen==="exam" || screen==="exitmodal" || screen==="submitmodal"){
      document.documentElement.setAttribute("data-theme","light");
    } else {
      document.documentElement.setAttribute("data-theme", getSavedTheme());
    }
  }, [screen]);

  // Leave fullscreen as soon as we are no longer on the exam screen
  // (Exit confirmed, Submit confirmed, auto-submit, etc.).
  useEffect(()=>{
    if(!(screen==="exam" || screen==="exitmodal" || screen==="submitmodal")){
      leaveExamFullscreen();
    }
  }, [screen]);

  // Full screen must stay on while the exam runs: leaving it (other than via Exit / Submit) covers the exam until it is restored.
  const inExam = screen==="exam" || screen==="exitmodal" || screen==="submitmodal";
  const [fsLost, setFsLost] = useState(false);
  useEffect(()=>{
    if(!inExam){ setFsLost(false); return; }
    const onChange = ()=>setFsLost(!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return ()=>document.removeEventListener("fullscreenchange", onChange);
  }, [inExam]);
  const fsOverlay = (inExam && fsLost) ? <FullscreenLostOverlay/> : null;

  const hasActive = hasMeaningfulProgress(loadActive());

  function choosePaper(id){
    try{ store.setItem(LS_SELECTED_PAPER, id); }catch(e){}
    setSelectedPaperIdState(id);
  }

  function startDemo(){
    // starting a fresh attempt while one is already in progress would
    // silently overwrite it, so confirm first instead of just clobbering it.
    if(hasActive){
      setOverwriteWarning(true);
      return;
    }
    actuallyStartDemo();
  }
  // Start a specific paper from the Mock Tests list (or the home dashboard).
  function startPaper(id){
    choosePaper(id);
    if(hasActive){ setOverwriteWarning(true); return; }
    actuallyStartDemo(id);
  }
  function navigate(id){ setPracticeInitial(null); setScreen(id); }
  function practiceChapter(subject, chapter){
    setPracticeInitial({pool:"all", subjects:[subject], chapters:[chapterKey(subject, chapter)], type:"all", years:[]});
    setScreen("practice");
  }
  function actuallyStartDemo(idArg){
    const startId = typeof idArg==="string" ? idArg : selectedPaperId;
    if(needsProfile()){
      // very first test: ask for the candidate's name (and optional photo) once
      setOverwriteWarning(false);
      setScreen("profile");
      return;
    }
    const fresh = makeInitialExamState(getPaper(startId));
    setExamState(fresh);
    saveActive(fresh);
    setOverwriteWarning(false);
    setScreen("preview");
  }
  function resumeActive(){
    const saved = loadActive();
    if(saved && paperMissing(saved.paperId)){
      alert("The paper for your unfinished test (" + saved.paperId + ") is not in this version of the file, so it cannot be resumed. Open the file that contains this paper to continue it.");
      return;
    }
    if(saved){
      if(saved.paperId) choosePaper(saved.paperId);
      // The clock stops while you are away. Leaving through the Exit button marks the save as a clean exit (and uses one
      // of the exits there); a test left any other way (tab closed, page reloaded) uses one now, so reloading is not a free pause.
      let next = saved;
      if(saved.phase==="exam"){
        const used = saved.exitCount || 0;
        next = {...saved, exited:false, exitCount: saved.exited ? used : Math.min(MAX_EXITS, used + 1)};
        saveActive(next);
      }
      setExamState(next);
      if(next.phase==="exam") enterExamFullscreen();
      setScreen(next.phase==="exam" ? "exam" : "home");
    }
  }
  function beginExam(){
    enterExamFullscreen();
    setScreen("exam");
  }
  function requestSubmit(){
    setScreen("submitmodal");
  }
  function cancelSubmit(){
    setScreen("exam");
  }
  function confirmSubmit(){
    finalizeSubmission();
  }
  // Submission runs once per attempt, outside any state updater: it reads the latest exam state from a ref,
  // scores it, saves it to Test History and only then updates the screen state.
  function finalizeSubmission(){
    const prev = examStateRef.current;
    if(!prev || !prev.perQ || prev.phase==="submitted" || submittedKeyRef.current===prev.startedAt) return;
    const finished = {...prev, phase:"submitted"};
    let res;
    try{ res = scoreExam(finished); }
    catch(err){ window.alert("Could not score this attempt: " + (err && err.message ? err.message : err)); return; }
    submittedKeyRef.current = prev.startedAt;
    setSubmittedStartedAt(prev.startedAt);
    const hres = pushHistory({
      testName: finished.testName,
      date: new Date().toLocaleString(),
      score: res.totalScore, maxScore: res.maxScore, accuracy: res.accuracy,
      snapshot: finished,
    });
    if(!hres.saved){
      setTimeout(()=>alert("Your result could NOT be saved to Test History because the browser storage is full. The result is still shown on this screen. To free space, delete old attempts in Test History or old notes (with images) in All Notes. Later attempts will save normally once there is room."), 0);
    } else if(hres.evicted>0){
      setTimeout(()=>alert("Test History keeps your latest " + HISTORY_CAP + " attempts. The oldest attempt" + (hres.evicted>1 ? "s (" + hres.evicted + ")" : "") + " and the notes attached to " + (hres.evicted>1 ? "them were" : "it was") + " removed."), 0);
    }
    // every wrong answer goes into the Mistake Book automatically (untagged); the person tags the cause from the review screen
    if(hres.saved){ try{ addMistakes(finished, res.perQuestionResults.filter(r=>r.result==="wrong")); }catch(err){ console.error("Mistake Book:", err); } }
    clearActive();
    clearScratch();
    setResult(res);
    setExamState(finished);
    setScreen("results");
  }

  // auto-submit when timer hits phase "autosubmit"
  useEffect(()=>{
    if(examState && examState.phase === "autosubmit"){
      finalizeSubmission();
    }
    // eslint-disable-next-line
  }, [examState && examState.phase]);

  // after a key correction: re-score every saved attempt, and refresh the result being viewed
  function refreshAfterKeyChange(){
    rescoreHistory();
    if(examState && examState.perQ) setResult(scoreExam(examState));
  }
  function backHome(){
    setScreen("home");
    setExamState(null);
    setResult(null);
    setHistorySource(null);
  }
  function openHistoryTest(h){
    if(h && h.snapshot && paperMissing(h.snapshot.paperId)){
      alert("This attempt was taken on a paper (" + h.snapshot.paperId + ") that is not in this version of the file, so it cannot be opened. Open the file that contains this paper.");
      return;
    }
    // scoreExam always resolves the right question bank from
    // h.snapshot.paperId itself, so no need to change the selected paper
    // just to view a past result.
    setExamState(h.snapshot);
    setResult(scoreExam(h.snapshot));
    setHistorySource(h);
    setScreen("results");
  }
  function retakeSamePaper(){
    if(hasActive){
      setOverwriteWarning(true);
      return;
    }
    const paperId = (examState && examState.paperId) || selectedPaperId;
    if(paperId !== selectedPaperId) choosePaper(paperId);
    const fresh = makeInitialExamState(getPaper(paperId));
    setExamState(fresh);
    setResult(null);
    setHistorySource(null);
    saveActive(fresh);
    setScreen("preview");
  }
  function requestExit(){
    setScreen("exitmodal");
  }
  function cancelExit(){
    setScreen("exam");
  }
  function confirmExit(){
    const used = (examState && examState.exitCount) || 0;
    if(used >= MAX_EXITS){
      // exit limit used up: this exit submits the exam
      finalizeSubmission();
      return;
    }
    // progress is already persisted to store on every tick/update;
    // just record this exit and leave the exam screen.
    saveActive({...examState, exitCount: used + 1, exited:true});
    setScreen("home");
    setExamState(null);
    setResult(null);
  }

  // The exam itself must always use the paper it was actually started on
  // (examState.paperId), which may differ from whatever is currently
  // selected on the landing screen if the person navigated back and forth.
  // Falls back to the landing selection only when there's no exam yet.
  const examPaper = getPaper((examState && examState.paperId) || selectedPaperId);

  // Browsing screens share the navigation shell; focused flows (exam, results, practice run ...) do not.
  const searchActions = [
    {id:"home", icon:"home", title:"Home", run:()=>navigate("home")},
    {id:"practice", icon:"practice", title:"Practice", words:"custom set chapters", run:()=>navigate("practice")},
    {id:"mistakes", icon:"mistakes", title:"Mistake Book", words:"revise revision wrong", run:()=>navigate("mistakes")},
    {id:"tests", icon:"tests", title:"Mock Tests", words:"papers exam", run:()=>navigate("tests")},
    {id:"history", icon:"history", title:"History", words:"past attempts results backup", run:()=>navigate("history")},
    {id:"allnotes", icon:"notes", title:"Notes", run:()=>navigate("allnotes")},
    {id:"starredq", icon:"star", title:"Starred questions", run:()=>setScreen("starredq")},
    ...(hasActive ? [{id:"resume", icon:"play", title:"Resume your test", words:"continue", run:resumeActive}] : []),
    {id:"theme", icon:"moon", title:"Switch light / dark mode", words:"theme night", run:()=>toggleTheme()},
    {id:"profile", icon:"pencil", title:"Edit profile", words:"name photo", run:()=>setScreen("editprofile")},
  ];
  const shellWrap = content => (
    <PaperContext.Provider value={getPaper(selectedPaperId)}>
      <AppShell screen={screen} onNavigate={navigate} onEditProfile={()=>setScreen("editprofile")} onOpenSearch={()=>setSearchOpen(true)}>{content}</AppShell>
      {searchOpen && !overwriteWarning && <CommandPalette onClose={()=>setSearchOpen(false)} actions={searchActions} onStartPaper={startPaper} onPracticeChapter={practiceChapter}/>}
      {overwriteWarning && (
        <OverwriteModal
          onCancel={()=>setOverwriteWarning(false)}
          onDiscardAndStart={actuallyStartDemo}
          onResumeInstead={()=>{setOverwriteWarning(false); resumeActive();}}
        />
      )}
    </PaperContext.Provider>
  );
  if(screen==="home") return shellWrap(
    <Home hasActive={hasActive} onNavigate={navigate} onResumeTest={resumeActive} onStartPaper={startPaper} onEditProfile={()=>setScreen("editprofile")} onOpenSearch={()=>setSearchOpen(true)}
      onPracticeChapter={practiceChapter} onResumePractice={()=>setScreen("practicerun")}/>
  );
  if(screen==="tests") return shellWrap(<Tests onStartPaper={startPaper} onResume={resumeActive} hasActive={hasActive}/>);
  if(screen==="profile") return <ProfileScreen onSave={actuallyStartDemo} onBack={backHome}/>;
  if(screen==="editprofile") return <ProfileScreen edit onSave={backHome} onBack={backHome}/>;
  if(screen==="history") return shellWrap(<HistoryScreen onBack={backHome} onOpenTest={openHistoryTest}/>);
  if(screen==="practice") return shellWrap(
    <PracticeSetup key={JSON.stringify(practiceInitial)} initial={practiceInitial} onBack={backHome} onStart={s=>{ saveSession(s); setScreen("practicerun"); }}
      onResume={()=>setScreen("practicerun")} onOpenResults={()=>setScreen("practicerun")} onOpenMistakes={()=>setScreen("mistakes")}/>
  );
  if(screen==="practicerun") return <PracticeSession onExit={()=>setScreen("practice")} onSetup={()=>setScreen("practice")} onOpenMistakes={()=>setScreen("mistakes")}/>;
  if(screen==="mistakes") return shellWrap(<MistakeBook onBack={()=>setScreen(examState && result ? "results" : "home")}/>);
  if(screen==="allnotes") return shellWrap(<AllNotesScreen onBack={backHome} onViewStarredQ={()=>setScreen("starredq")}/>);
  if(screen==="starredq") return shellWrap(<StarredQuestionsScreen onBack={()=>setScreen("allnotes")}/>);
  if(screen==="preview") return (
    <PaperContext.Provider value={examPaper}>
      <PreviewScreen onStart={()=>setScreen("config")} onBack={backHome}/>
    </PaperContext.Provider>
  );
  if(screen==="config") return (
    <PaperContext.Provider value={examPaper}>
      <ConfigScreen onBegin={beginExam} onBack={()=>setScreen("preview")}/>
    </PaperContext.Provider>
  );

  if(screen==="exam" && examState) return (
    <PaperContext.Provider value={examPaper}>
      <ExamInterface state={examState} setState={setExamState} onSubmitRequest={requestSubmit} onExitRequest={requestExit} modalOpen={!!fsOverlay}/>
      {fsOverlay}
    </PaperContext.Provider>
  );

  if(screen==="exitmodal" && examState) return (
    <PaperContext.Provider value={examPaper}>
      <ExamInterface state={examState} setState={setExamState} onSubmitRequest={requestSubmit} onExitRequest={requestExit} modalOpen/>
      {fsOverlay}
      <ExitModal onCancel={cancelExit} onConfirm={confirmExit} used={(examState && examState.exitCount) || 0}/>
    </PaperContext.Provider>
  );

  if(screen==="submitmodal" && examState) return (
    <PaperContext.Provider value={examPaper}>
      <ExamInterface state={examState} setState={setExamState} onSubmitRequest={requestSubmit} onExitRequest={requestExit} modalOpen/>
      {fsOverlay}
      <SubmitModal state={examState} onCancel={cancelSubmit} onConfirm={confirmSubmit}/>
    </PaperContext.Provider>
  );

  if(screen==="results" && examState && result) return (
    <React.Fragment>
      <ResultsDashboard state={examState} result={result}
        onViewAnalysis={()=>setScreen("analysis")}
        onReviewWrong={()=>{setReviewKind("wrong"); setScreen("review");}}
        onOpenMistakes={()=>setScreen("mistakes")}
        onBackHome={backHome}
        onRetake={retakeSamePaper}/>
      {overwriteWarning && (
        <OverwriteModal
          onCancel={()=>setOverwriteWarning(false)}
          onDiscardAndStart={()=>{
            const paperId = (examState && examState.paperId) || selectedPaperId;
            if(paperId !== selectedPaperId) choosePaper(paperId);
            const fresh = makeInitialExamState(getPaper(paperId));
            setExamState(fresh); setResult(null); setHistorySource(null);
            saveActive(fresh); setOverwriteWarning(false); setScreen("preview");
          }}
          onResumeInstead={()=>{setOverwriteWarning(false); resumeActive();}}
        />
      )}
    </React.Fragment>
  );

  if(screen==="analysis" && examState && result) return (
    <AnalysisPage state={examState} result={result} onKeyChanged={refreshAfterKeyChange} onBack={()=>setScreen("results")}
      onReviewWrong={()=>{setReviewKind("wrong"); setScreen("review");}}/>
  );

  if(screen==="review" && examState && result) return (
    <ReviewSection state={examState} result={result} kind={reviewKind} onBack={()=>setScreen(historySource?"results":"results")}/>
  );

  return <div style={{padding:40}}>Loading…</div>;
}





