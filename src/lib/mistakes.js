import {useEffect, useState} from "react";
import {alertStorageFull} from "./storageAlerts";
import {store} from "./store";

// ---------- Mistake Book: every question you missed, why you missed it, and when to revise it next ----------
//
// One entry per QUESTION (paperId + question number), not per attempt: missing the same question in two different
// attempts is one entry with two "hits". Each hit remembers which attempt it came from and the cause you tagged.
//
// Revision uses a Leitner-style ladder. `box` is the number of consecutive successful reviews; after the k-th success
// the next review is INTERVAL_DAYS[k] days away. A failure sends the question back to the start (due tomorrow).
// Passing the last step means the question is "mastered" and leaves the queue (it stays in the log).
//
//   {key, paperId, n, subject, chapter, type, addedAt, misses, rule, status: "active"|"mastered",
//    hits: [{a: attemptKey, r: "wrong"|"unattempted", cause: id|null, at}],
//    box, due (local midnight, ms), reps, lapses, lastReviewed, log: [{at, ok}]}

export const LS_MISTAKES = "jee_cbt_mistakes_v1";
export const INTERVAL_DAYS = [1, 3, 7, 14, 30, 60];
const DAY = 86400000;
const MAX_HITS = 30, MAX_LOG = 40;

export const CAUSES = [
  {id:"concept",  label:"Concept gap",             short:"Concept",     color:"#c0392b", hint:"I did not understand the idea"},
  {id:"formula",  label:"Forgot formula / fact",   short:"Formula",     color:"#d9822b", hint:"I knew it once but could not recall it"},
  {id:"calc",     label:"Calculation / sign error",short:"Calculation", color:"#b8862e", hint:"Right method, slip in the arithmetic or sign"},
  {id:"misread",  label:"Misread the question",    short:"Misread",     color:"#8450c9", hint:"Missed a word, unit or condition"},
  {id:"approach", label:"Wrong approach",          short:"Approach",    color:"#3f7cc4", hint:"Picked a method that did not work"},
  {id:"time",     label:"Time pressure",           short:"Time",        color:"#5b6b7c", hint:"Rushed or ran out of time"},
  {id:"guess",    label:"Guessed",                 short:"Guess",       color:"#8a97a6", hint:"No real basis for the answer"},
];
export const CAUSE_BY_ID = Object.fromEntries(CAUSES.map(c => [c.id, c]));

// ---------- change notifications (so every open screen refreshes) ----------
const listeners = new Set();
function emit(){ listeners.forEach(f => { try{ f(); }catch(e){ /* a broken listener must not stop the others */ } }); }
export function useMistakes(){
  const [v, setV] = useState(0);
  useEffect(()=>{
    const bump = ()=>setV(x => x + 1);
    listeners.add(bump);
    const onStorage = ev => { if(!ev.key || ev.key===LS_MISTAKES) bump(); };   // another tab changed it
    window.addEventListener("storage", onStorage);
    return ()=>{ listeners.delete(bump); window.removeEventListener("storage", onStorage); };
  }, []);
  return v;
}

// ---------- storage ----------
export function loadMistakes(){
  try{
    const raw = store.getItem(LS_MISTAKES); const o = raw ? JSON.parse(raw) : {};
    return (o && typeof o==="object" && !Array.isArray(o)) ? o : {};
  }catch(e){ return {}; }
}
function save(all){
  try{ store.setItem(LS_MISTAKES, JSON.stringify(all)); emit(); return true; }
  catch(e){ alertStorageFull("this change to your Mistake Book"); return false; }
}

// ---------- keys and dates ----------
export function mistakeKey(paperId, n){ return `${paperId}:${n}`; }
export function attemptKeyOf(state){ return `${state.paperId}:${state.startedAt}`; }
export function startOfDay(ts){ const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function daysUntil(ts, now = Date.now()){ return Math.round((startOfDay(ts) - startOfDay(now)) / DAY); }
export function fmtShortDate(ts){ return new Date(ts).toLocaleDateString(undefined, {day:"numeric", month:"short"}); }
export function dueLabel(it, now = Date.now()){
  if(it.status==="mastered") return "Mastered";
  const d = daysUntil(it.due, now);
  if(d < 0) return `Overdue by ${-d} day${d===-1 ? "" : "s"}`;
  if(d === 0) return "Due today";
  if(d === 1) return "Tomorrow";
  return `In ${d} days (${fmtShortDate(it.due)})`;
}
export function latestHit(it){ return it.hits && it.hits.length ? it.hits[it.hits.length - 1] : null; }
export function latestCause(it){ const h = latestHit(it); return h ? h.cause : null; }

// ---------- adding and editing ----------
// rows = entries of result.perQuestionResults. Only wrong / unattempted ones are logged.
// A question already in the book gets a new hit (once per attempt) and goes back to the start of the ladder.
export function addMistakes(state, rows, now = Date.now()){
  const all = loadMistakes(); const ak = attemptKeyOf(state);
  const tomorrow = startOfDay(now) + DAY;
  let added = 0, updated = 0;
  for(const r of rows){
    if(!r || (r.result!=="wrong" && r.result!=="unattempted")) continue;
    const k = mistakeKey(state.paperId, r.n);
    let it = all[k]; const isNew = !it;
    if(isNew){
      it = all[k] = {key:k, paperId:state.paperId, n:r.n, subject:r.subject, chapter:r.chapter, type:r.type, addedAt:now,
        misses:0, hits:[], rule:"", status:"active", box:0, due:tomorrow, reps:0, lapses:0, lastReviewed:null, log:[]};
    }
    const same = it.hits.find(h => h.a===ak);
    if(same){ same.r = r.result; continue; }
    it.hits.push({a:ak, r:r.result, cause:null, at:now}); it.misses++;
    if(it.hits.length > MAX_HITS) it.hits.shift();
    if(isNew) added++;
    else {
      updated++;
      if(it.status==="mastered"){ it.status = "active"; it.lapses++; it.box = 0; it.due = tomorrow; }
      else { it.box = 0; it.due = Math.min(it.due, tomorrow); }
    }
  }
  if(added || updated){ if(!save(all)) return {added:0, updated:0}; }
  return {added, updated};
}
export function setCause(key, attemptKey, cause){
  const all = loadMistakes(); const it = all[key]; if(!it) return false;
  const h = attemptKey ? it.hits.find(x => x.a===attemptKey) : latestHit(it);
  if(!h) return false;
  h.cause = cause || null;
  return save(all);
}
export function setRule(key, text){
  const all = loadMistakes(); const it = all[key]; if(!it) return false;
  it.rule = String(text || "").slice(0, 300);
  return save(all);
}
export function setStatus(key, status, now = Date.now()){
  const all = loadMistakes(); const it = all[key]; if(!it) return false;
  if(status==="mastered") it.status = "mastered";
  else { it.status = "active"; it.box = 0; it.due = startOfDay(now) + DAY; }
  return save(all);
}
export function removeMistakes(keys){
  const all = loadMistakes(); let n = 0;
  keys.forEach(k => { if(all[k]){ delete all[k]; n++; } });
  return n ? save(all) : true;
}

// ---------- the revision queue ----------
export function dueItems(now = Date.now()){
  return Object.values(loadMistakes())
    .filter(it => it.status==="active" && it.due <= now)
    .sort((a, b) => a.due - b.due || a.box - b.box || a.n - b.n);
}
export function dueCount(now = Date.now()){ return dueItems(now).length; }
export function upcomingItems(now = Date.now()){
  return Object.values(loadMistakes()).filter(it => it.status==="active" && it.due > now).sort((a, b) => a.due - b.due);
}

// Records the outcome of one revision answer and moves the question along the ladder.
// Practising a question BEFORE it is due never advances it (that would defeat the spacing); a failure always resets it.
export function recordReview(key, ok, now = Date.now()){
  const all = loadMistakes(); const it = all[key]; if(!it) return null;
  const early = it.status==="active" && it.due > now;
  it.log.push({at:now, ok:!!ok}); if(it.log.length > MAX_LOG) it.log.shift();
  it.lastReviewed = now; it.reps++;
  let nextDays = null, mastered = false;
  if(ok){
    if(early){ nextDays = daysUntil(it.due, now); }
    else {
      it.box++;
      if(it.box >= INTERVAL_DAYS.length){ it.status = "mastered"; mastered = true; }
      else { nextDays = INTERVAL_DAYS[it.box]; it.due = startOfDay(now) + nextDays * DAY; }
    }
  } else {
    it.box = 0; it.lapses++; nextDays = INTERVAL_DAYS[0]; it.due = startOfDay(now) + DAY;
  }
  save(all);
  return {nextDays, mastered, early, box:it.box};
}

// ---------- summaries for the screens ----------
export function bookSummary(now = Date.now()){
  const items = Object.values(loadMistakes());
  const active = items.filter(it => it.status==="active");
  const due = active.filter(it => it.due <= now).length;
  const week = active.filter(it => it.due > now && daysUntil(it.due, now) <= 7).length;
  const next = active.filter(it => it.due > now).sort((a, b) => a.due - b.due)[0];
  return {total:items.length, active:active.length, mastered:items.length - active.length, due, week, nextDue: next ? next.due : null};
}
// how many questions fall due on each of the next `n` days (index 0 = tomorrow)
export function upcomingByDay(n = 7, now = Date.now()){
  const out = Array(n).fill(0);
  upcomingItems(now).forEach(it => { const d = daysUntil(it.due, now); if(d >= 1 && d <= n) out[d - 1]++; });
  return out;
}
export function causeCounts(items){
  const c = {untagged:0}; CAUSES.forEach(x => { c[x.id] = 0; });
  items.forEach(it => it.hits.forEach(h => { if(h.cause && c[h.cause]!==undefined) c[h.cause]++; else c.untagged++; }));
  return c;
}
// one row per attempt that contributed hits: {a, at, total, causes, untagged}, newest first
export function attemptRows(items){
  const m = new Map();
  items.forEach(it => it.hits.forEach(h => {
    let r = m.get(h.a); if(!r){ r = {a:h.a, at:h.at, total:0, causes:{}, untagged:0}; m.set(h.a, r); }
    r.total++; r.at = Math.max(r.at, h.at);
    if(h.cause) r.causes[h.cause] = (r.causes[h.cause] || 0) + 1; else r.untagged++;
  }));
  return [...m.values()].sort((a, b) => b.at - a.at);
}
// Cause tags for one attempt, used by the AI export: {questionNumber: "Concept gap"}
export function causeLabelsForAttempt(state){
  const out = {}; const ak = attemptKeyOf(state);
  Object.values(loadMistakes()).forEach(it => {
    if(it.paperId !== state.paperId) return;
    const h = it.hits.find(x => x.a===ak);
    if(h && h.cause && CAUSE_BY_ID[h.cause]) out[it.n] = CAUSE_BY_ID[h.cause].label + (it.rule ? ` (rule: ${it.rule})` : "");
  });
  return out;
}
