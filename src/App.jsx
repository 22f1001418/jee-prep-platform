import React, {useEffect, useRef, useState} from "react";
import {ExitModal, MAX_EXITS, OverwriteModal, SubmitModal} from "./components/Modals";
import {getSavedTheme} from "./components/ThemeToggle";
import {FullscreenLostOverlay, enterExamFullscreen, leaveExamFullscreen} from "./lib/fullscreen";
import {addMistakes} from "./lib/mistakes";
import {LS_SELECTED_PAPER, PaperContext, getPaper, getSelectedPaperId, paperMissing} from "./lib/papers";
import {HISTORY_CAP, clearActive, hasMeaningfulProgress, loadActive, makeInitialExamState, pushHistory, saveActive, setSubmittedStartedAt} from "./lib/persistence";
import {rescoreHistory, scoreExam} from "./lib/scoring";
import {store} from "./lib/store";
import {AllNotesScreen} from "./screens/AllNotes";
import {AnalysisPage} from "./screens/AnalysisPage";
import {ConfigScreen} from "./screens/ConfigScreen";
import {ExamInterface} from "./screens/ExamInterface";
import {HistoryScreen} from "./screens/History";
import {Landing} from "./screens/Landing";
import {MistakeBook} from "./screens/MistakeBook";
import {PreviewScreen} from "./screens/PreviewScreen";
import {ProfileScreen, needsProfile} from "./screens/ProfileScreen";
import {ResultsDashboard} from "./screens/ResultsDashboard";
import {ReviewSection} from "./screens/ReviewSection";
import {StarredQuestionsScreen} from "./screens/StarredQuestions";

export function App(){
  const [screen, setScreen] = useState("landing"); // landing|preview|config|exam|submitmodal|results|analysis|review|history
  const [examState, setExamState] = useState(null);
  const [result, setResult] = useState(null);
  const [reviewKind, setReviewKind] = useState("wrong");
  const [historySource, setHistorySource] = useState(null); // when viewing a past test's analysis
  const [overwriteWarning, setOverwriteWarning] = useState(false);
  const [selectedPaperId, setSelectedPaperIdState] = useState(getSelectedPaperId());
  const examStateRef = useRef(null); examStateRef.current = examState;   // always the latest exam state (for submission)
  const submittedKeyRef = useRef(null);                                  // startedAt of the attempt already submitted

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
  function actuallyStartDemo(){
    if(needsProfile()){
      // very first test: ask for the candidate's name (and optional photo) once
      setOverwriteWarning(false);
      setScreen("profile");
      return;
    }
    const fresh = makeInitialExamState(getPaper(selectedPaperId));
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
      setExamState(saved);
      if(saved.phase==="exam") enterExamFullscreen();
      setScreen(saved.phase==="exam" ? "exam" : "landing");
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
    setScreen("landing");
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
    saveActive({...examState, exitCount: used + 1});
    setScreen("landing");
    setExamState(null);
    setResult(null);
  }

  // The exam itself must always use the paper it was actually started on
  // (examState.paperId), which may differ from whatever is currently
  // selected on the landing screen if the person navigated back and forth.
  // Falls back to the landing selection only when there's no exam yet.
  const examPaper = getPaper((examState && examState.paperId) || selectedPaperId);

  if(screen==="landing") return (
    <PaperContext.Provider value={getPaper(selectedPaperId)}>
      <Landing onDemoStart={startDemo} onResume={resumeActive} hasActive={hasActive} onViewHistory={()=>setScreen("history")}
        onViewAllNotes={()=>setScreen("allnotes")} onViewMistakes={()=>setScreen("mistakes")}
        selectedPaperId={selectedPaperId} onChoosePaper={choosePaper}/>
      {overwriteWarning && (
        <OverwriteModal
          onCancel={()=>setOverwriteWarning(false)}
          onDiscardAndStart={actuallyStartDemo}
          onResumeInstead={()=>{setOverwriteWarning(false); resumeActive();}}
        />
      )}
    </PaperContext.Provider>
  );
  if(screen==="profile") return <ProfileScreen onSave={actuallyStartDemo} onBack={backHome}/>;
  if(screen==="history") return <HistoryScreen onBack={backHome} onOpenTest={openHistoryTest}/>;
  if(screen==="mistakes") return <MistakeBook onBack={()=>setScreen(examState && result ? "results" : "landing")}/>;
  if(screen==="allnotes") return <AllNotesScreen onBack={backHome} onViewStarredQ={()=>setScreen("starredq")}/>;
  if(screen==="starredq") return <StarredQuestionsScreen onBack={()=>setScreen("allnotes")}/>;
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





