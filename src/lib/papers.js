import React from "react";
import {MARKS_WRONG} from "./constants";
import {RAW_PAPERS} from "./data";
import {store} from "./store";

// ---------- Paper registry ----------
// Each entry is a full 75-question bank for one exam paper. Adding a new
// paper later means adding one more {id, name, shortName, questions}
// entry to the embedded JSON — nothing else in the app needs to change.
//
// Papers are sorted newest-first by actual exam date (parsed from each
// paper's id, which follows "jee-2025-{day}{mon}-s{shift}", e.g.
// "jee-2025-22jan-s1"), not by insertion order in the JSON — so a paper
// added later that's actually an earlier exam date still sorts correctly,
// and the most recent exam always appears first in the picker. Same-day
// papers are ordered by shift number (Shift 2 before Shift 1, since
// shift 2 runs later in the day). Any id that doesn't match the pattern
// sorts to the end rather than breaking the sort.
export const MONTH_ORDER = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
export function paperSortKey(p){
  const m = /^jee-(\d{4})-(\d{1,2})([a-z]{3})-s(\d+)$/i.exec(p.id);
  if(!m) return [0,0,0,0]; // unparseable ids sort last (oldest-looking key)
  const [, year, day, mon, shift] = m;
  return [Number(year), MONTH_ORDER[mon.toLowerCase()] || 0, Number(day), Number(shift)];
}
export function sortPapersNewestFirst(papers){
  return [...papers].sort((a, b) => {
    const ka = paperSortKey(a), kb = paperSortKey(b);
    for(let i=0;i<4;i++){ if(ka[i]!==kb[i]) return kb[i]-ka[i]; } // descending = newest first
    return 0;
  });
}
// Papers may number their questions the way the printed paper does (e.g. a paper that
// starts with Physics as Q1). Inside the app every paper is shown Mathematics ->
// Physics -> Chemistry, and inside each subject MCQ first, then Numerical, each in
// the paper's own question-number order. For papers that already follow this
// (Maths Q1-25, Physics Q26-50, Chemistry Q51-75) nothing changes.
export function normalizePaper(p){
  const SO = {Mathematics:0, Physics:1, Chemistry:2}, TO = {MCQ:0, NUM:1};
  const qs = [...p.questions].sort((a,b)=>
    ((SO[a.subject] ?? 9) - (SO[b.subject] ?? 9)) || ((TO[a.type] ?? 9) - (TO[b.type] ?? 9)) || (a.n - b.n));
  // show the exam day always with two digits ("8 Apr Shift 2" -> "08 Apr Shift 2")
  const noZero = t => typeof t === "string" ? t.replace(/(?<![\w])(\d)(?=\s+[A-Za-z]{3,9}\b)/g, "0$1") : t;
  return {...p, name: noZero(p.name), shortName: noZero(p.shortName), questions: qs};
}
export const PAPER_REGISTRY = sortPapersNewestFirst(RAW_PAPERS).map(normalizePaper);
export const LS_SELECTED_PAPER = "jee_cbt_selected_paper_v1";

// ---------- Answer-key corrections (your own fixes to the key, saved in this browser) ----------
// The built-in key can be wrong. A correction is stored per paper + question number and is applied
// on top of the built-in key every time the page loads, so it never edits the paper data itself.
// Changing a key re-scores EVERY saved attempt of that paper (see rescoreHistory).
export const LS_KEY_OVR = "jee_cbt_key_overrides_v1";
export const KEY_ORIG = new Map(); // question object -> its built-in key fields
PAPER_REGISTRY.forEach(p=>p.questions.forEach(q=>{
  KEY_ORIG.set(q, {answer:q.answer, altAnswers:q.altAnswers, range:q.range, bonus:q.bonus});
}));
export function loadKeyOvr(){
  try{ const raw = store.getItem(LS_KEY_OVR); const o = raw ? JSON.parse(raw) : {}; return (o && typeof o==="object" && !Array.isArray(o)) ? o : {}; }catch(e){ return {}; }
}
export function saveKeyOvr(o){
  try{ store.setItem(LS_KEY_OVR, JSON.stringify(o)); return true; }catch(e){ return false; }
}
// Rebuilds every question's live key = built-in key + your corrections.
export function applyKeyOverrides(){
  const o = loadKeyOvr();
  PAPER_REGISTRY.forEach(p=>{
    const po = (o[p.id] && typeof o[p.id]==="object") ? o[p.id] : {};
    p.questions.forEach(q=>{
      const orig = KEY_ORIG.get(q), e = po[q.n];
      q.answer = orig.answer; q.altAnswers = orig.altAnswers; q.range = orig.range; q.bonus = orig.bonus; q.keyEdited = false;
      if(e && typeof e==="object" && !Array.isArray(e)){
        if(e.bonus===true){ q.bonus = true; q.keyEdited = true; }
        else if(e.answer!==undefined && e.answer!==null && String(e.answer)!==""){
          // ignore an entry that cannot be a valid key for this question (damaged storage, renumbered paper)
          const isNum = q.type==="NUM";
          const okId = id => isNum ? (id!=="" && isFinite(Number(id))) : (Array.isArray(q.options) && q.options.some(op=>op.id===String(id)));
          if(okId(e.answer)){
            q.answer = String(e.answer);
            const alt = (!isNum && Array.isArray(e.alt)) ? e.alt.map(String).filter(okId) : [];
            q.altAnswers = alt.length ? alt : undefined;
            q.range = undefined; q.bonus = undefined; q.keyEdited = true;
          }
        }
      }
    });
  });
}
// entry: {answer, alt?:[...]} | {bonus:true} | null (= go back to the built-in key). Returns false if the browser refused the write.
export function setKeyOverride(paperId, n, entry){
  const o = loadKeyOvr();
  if(entry){ o[paperId] = {...(o[paperId]||{}), [n]: entry}; }
  else if(o[paperId]){ delete o[paperId][n]; if(!Object.keys(o[paperId]).length) delete o[paperId]; }
  if(!saveKeyOvr(o)) return false;
  applyKeyOverrides();
  return true;
}
export function resetKeyOverrides(paperId){
  const o = loadKeyOvr(); delete o[paperId];
  if(!saveKeyOvr(o)) return false;
  applyKeyOverrides();
  return true;
}

applyKeyOverrides();
// a correction saved in another tab of this browser takes effect here too (used for the next submission / re-score)
try{ window.addEventListener("storage", ev=>{ if(ev.key===LS_KEY_OVR || ev.key===null){ applyKeyOverrides(); } }); }catch(e){}

export function getPaper(id){
  return PAPER_REGISTRY.find(p=>p.id===id) || PAPER_REGISTRY[0];
}
// True when an id is given but no paper with that id exists in this file
// (e.g. an old attempt/note whose paper is not in this version of the file).
// getPaper() would silently fall back to the newest paper, so callers use
// this to refuse instead of showing/scoring against the wrong paper.
export function paperMissing(id){ return !!id && !PAPER_REGISTRY.some(p=>p.id===id); }
// ---- optional per-paper settings (papers without them behave exactly as before) ----
// paper.format  = {numToAttempt: 5}   older papers show 10 numericals per subject but only 5 may be answered
// Marking is fixed for every paper: +4 / -1 / 0 (numericals included).
export function numAttemptLimit(paper){ const f = paper && paper.format; return f && Number.isFinite(f.numToAttempt) ? f.numToAttempt : null; }
export function numWrongMarks(paper){ return MARKS_WRONG; }
export function getSelectedPaperId(){
  try{
    const saved = store.getItem(LS_SELECTED_PAPER);
    if(saved && PAPER_REGISTRY.find(p=>p.id===saved)) return saved;
  }catch(e){}
  return PAPER_REGISTRY[0].id;
}

// PaperContext supplies the currently-selected paper (landing-page choice)
// to the components that need it — Landing, PreviewScreen, ConfigScreen,
// and ExamInterface during a fresh attempt. The App root re-provides it
// whenever selectedPaperId or the active exam's own paperId changes, so
// components always read the live selection, never a stale value.
export const PaperContext = React.createContext(getPaper(getSelectedPaperId()));
export function usePaper(){ return React.useContext(PaperContext); }

