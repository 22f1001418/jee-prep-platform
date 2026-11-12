import {loadMistakes} from "./mistakes";
import {loadHistory} from "./persistence";
import {practiceLog} from "./practice";
import {store} from "./store";

// ---------- Study activity: which days you did something (a test, a practice set, a revision answer) ----------
const DAY = 86400000;
export const dayNumber = ts => { const d = new Date(ts); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY + 0.5); };

export function activityDays(){
  const days = new Set();
  loadHistory().forEach(h => { const t = h && h.snapshot && h.snapshot.startedAt; if(t) days.add(dayNumber(t)); });
  practiceLog().sessions.forEach(s => { if(s.at) days.add(dayNumber(s.at)); });
  Object.values(loadMistakes()).forEach(it => (it.log || []).forEach(l => { if(l.at) days.add(dayNumber(l.at)); }));
  return days;
}
// Current streak: consecutive active days ending today, or ending yesterday if today has no activity yet (the streak is still alive).
export function currentStreak(days, now = Date.now()){
  const today = dayNumber(now);
  let d = days.has(today) ? today : today - 1;
  let n = 0;
  while(days.has(d)){ n++; d--; }
  return {streak:n, doneToday: days.has(today)};
}
// Last 7 days, oldest first: [{label, active, today}]
export function weekStrip(days, now = Date.now()){
  const today = dayNumber(now);
  return Array.from({length:7}, (_, i) => {
    const d = today - 6 + i; const date = new Date(now - (6 - i) * DAY);
    return {label: date.toLocaleDateString(undefined, {weekday:"narrow"}), active: days.has(d), today: d===today};
  });
}
export function greeting(now = Date.now()){
  const h = new Date(now).getHours();
  return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// ---------- Daily goal, longest streak, today's questions, milestones ----------
const LS_DAILY = "jee_cbt_dailygoal_v1";
export const GOAL_STEPS = [10, 20, 30, 50];
export function loadDailyGoal(){
  try{ const o = JSON.parse(store.getItem(LS_DAILY) || "null"); return o && GOAL_STEPS.includes(o.n) ? o.n : 20; }catch(e){ return 20; }
}
export function saveDailyGoal(n){ try{ store.setItem(LS_DAILY, JSON.stringify({n})); }catch(e){ /* ignore */ } }

// Questions you actually answered today: in tests, in practice sets, and in revision.
export function questionsToday(now = Date.now()){
  const today = dayNumber(now); let n = 0;
  loadHistory().forEach(h => {
    const sn = h && h.snapshot; if(!sn || !sn.startedAt || dayNumber(sn.startedAt) !== today || !sn.perQ) return;
    n += Object.values(sn.perQ).filter(r => r && (r.status === "answered" || r.status === "answered_marked")).length;
  });
  practiceLog().sessions.forEach(s => { if(s.at && dayNumber(s.at) === today) n += (s.correct || 0) + (s.wrong || 0); });
  Object.values(loadMistakes()).forEach(it => (it.log || []).forEach(l => { if(l.at && dayNumber(l.at) === today) n++; }));
  return n;
}
export function longestStreak(days){
  const sorted = [...days].sort((a, b) => a - b); let best = 0, run = 0, prev = null;
  sorted.forEach(d => { run = prev !== null && d === prev + 1 ? run + 1 : 1; if(run > best) best = run; prev = d; });
  return best;
}
// Things to aim for. Computed from what you have already done; nothing extra is stored.
export function milestones(days){
  const history = loadHistory(), log = practiceLog(), book = Object.values(loadMistakes());
  const tests = history.length;
  const practiced = Object.values(log.q).reduce((s, v) => s + (v && v.a || 0), 0);
  const revised = book.reduce((s, it) => s + (it.log ? it.log.length : 0), 0);
  const mastered = book.filter(it => it.status === "mastered").length;
  const best = history.reduce((m, h) => Math.max(m, h.score || 0), 0);
  const streak = longestStreak(days);
  const rows = [
    {id:"t1", icon:"tests", title:"First mock test", value:tests, target:1},
    {id:"t5", icon:"layers", title:"Five mock tests", value:tests, target:5},
    {id:"s3", icon:"flame", title:"3-day streak", value:streak, target:3},
    {id:"s7", icon:"bolt", title:"7-day streak", value:streak, target:7},
    {id:"p100", icon:"practice", title:"100 practice questions", value:practiced, target:100},
    {id:"r25", icon:"mistakes", title:"25 revision answers", value:revised, target:25},
    {id:"m1", icon:"shield-check", title:"First question mastered", value:mastered, target:1},
    {id:"b150", icon:"trophy", title:"Score 150+ in a mock", value:best, target:150},
  ];
  return rows.map(r => ({...r, value: Math.min(r.value, r.target), done: r.value >= r.target}));
}

// What has been done today, for the daily plan
export function activityToday(now = Date.now()){
  const today = dayNumber(now);
  const tests = loadHistory().filter(h => h && h.snapshot && h.snapshot.startedAt && dayNumber(h.snapshot.startedAt) === today).length;
  const practice = practiceLog().sessions.filter(s => s.at && dayNumber(s.at) === today).length;
  let revisions = 0;
  Object.values(loadMistakes()).forEach(it => (it.log || []).forEach(l => { if(l.at && dayNumber(l.at) === today) revisions++; }));
  return {tests, practice, revisions};
}
