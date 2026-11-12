import {DURATION_SEC, LS_HISTORY, LS_KEY, STATUS} from "./constants";
import {deleteNotesForAttempt} from "./notes";
import {showStorageBanner} from "./storageAlerts";
import {store} from "./store";

// ---------- Persistence ----------
export function loadActive(){
  try{ const raw = store.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
// startedAt of the attempt that was just submitted: a timer tick still in flight must not write it back as "in progress"
export let submittedStartedAt = null; export function setSubmittedStartedAt(v){ submittedStartedAt = v; }

export function saveActive(state){
  if(state && state.startedAt!==undefined && state.startedAt===submittedStartedAt) return;
  try{ store.setItem(LS_KEY, JSON.stringify(state)); }
  catch(e){ showStorageBanner("Your test progress could NOT be saved: browser storage is full. Your answers are still on screen. Submit the test, then free space in Test History / All Notes."); }
}
// A saved exam only counts as "in progress" — worth offering to resume,
// or worth warning before discarding — once the person has actually
// looked at or answered something. A state written the instant "Start
// Demo Test" was clicked, with every question still untouched, is not
// meaningfully different from no saved state at all.
export function hasMeaningfulProgress(state){
  if(!state || state.phase !== "exam") return false;
  return Object.values(state.perQ).some(r => r.status !== STATUS.NOT_VISITED);
}
export function clearActive(){
  try{ store.removeItem(LS_KEY); }catch(e){}
}
export function loadHistory(){
  try{ const raw = store.getItem(LS_HISTORY); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
}
export const HISTORY_CAP = 100; // most recent attempts kept in Test History
// Returns {saved, evicted}. saved=false means the browser refused the write
// (storage full), so the caller must tell the person instead of failing silently.
export function pushHistory(entry){
  const h = loadHistory();
  h.unshift(entry);
  const kept = h.slice(0,HISTORY_CAP);
  const evicted = h.slice(HISTORY_CAP); // entries the cap pushes out also lose their notes, same as an explicit delete
  const dropNotes = ()=>evicted.forEach(ev=>{
    if(ev.snapshot && ev.snapshot.paperId && ev.snapshot.startedAt){
      deleteNotesForAttempt(`${ev.snapshot.paperId}:${ev.snapshot.startedAt}`);
    }
  });
  let saved = false;
  try{ store.setItem(LS_HISTORY, JSON.stringify(kept)); saved = true; }catch(e){}
  if(!saved && evicted.length){
    // freeing the notes of the entries being pushed out may make room; retry once
    dropNotes();
    try{ store.setItem(LS_HISTORY, JSON.stringify(kept)); saved = true; }catch(e){}
    return {saved, evicted: saved ? evicted.length : 0};
  }
  if(saved) dropNotes();
  return {saved, evicted: saved ? evicted.length : 0};
}
export function deleteHistoryEntry(index){
  const h = loadHistory();
  h.splice(index, 1);
  try{ store.setItem(LS_HISTORY, JSON.stringify(h)); }catch(e){}
  return h;
}
export function deleteHistoryEntries(indices){
  const drop = new Set(indices);
  const h = loadHistory().filter((_, i)=>!drop.has(i));
  try{ store.setItem(LS_HISTORY, JSON.stringify(h)); }catch(e){}
  return h;
}
export function clearAllHistory(){
  try{ store.removeItem(LS_HISTORY); }catch(e){}
}

export function makeInitialExamState(paper){
  const perQ = {};
  paper.questions.forEach(q=>{
    perQ[q.n] = {
      status: STATUS.NOT_VISITED,
      response: null,       // option id or numeric string
      timeSpent: 0,         // seconds
      openedAt: null,
      lastOpenedAt: null,
      errorTag: null,
    };
  });
  return {
    paperId: paper.id,
    testName: paper.name,
    startedAt: Date.now(),
    remaining: DURATION_SEC,
    currentQ: paper.questions[0].n,
    currentSubject: paper.questions[0].subject,
    perQ,
    phase: "exam", // exam | submitted
  };
}

