import {alertStorageFull} from "./storageAlerts";
import {SUBJECTS} from "./constants";
import {addMistakeRows, loadMistakes} from "./mistakes";
import {PAPER_REGISTRY, paperMissing} from "./papers";
import {loadHistory} from "./persistence";
import {isAnswerCorrect, scoreExam} from "./scoring";
import {store} from "./store";
import {loadStarQ} from "../screens/ProfileScreen";

// ---------- Practice mode: custom question sets from the whole question bank ----------
//
//  config  {pool, subjects, chapters, type, years, count, mode, timerMin}
//    pool      "all" | "new" (never answered by you) | "mistakes" (still in your Mistake Book) | "starred"
//    subjects  [] = all          chapters  ["Subject|Chapter"] = all when empty
//    type      "all" | "MCQ" | "NUM"        years  [] = all
//    mode      "learn" (check each answer straight away) | "test" (feedback only at the end)
//    timerMin  null = no timer
//  session {id, startedAt, config, keys:[paperId:n], answers:{key:{resp, secs, checked}}, pos, deadline, finished, finishedAt, rows}

export const LS_PRACTICE = "jee_cbt_practice_v1";            // per-question counters + recent sessions
export const LS_PRACTICE_ACTIVE = "jee_cbt_practice_active_v1";   // the running (or last finished) session
export const LS_PRACTICE_CFG = "jee_cbt_practice_cfg_v1";    // last filters used
export const COUNT_CHOICES = [10, 20, 30, 50];

export const DEFAULT_CONFIG = {pool:"all", subjects:[], chapters:[], type:"all", years:[], count:20, mode:"learn", timerMin:null};

const readJSON = (key, fallback) => { try{ const raw = store.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch(e){ return fallback; } };
function writeJSON(key, value, what){ try{ store.setItem(key, JSON.stringify(value)); return true; }catch(e){ alertStorageFull(what); return false; } }

// ---------- the question universe ----------
let UNIVERSE = null;
export function allQuestions(){
  if(UNIVERSE) return UNIVERSE;
  const out = [];
  PAPER_REGISTRY.forEach(p => {
    const m = /^jee-(\d{4})-/.exec(p.id); const year = m ? Number(m[1]) : 0;
    p.questions.forEach(q => {
      if(q.bonus === true) return;      // a dropped question has no real answer to practise
      out.push({key:`${p.id}:${q.n}`, paperId:p.id, n:q.n, subject:q.subject, chapter:q.chapter, type:q.type, year});
    });
  });
  UNIVERSE = out;
  return out;
}
export function questionByKey(key){
  const i = key.lastIndexOf(":"); const paperId = key.slice(0, i), n = Number(key.slice(i + 1));
  if(paperMissing(paperId)) return null;
  const paper = PAPER_REGISTRY.find(p => p.id === paperId);
  const q = paper && paper.questions.find(x => x.n === n);
  return q ? {q, paper, paperId, n} : null;
}
export const chapterKey = (subject, chapter) => `${subject}|${chapter}`;
export function universeFacets(){
  const years = [...new Set(allQuestions().map(x => x.year))].filter(Boolean).sort((a, b) => b - a);
  const chapters = {};     // subject -> {chapter: count}
  SUBJECTS.forEach(s => { chapters[s] = {}; });
  allQuestions().forEach(x => { const c = chapters[x.subject] || (chapters[x.subject] = {}); c[x.chapter] = (c[x.chapter] || 0) + 1; });
  return {years, chapters};
}

// ---------- what you have already done: from finished tests and from practice ----------
export function practiceLog(){
  const o = readJSON(LS_PRACTICE, null);
  return (o && typeof o==="object") ? {q:o.q || {}, sessions:Array.isArray(o.sessions) ? o.sessions : []} : {q:{}, sessions:[]};
}
// {seen: Set(key), byChapter: Map("Subject|Chapter" -> {att, cor})}
export function attemptStats(){
  const seen = new Set(); const byChapter = new Map();
  const bump = (subject, chapter, att, cor) => {
    const k = chapterKey(subject, chapter); const e = byChapter.get(k) || {att:0, cor:0};
    e.att += att; e.cor += cor; byChapter.set(k, e);
  };
  loadHistory().forEach(h => {
    const sn = h && h.snapshot;
    if(!sn || !sn.paperId || !sn.perQ || paperMissing(sn.paperId)) return;
    let res; try{ res = scoreExam(sn); }catch(e){ return; }
    res.perQuestionResults.forEach(r => {
      if(r.result==="correct" || r.result==="wrong"){ seen.add(`${sn.paperId}:${r.n}`); bump(r.subject, r.chapter, 1, r.result==="correct" ? 1 : 0); }
    });
  });
  const byKey = new Map(allQuestions().map(x => [x.key, x]));
  const log = practiceLog();
  Object.entries(log.q).forEach(([k, v]) => {
    const x = byKey.get(k); if(!x || !v || !v.a) return;
    seen.add(k); bump(x.subject, x.chapter, v.a, v.c || 0);
  });
  return {seen, byChapter};
}
export function chapterAccuracy(stats, subject, chapter){
  const e = stats.byChapter.get(chapterKey(subject, chapter));
  return e && e.att ? {att:e.att, pct:Math.round(e.cor / e.att * 100)} : null;
}

// ---------- building a set ----------
export function poolContext(stats){
  const mistakes = new Set(Object.values(loadMistakes()).filter(i => i.status==="active").map(i => i.key));
  const starred = new Set(loadStarQ());
  return {stats: stats || attemptStats(), mistakes, starred};
}
export function buildPool(cfg, ctx){
  const subj = new Set(cfg.subjects || []), chap = new Set(cfg.chapters || []), yrs = new Set(cfg.years || []);
  return allQuestions().filter(x => {
    if(subj.size && !subj.has(x.subject)) return false;
    if(chap.size && !chap.has(chapterKey(x.subject, x.chapter))) return false;
    if(cfg.type && cfg.type!=="all" && x.type!==cfg.type) return false;
    if(yrs.size && !yrs.has(x.year)) return false;
    if(cfg.pool==="new" && ctx.stats.seen.has(x.key)) return false;
    if(cfg.pool==="mistakes" && !ctx.mistakes.has(x.key)) return false;
    if(cfg.pool==="starred" && !ctx.starred.has(x.key)) return false;
    return true;
  });
}
export function poolSizes(ctx){
  const all = allQuestions();
  return {
    all: all.length,
    new: all.filter(x => !ctx.stats.seen.has(x.key)).length,
    mistakes: all.filter(x => ctx.mistakes.has(x.key)).length,
    starred: all.filter(x => ctx.starred.has(x.key)).length,
  };
}
export function shuffled(list, rnd = Math.random){
  const a = list.slice();
  for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function createSession(cfg, pool, now = Date.now(), rnd = Math.random){
  const count = Math.max(1, Math.min(Number(cfg.count) || 20, pool.length));
  const keys = shuffled(pool, rnd).slice(0, count).map(x => x.key);
  return {
    id: now, startedAt: now, config: {...cfg, count}, keys, answers: {}, pos: 0,
    deadline: cfg.timerMin ? now + cfg.timerMin * 60000 : null, finished: false, finishedAt: null, rows: null,
  };
}

// ---------- saving ----------
export function loadConfig(){
  const c = readJSON(LS_PRACTICE_CFG, null);
  return c && typeof c==="object" ? {...DEFAULT_CONFIG, ...c} : {...DEFAULT_CONFIG};
}
export function saveConfig(cfg){ writeJSON(LS_PRACTICE_CFG, cfg, "your practice settings"); }
export function loadSession(){
  const s = readJSON(LS_PRACTICE_ACTIVE, null);
  return s && typeof s==="object" && Array.isArray(s.keys) ? s : null;
}
export function saveSession(s){ return writeJSON(LS_PRACTICE_ACTIVE, s, "your practice progress"); }
export function clearSession(){ try{ store.removeItem(LS_PRACTICE_ACTIVE); }catch(e){ /* ignore */ } }

// ---------- grading and finishing ----------
export function answeredCount(s){
  return s.keys.filter(k => { const a = s.answers[k]; return a && String(a.resp ?? "").trim() !== ""; }).length;
}
export function gradeSession(s){
  return s.keys.map(key => {
    const info = questionByKey(key); const a = s.answers[key] || {};
    if(!info) return null;
    const has = String(a.resp ?? "").trim() !== "";
    const result = !has ? "unattempted" : (isAnswerCorrect(info.q, a.resp) ? "correct" : "wrong");
    return {key, paperId:info.paperId, n:info.n, subject:info.q.subject, chapter:info.q.chapter, type:info.q.type,
      resp: has ? a.resp : null, result, secs: Math.round(a.secs || 0)};
  }).filter(Boolean);
}
export function summarise(rows){
  const correct = rows.filter(r => r.result==="correct").length, wrong = rows.filter(r => r.result==="wrong").length;
  const attempted = correct + wrong;
  const secs = rows.reduce((t, r) => t + r.secs, 0);
  const byChapter = new Map();
  rows.forEach(r => {
    const k = chapterKey(r.subject, r.chapter); const e = byChapter.get(k) || {subject:r.subject, chapter:r.chapter, n:0, cor:0, att:0};
    e.n++; if(r.result!=="unattempted") e.att++; if(r.result==="correct") e.cor++; byChapter.set(k, e);
  });
  return {
    total: rows.length, correct, wrong, skipped: rows.length - attempted, attempted,
    accuracy: attempted ? Math.round(correct / attempted * 100) : 0,
    marks: correct * 4 - wrong, maxMarks: rows.length * 4,
    secs, avgSecs: attempted ? Math.round(rows.filter(r => r.result!=="unattempted").reduce((t, r) => t + r.secs, 0) / attempted) : 0,
    chapters: [...byChapter.values()].sort((a, b) => (a.cor / Math.max(1, a.att)) - (b.cor / Math.max(1, b.att)) || b.n - a.n),
  };
}
// Ends the session once: grades it, updates your per-question counters, keeps a short history, and puts the wrong answers in the Mistake Book.
export function finishSession(s, now = Date.now()){
  if(s.finished) return s;
  const rows = gradeSession(s); const sum = summarise(rows);
  const log = practiceLog();
  rows.forEach(r => {
    if(r.result==="unattempted") return;
    const e = log.q[r.key] || {a:0, c:0, t:0}; e.a++; if(r.result==="correct") e.c++; e.t = now; log.q[r.key] = e;
  });
  log.sessions.unshift({id:s.id, at:now, n:sum.total, correct:sum.correct, wrong:sum.wrong, skipped:sum.skipped, secs:sum.secs, mode:s.config.mode, label:sessionLabel(s.config)});
  log.sessions = log.sessions.slice(0, 60);
  writeJSON(LS_PRACTICE, log, "your practice history");
  addMistakeRows(`practice:${s.id}`, rows.filter(r => r.result==="wrong"), now);
  const done = {...s, finished:true, finishedAt:now, rows};
  saveSession(done);
  return done;
}
export function sessionLabel(cfg){
  const parts = [];
  if(cfg.chapters && cfg.chapters.length) parts.push(cfg.chapters.length===1 ? cfg.chapters[0].split("|")[1] : `${cfg.chapters.length} chapters`);
  else if(cfg.subjects && cfg.subjects.length) parts.push(cfg.subjects.join(" + "));
  else parts.push("All subjects");
  if(cfg.pool==="new") parts.push("not yet attempted");
  if(cfg.pool==="mistakes") parts.push("from Mistake Book");
  if(cfg.pool==="starred") parts.push("starred");
  if(cfg.type && cfg.type!=="all") parts.push(cfg.type==="NUM" ? "numericals" : "MCQs");
  return parts.join(" · ");
}
