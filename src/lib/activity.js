import {loadMistakes} from "./mistakes";
import {loadHistory} from "./persistence";
import {practiceLog} from "./practice";

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
