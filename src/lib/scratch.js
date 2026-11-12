import {store} from "./store";

// Rough work during a mock test: per question, a drawing (PNG data URL) and/or typed text, kept for the running exam only.
// Saved on change (not every second like the exam clock), so it does not bloat autosave.
export const LS_SCRATCH = "jee_cbt_scratch_v1";
function read(){ try{ return JSON.parse(store.getItem(LS_SCRATCH) || "null"); }catch(e){ return null; } }
export function loadScratchItem(examId, n){
  const s = read();
  return s && s.id===examId && s.items && s.items[n] ? s.items[n] : {};
}
export function saveScratchItem(examId, n, patch){
  const s = read(); const cur = s && s.id===examId ? s : {id:examId, items:{}};
  const item = {...(cur.items[n] || {}), ...patch};
  if(!item.img && !(item.text && item.text.trim())) delete cur.items[n]; else cur.items[n] = item;
  try{ store.setItem(LS_SCRATCH, JSON.stringify(cur)); return true; }catch(e){ return false; }
}
export function clearScratch(){ try{ store.removeItem(LS_SCRATCH); }catch(e){ /* ignore */ } }

// Small exam-screen preferences (kept between tests)
export const LS_EXAM_PREFS = "jee_cbt_examprefs_v1";
export function loadExamPrefs(){
  try{ const o = JSON.parse(store.getItem(LS_EXAM_PREFS) || "{}"); return {paceHints: o.paceHints!==false}; }catch(e){ return {paceHints:true}; }
}
export function saveExamPrefs(p){ try{ store.setItem(LS_EXAM_PREFS, JSON.stringify(p)); }catch(e){ /* ignore */ } }
